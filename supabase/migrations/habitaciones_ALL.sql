-- =====================================================================================
-- Habitaciones (VendoYa): TODO en un solo archivo, en orden: 001 (base) + 002 (candidatos) + 003 (cierre).
-- Pega este archivo ENTERO en el SQL Editor de Supabase y ejecútalo UNA vez (también es re-ejecutable).
-- Validado contra Supabase local (supabase start): 113 pruebas SQL de RLS y 11 de supabaseRepo, todas OK.
-- Al final hay un insert comentado para hacerte administrador de plataforma (sustituye TU_USER_ID).
-- =====================================================================================

-- =====================================================================================
-- Módulo Habitaciones (VendoYa) - migración 001
-- NO está aplicada. Revísala y ejecútala tú en el editor SQL de Supabase (una sola vez).
-- Solo crea objetos con prefijo hab_ (y políticas sobre storage.objects limitadas a los
-- buckets hab-photos / hab-docs). No toca ninguna tabla existente de VendoYa.
-- Requisito Auth: activa "Confirm email" (las invitaciones comprueban el correo confirmado).
-- =====================================================================================
begin;

create extension if not exists pgcrypto with schema extensions;

-- ---------- Tipos ----------
do $$ begin create type hab_org_kind as enum ('owner','agency','subtenant'); exception when duplicate_object then null; end $$;
do $$ begin create type hab_member_role as enum ('viewer','manager','admin'); exception when duplicate_object then null; end $$;
do $$ begin create type hab_access_kind as enum ('view','sublet','manage'); exception when duplicate_object then null; end $$;
do $$ begin create type hab_access_status as enum ('pending','granted','revoked'); exception when duplicate_object then null; end $$;
do $$ begin create type hab_room_status as enum ('free','occupied','reserved','maintenance'); exception when duplicate_object then null; end $$;
do $$ begin create type hab_contract_status as enum ('draft','pending_signature','active','ended'); exception when duplicate_object then null; end $$;
do $$ begin create type hab_condition as enum ('ok','worn','damaged'); exception when duplicate_object then null; end $$;
do $$ begin create type hab_payment_status as enum ('pending','paid','late'); exception when duplicate_object then null; end $$;
do $$ begin create type hab_severity as enum ('low','medium','high'); exception when duplicate_object then null; end $$;
do $$ begin create type hab_incident_status as enum ('open','seen','in_progress','resolved'); exception when duplicate_object then null; end $$;
do $$ begin create type hab_split_rule as enum ('equal','by_m2','by_rent'); exception when duplicate_object then null; end $$;
do $$ begin create type hab_ticket_status as enum ('open','answered','closed'); exception when duplicate_object then null; end $$;

-- ---------- Tablas ----------
create table if not exists hab_orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  kind hab_org_kind not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists hab_members (
  org_id uuid not null references hab_orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role hab_member_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index if not exists hab_members_user_idx on hab_members(user_id);

create table if not exists hab_properties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references hab_orgs(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  address text not null check (char_length(address) <= 200),
  city text not null, province text not null, community text not null,
  tensioned_zone boolean not null default false,
  whole_flat_rent_cents integer check (whole_flat_rent_cents is null or whole_flat_rent_cents >= 0),
  rules jsonb not null default '[]'::jsonb,
  notes text not null default '' check (char_length(notes) <= 1000),
  created_at timestamptz not null default now()
);
create index if not exists hab_properties_org_idx on hab_properties(org_id);

create table if not exists hab_property_access (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references hab_properties(id) on delete cascade,
  grantee_org_id uuid not null references hab_orgs(id) on delete cascade,
  kind hab_access_kind not null,
  consent_doc_path text,
  max_total_rent_cents integer check (max_total_rent_cents is null or max_total_rent_cents > 0),
  status hab_access_status not null default 'granted',
  valid_until date,
  granted_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  -- Subarriendo concedido solo con documento de consentimiento y tope de renta.
  constraint hab_access_sublet_needs_doc check (kind <> 'sublet' or status <> 'granted' or (consent_doc_path is not null and max_total_rent_cents is not null))
);
create index if not exists hab_access_property_idx on hab_property_access(property_id);
create index if not exists hab_access_grantee_idx on hab_property_access(grantee_org_id, status);

create table if not exists hab_rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references hab_properties(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  size_m2 numeric(5,1) not null check (size_m2 > 0 and size_m2 <= 200),
  rent_cents integer not null check (rent_cents >= 0),
  deposit_cents integer not null default 0 check (deposit_cents >= 0),
  includes jsonb not null default '{}'::jsonb,
  status hab_room_status not null default 'free',
  created_at timestamptz not null default now()
);
create index if not exists hab_rooms_property_idx on hab_rooms(property_id);

-- Sin sexo ni nacionalidad: no se recogen ni se filtran.
create table if not exists hab_tenants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references hab_orgs(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 120),
  email text not null check (char_length(email) <= 160),
  phone text not null default '' check (char_length(phone) <= 30),
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists hab_tenants_org_idx on hab_tenants(org_id);
create index if not exists hab_tenants_user_idx on hab_tenants(user_id);

create table if not exists hab_clause_catalog (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  category text not null,
  title text not null,
  body text not null,
  community text,
  reviewed_by_lawyer boolean not null default false
);

create table if not exists hab_contracts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references hab_orgs(id) on delete cascade,
  room_id uuid not null references hab_rooms(id) on delete cascade,
  tenant_id uuid not null references hab_tenants(id),
  starts_on date not null,
  ends_on date not null,
  rent_cents integer not null check (rent_cents > 0),
  deposit_cents integer not null default 0 check (deposit_cents >= 0),
  clauses jsonb not null default '[]'::jsonb,
  status hab_contract_status not null default 'draft',
  signed_at timestamptz,
  signed_pdf_path text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  check (ends_on > starts_on)
);
create index if not exists hab_contracts_room_idx on hab_contracts(room_id);
create index if not exists hab_contracts_tenant_idx on hab_contracts(tenant_id);
create index if not exists hab_contracts_org_idx on hab_contracts(org_id);

create table if not exists hab_inventories (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references hab_rooms(id) on delete cascade,
  contract_id uuid references hab_contracts(id) on delete set null,
  kind text not null check (kind in ('entry','exit')),
  taken_at date not null default current_date,
  notes text not null default ''
);
create index if not exists hab_inventories_room_idx on hab_inventories(room_id);

create table if not exists hab_inventory_items (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references hab_inventories(id) on delete cascade,
  item text not null check (char_length(item) between 1 and 120),
  condition hab_condition not null default 'ok',
  note text not null default '',
  photo_paths text[] not null default '{}' check (cardinality(photo_paths) <= 10)
);
create index if not exists hab_items_inventory_idx on hab_inventory_items(inventory_id);
create index if not exists hab_items_photos_gin on hab_inventory_items using gin (photo_paths);

create table if not exists hab_payments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references hab_contracts(id) on delete cascade,
  due_on date not null,
  amount_cents integer not null check (amount_cents >= 0),
  paid_on date,
  status hab_payment_status not null default 'pending',
  method text
);
create index if not exists hab_payments_contract_idx on hab_payments(contract_id, due_on);

create table if not exists hab_utilities (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references hab_properties(id) on delete cascade,
  kind text not null, period text not null check (period ~ '^\d{4}-\d{2}$'),
  total_cents integer not null check (total_cents > 0),
  split_rule hab_split_rule not null default 'equal',
  invoice_path text
);
create index if not exists hab_utilities_property_idx on hab_utilities(property_id);

create table if not exists hab_utility_shares (
  utility_id uuid not null references hab_utilities(id) on delete cascade,
  room_id uuid not null references hab_rooms(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  primary key (utility_id, room_id)
);

create table if not exists hab_incidents (
  id uuid primary key default gen_random_uuid(),
  number bigint generated by default as identity,
  code text generated always as ('INC-' || (1000 + number)::text) stored,
  org_id uuid not null references hab_orgs(id) on delete cascade, -- registro PRIVADO de esta org
  property_id uuid not null references hab_properties(id) on delete cascade,
  room_id uuid references hab_rooms(id) on delete set null,
  reported_by uuid references auth.users(id) on delete set null,
  tenant_id uuid references hab_tenants(id) on delete set null,
  link_id uuid, -- enlace de inquilino que lo creó (sin login)
  category text check (category in ('Avería','Queja','Sugerencia','Otro')),
  title text not null check (char_length(title) between 1 and 140),
  description text not null default '' check (char_length(description) <= 2000),
  severity hab_severity not null default 'medium',
  status hab_incident_status not null default 'open',
  photo_paths text[] not null default '{}' check (cardinality(photo_paths) <= 10),
  tenant_statement text not null default '' check (char_length(tenant_statement) <= 2000),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists hab_incidents_org_idx on hab_incidents(org_id, created_at desc);
create index if not exists hab_incidents_property_idx on hab_incidents(property_id);
create index if not exists hab_incidents_link_idx on hab_incidents(link_id, created_at);
create index if not exists hab_incidents_photos_gin on hab_incidents using gin (photo_paths);

create table if not exists hab_incident_events (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references hab_incidents(id) on delete cascade,
  actor uuid references auth.users(id) on delete set null,
  kind text not null, note text not null default '' check (char_length(note) <= 1000),
  internal boolean not null default false, -- true = el inquilino no lo ve
  created_at timestamptz not null default now()
);
create index if not exists hab_events_incident_idx on hab_incident_events(incident_id, created_at);

create table if not exists hab_alerts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references hab_orgs(id) on delete cascade,
  kind text not null, due_on date not null, ref_table text not null, ref_id text not null,
  key text not null, done boolean not null default false,
  unique (org_id, key)
);

create table if not exists hab_audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references hab_orgs(id) on delete cascade,
  actor uuid not null, action text not null, ref text,
  created_at timestamptz not null default now()
);
create index if not exists hab_audit_org_idx on hab_audit_log(org_id, created_at desc);

create table if not exists hab_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references hab_orgs(id) on delete cascade,
  email text not null, role text not null check (role in ('admin','manager','viewer','tenant')),
  contract_id uuid references hab_contracts(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null, used_at timestamptz
);

-- Soporte de la plataforma (canal A) --------------------------------------------------
create table if not exists hab_support_tickets (
  id uuid primary key default gen_random_uuid(),
  number bigint generated by default as identity,
  org_id uuid references hab_orgs(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  category text not null check (category in ('Contratos','Cobros','Incidencias','Cuenta','Otro')),
  subject text not null check (char_length(subject) between 1 and 140),
  body text not null check (char_length(body) between 1 and 3000),
  status hab_ticket_status not null default 'open',
  attachment_paths text[] not null default '{}' check (cardinality(attachment_paths) <= 5),
  contact_phone text check (contact_phone is null or contact_phone ~ '^\+[1-9]\d{7,14}$'), -- opcional
  whatsapp_clicked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists hab_tickets_org_idx on hab_support_tickets(org_id, created_at desc);
create table if not exists hab_support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references hab_support_tickets(id) on delete cascade,
  author uuid references auth.users(id) on delete set null,
  author_kind text not null default 'user' check (author_kind in ('user','platform','auto')),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists hab_messages_ticket_idx on hab_support_messages(ticket_id, created_at);

create table if not exists hab_sale_interests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references hab_orgs(id) on delete cascade,
  property_id uuid not null references hab_properties(id) on delete cascade,
  desired_price_cents bigint check (desired_price_cents is null or desired_price_cents >= 0),
  timeline text not null check (timeline in ('now','3m','6m','nohurry')),
  has_tenants boolean not null default false, tenants_end_on date,
  notes text not null default '' check (char_length(notes) <= 1000),
  status text not null default 'new' check (status in ('new','contacted','closed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists hab_sale_org_idx on hab_sale_interests(org_id, created_at desc);

create table if not exists hab_platform_admins (user_id uuid primary key references auth.users(id) on delete cascade);

-- Canal de inquilinos (canal B): ajustes de la org y enlaces personales sin login --------
create table if not exists hab_org_settings (
  org_id uuid primary key references hab_orgs(id) on delete cascade,
  whatsapp_e164 text check (whatsapp_e164 is null or whatsapp_e164 ~ '^\+[1-9]\d{7,14}$'),
  templates jsonb not null default '{}'::jsonb,
  auto_reply text not null default '' check (char_length(auto_reply) <= 500)
);
create table if not exists hab_tenant_links (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references hab_orgs(id) on delete cascade,
  tenant_id uuid not null references hab_tenants(id) on delete cascade,
  contract_id uuid not null references hab_contracts(id) on delete cascade,
  room_id uuid not null references hab_rooms(id) on delete cascade,
  token_hash text not null unique, -- solo el hash; el token (32 bytes) se muestra una vez
  expires_at timestamptz not null, revoked_at timestamptz, last_used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists hab_links_contract_idx on hab_tenant_links(contract_id);

-- ---------- Funciones auxiliares (security definer, search_path fijo) ----------
create or replace function hab_role_rank(r hab_member_role) returns int language sql immutable
set search_path = public, pg_temp as $$ select case r when 'viewer' then 1 when 'manager' then 2 else 3 end $$;

create or replace function hab_access_rank(k hab_access_kind) returns int language sql immutable
set search_path = public, pg_temp as $$ select case k when 'view' then 1 when 'sublet' then 2 else 3 end $$;

create or replace function hab_is_member(p_org uuid, p_min hab_member_role default 'viewer') returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from hab_members m where m.org_id = p_org and m.user_id = auth.uid()
                 and hab_role_rank(m.role) >= hab_role_rank(p_min));
$$;

create or replace function hab_is_platform_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from hab_platform_admins a where a.user_id = auth.uid());
$$;

-- Niveles: view < sublet (operar habitaciones/contratos) < manage (gestionar el piso).
-- Dueño: miembro viewer = ver; manager/admin = todo. Concesión: solo si granted y no caducada.
create or replace function hab_can_access_property(p_property uuid, p_min hab_access_kind default 'view') returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from hab_properties p
    where p.id = p_property
      and hab_is_member(p.org_id, case when hab_access_rank(p_min) <= 1 then 'viewer'::hab_member_role else 'manager'::hab_member_role end)
  ) or exists (
    select 1 from hab_property_access a
    where a.property_id = p_property and a.status = 'granted'
      and (a.valid_until is null or a.valid_until >= current_date)
      and hab_access_rank(a.kind) >= hab_access_rank(p_min)
      and hab_is_member(a.grantee_org_id, case when hab_access_rank(p_min) <= 1 then 'viewer'::hab_member_role else 'manager'::hab_member_role end)
  );
$$;

create or replace function hab_can_access_room(p_room uuid, p_min hab_access_kind default 'view') returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from hab_rooms r where r.id = p_room and hab_can_access_property(r.property_id, p_min));
$$;

create or replace function hab_can_access_contract(p_contract uuid, p_min hab_access_kind default 'view') returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from hab_contracts c where c.id = p_contract and hab_can_access_room(c.room_id, p_min));
$$;

create or replace function hab_can_access_inventory(p_inv uuid, p_min hab_access_kind default 'view') returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from hab_inventories i where i.id = p_inv and hab_can_access_room(i.room_id, p_min));
$$;

create or replace function hab_can_access_utility(p_util uuid, p_min hab_access_kind default 'view') returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from hab_utilities u where u.id = p_util and hab_can_access_property(u.property_id, p_min));
$$;

create or replace function hab_my_tenant_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select t.id from hab_tenants t where t.user_id = auth.uid();
$$;

create or replace function hab_is_my_contract(p_contract uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from hab_contracts c where c.id = p_contract and c.tenant_id in (select hab_my_tenant_ids()));
$$;

create or replace function hab_tenant_sees_room(p_room uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from hab_contracts c where c.room_id = p_room and c.tenant_id in (select hab_my_tenant_ids()));
$$;

create or replace function hab_tenant_sees_inventory(p_inv uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from hab_inventories i join hab_contracts c on c.id = i.contract_id
                 where i.id = p_inv and c.tenant_id in (select hab_my_tenant_ids()));
$$;

create or replace function hab_tenant_in_org(p_org uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select p_org is not null and exists (select 1 from hab_contracts c where c.org_id = p_org and c.tenant_id in (select hab_my_tenant_ids()));
$$;

-- El inquilino (con cuenta) solo puede abrir incidencias de su propia habitación y de la org de su contrato.
create or replace function hab_tenant_room_ok(p_room uuid, p_property uuid, p_org uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from hab_contracts c join hab_rooms r on r.id = c.room_id
                 where c.room_id = p_room and r.property_id = p_property and c.org_id = p_org and c.status = 'active'
                   and c.tenant_id in (select hab_my_tenant_ids()));
$$;

create or replace function hab_room_in_property(p_room uuid, p_property uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select p_room is null or exists (select 1 from hab_rooms r where r.id = p_room and r.property_id = p_property);
$$;

-- Incidencias: privadas de la org creadora (y solo mientras tenga acceso al piso); el inquilino ve las suyas.
create or replace function hab_can_see_incident(p_incident uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from hab_incidents i where i.id = p_incident and (
    (hab_is_member(i.org_id) and hab_can_access_property(i.property_id, 'view'))
    or i.tenant_id in (select hab_my_tenant_ids()) or i.reported_by = auth.uid()));
$$;

create or replace function hab_can_write_incident(p_incident uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from hab_incidents i where i.id = p_incident
    and hab_is_member(i.org_id, 'manager') and hab_can_access_property(i.property_id, 'view'));
$$;

create or replace function hab_org_from_path(p_name text) returns uuid
language sql immutable set search_path = public, pg_temp as $$
  select case when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then split_part(p_name, '/', 1)::uuid end;
$$;

-- Lectura de un fichero de storage por quien tiene acceso al registro que lo referencia
-- (dueño, gestor, inquilino, admin de plataforma). Los GIN de photo_paths aceleran la búsqueda.
create or replace function hab_can_read_path(p_name text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from hab_inventory_items ii where p_name = any (ii.photo_paths)
                 and (hab_can_access_inventory(ii.inventory_id, 'view') or hab_tenant_sees_inventory(ii.inventory_id)))
      or exists (select 1 from hab_incidents i where p_name = any (i.photo_paths) and hab_can_see_incident(i.id))
      or exists (select 1 from hab_utilities u where u.invoice_path = p_name and hab_can_access_property(u.property_id, 'view'))
      or exists (select 1 from hab_contracts c where c.signed_pdf_path = p_name and (hab_can_access_room(c.room_id, 'view') or hab_is_my_contract(c.id)))
      or exists (select 1 from hab_property_access a where a.consent_doc_path = p_name
                 and (hab_is_member(a.grantee_org_id) or hab_can_access_property(a.property_id, 'manage')))
      or exists (select 1 from hab_support_tickets t where p_name = any (t.attachment_paths)
                 and (hab_is_platform_admin() or hab_is_member(t.org_id) or t.created_by = auth.uid()));
$$;

-- Tope de renta (AVISO, no bloqueo): suma de habitaciones <= renta del piso entero y <= tope de concesiones sublet vigentes.
create or replace function hab_rent_cap_ok(p_property uuid) returns boolean
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare total bigint; cap bigint;
begin
  if not hab_can_access_property(p_property, 'view') then return null; end if;
  select coalesce(sum(rent_cents), 0) into total from hab_rooms where property_id = p_property;
  select min(c) into cap from (
    select whole_flat_rent_cents as c from hab_properties where id = p_property and whole_flat_rent_cents > 0
    union all
    select max_total_rent_cents from hab_property_access
      where property_id = p_property and kind = 'sublet' and status = 'granted' and max_total_rent_cents > 0
        and (valid_until is null or valid_until >= current_date)
  ) x;
  return cap is null or total <= cap;
end $$;

-- Datos mínimos del piso para el inquilino con cuenta (sin notas internas).
create or replace function hab_my_tenant_property()
returns table (id uuid, org_id uuid, name text, address text, city text, province text, community text, tensioned_zone boolean, whole_flat_rent_cents integer, rules jsonb, notes text)
language sql stable security definer set search_path = public, pg_temp as $$
  select p.id, p.org_id, p.name, p.address, p.city, p.province, p.community, false, null::integer, p.rules, ''::text
  from hab_properties p join hab_rooms r on r.property_id = p.id
  where hab_tenant_sees_room(r.id);
$$;

-- ---------- Triggers de integridad ----------
create or replace function hab_lock_org_id() returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if new.org_id is distinct from old.org_id then raise exception 'org_id no se puede cambiar'; end if;
  return new;
end $$;
do $$ declare t text; begin
  foreach t in array array['hab_properties','hab_tenants','hab_contracts','hab_incidents','hab_support_tickets'] loop
    execute format('drop trigger if exists hab_lock_org on %I', t);
    execute format('create trigger hab_lock_org before update on %I for each row execute function hab_lock_org_id()', t);
  end loop;
end $$;

create or replace function hab_lock_access() returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if new.property_id is distinct from old.property_id or new.grantee_org_id is distinct from old.grantee_org_id or new.kind is distinct from old.kind then
    raise exception 'La concesión solo puede cambiar de estado, caducidad o tope; crea otra para cambiar piso, organización o tipo';
  end if;
  return new;
end $$;
drop trigger if exists hab_lock_access on hab_property_access;
create trigger hab_lock_access before update on hab_property_access for each row execute function hab_lock_access();

-- El vínculo inquilino-usuario solo lo cambia hab_accept_invite (marca hab.allow_link en la transacción).
create or replace function hab_lock_tenant_user() returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' and new.user_id is not null then raise exception 'user_id solo se vincula con una invitación'; end if;
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id and coalesce(current_setting('hab.allow_link', true), '') <> 'on' then
    raise exception 'user_id solo se vincula con una invitación';
  end if;
  return new;
end $$;
drop trigger if exists hab_lock_tenant_user on hab_tenants;
create trigger hab_lock_tenant_user before insert or update on hab_tenants for each row execute function hab_lock_tenant_user();

-- ---------- Funciones de cuenta, invitaciones, soporte y enlaces ----------
create or replace function hab_bootstrap_account(p_kind hab_org_kind, p_name text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); org uuid;
begin
  if uid is null then raise exception 'Sin sesión'; end if;
  if p_name is null or char_length(trim(p_name)) not between 2 and 120 then raise exception 'Nombre no válido'; end if;
  select m.org_id into org from hab_members m where m.user_id = uid limit 1;
  if org is not null then return org; end if; -- idempotente: una org por usuario en v1
  insert into hab_orgs (name, kind, created_by) values (trim(p_name), p_kind, uid) returning id into org;
  insert into hab_members (org_id, user_id, role) values (org, uid, 'admin');
  insert into hab_org_settings (org_id) values (org) on conflict do nothing;
  return org;
end $$;

create or replace function hab_create_invite(p_org uuid, p_email text, p_role text, p_contract uuid default null) returns text
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare tok text;
begin
  if not hab_is_member(p_org, 'admin') then raise exception 'No autorizado'; end if;
  if p_role not in ('admin','manager','viewer','tenant') then raise exception 'Rol no válido'; end if;
  if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Correo no válido'; end if;
  if p_role = 'tenant' and not exists (select 1 from hab_contracts c where c.id = p_contract and c.org_id = p_org) then
    raise exception 'Contrato no válido para esta organización';
  end if;
  tok := encode(gen_random_bytes(24), 'hex');
  insert into hab_invites (org_id, email, role, contract_id, token_hash, expires_at)
  values (p_org, lower(p_email), p_role, case when p_role = 'tenant' then p_contract end, encode(digest(tok, 'sha256'), 'hex'), now() + interval '7 days');
  return tok;
end $$;

create or replace function hab_accept_invite(p_token text) returns void
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare inv hab_invites; uemail text; confirmed boolean; tid uuid;
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  select email, email_confirmed_at is not null into uemail, confirmed from auth.users where id = auth.uid();
  select * into inv from hab_invites where token_hash = encode(digest(p_token, 'sha256'), 'hex') and used_at is null and expires_at > now() for update;
  if not found then raise exception 'Invitación no válida o caducada'; end if;
  if not confirmed or lower(uemail) <> lower(inv.email) then raise exception 'La invitación es para otro correo o el correo no está confirmado'; end if;
  if inv.role = 'tenant' then
    select tenant_id into tid from hab_contracts where id = inv.contract_id;
    perform set_config('hab.allow_link', 'on', true);
    update hab_tenants set user_id = auth.uid() where id = tid and user_id is null;
    if not found then raise exception 'Este inquilino ya está vinculado a una cuenta'; end if;
  else
    insert into hab_members (org_id, user_id, role) values (inv.org_id, auth.uid(), inv.role::hab_member_role) on conflict do nothing;
  end if;
  update hab_invites set used_at = now() where id = inv.id;
end $$;

create or replace function hab_delete_org(p_org uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not hab_is_member(p_org, 'admin') then raise exception 'No autorizado'; end if;
  delete from hab_orgs where id = p_org; -- cascada; los ficheros de storage hay que borrarlos aparte
end $$;

create or replace function hab_set_tenant_statement(p_incident uuid, p_text text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update hab_incidents set tenant_statement = left(coalesce(p_text, ''), 2000)
  where id = p_incident and tenant_id in (select hab_my_tenant_ids());
  if not found then raise exception 'Incidencia no accesible'; end if;
end $$;

create or replace function hab_ticket_whatsapp_clicked(p_ticket uuid) returns void
language sql security definer set search_path = public, pg_temp as $$
  update hab_support_tickets set whatsapp_clicked_at = now()
  where id = p_ticket and (created_by = auth.uid() or hab_is_member(org_id));
$$;

-- Solo números, sin datos personales; solo para el administrador de plataforma.
create or replace function hab_platform_stats() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not hab_is_platform_admin() then raise exception 'No autorizado'; end if;
  return jsonb_build_object('orgs', (select count(*) from hab_orgs), 'properties', (select count(*) from hab_properties),
                            'rooms', (select count(*) from hab_rooms), 'contracts', (select count(*) from hab_contracts),
                            'sale_interests_new', (select count(*) from hab_sale_interests where status = 'new'));
end $$;

create or replace function hab_create_tenant_link(p_contract uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare c hab_contracts; tok text; l hab_tenant_links;
begin
  select * into c from hab_contracts where id = p_contract;
  if not found or not hab_can_access_room(c.room_id, 'sublet') or not (hab_is_member(c.org_id, 'manager') or hab_can_access_room(c.room_id, 'manage')) then
    raise exception 'No autorizado';
  end if;
  update hab_tenant_links set revoked_at = now() where contract_id = p_contract and revoked_at is null; -- regenerar = revocar el anterior
  tok := encode(gen_random_bytes(32), 'hex');
  insert into hab_tenant_links (org_id, tenant_id, contract_id, room_id, token_hash, expires_at)
  values (c.org_id, c.tenant_id, c.id, c.room_id, encode(digest(tok, 'sha256'), 'hex'), now() + interval '90 days') returning * into l;
  return jsonb_build_object('token', tok, 'link', jsonb_build_object('id', l.id, 'org_id', l.org_id, 'tenant_id', l.tenant_id,
    'contract_id', l.contract_id, 'room_id', l.room_id, 'expires_at', l.expires_at, 'revoked_at', l.revoked_at, 'last_used_at', l.last_used_at, 'created_at', l.created_at));
end $$;

-- Públicas (rol anon): validan el token y solo devuelven lo mínimo.
create or replace function hab_tenant_link_info(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare l hab_tenant_links; res jsonb;
begin
  select * into l from hab_tenant_links where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
    and revoked_at is null and expires_at > now();
  if not found then return null; end if;
  update hab_tenant_links set last_used_at = now() where id = l.id;
  select jsonb_build_object(
    'link_id', l.id, 'org_id', l.org_id,
    'tenant_name', (select full_name from hab_tenants where id = l.tenant_id),
    'room_label', (select label from hab_rooms where id = l.room_id),
    'property_name', (select p.name from hab_properties p join hab_rooms r on r.property_id = p.id where r.id = l.room_id),
    'org_name', (select name from hab_orgs where id = l.org_id),
    'org_whatsapp', (select whatsapp_e164 from hab_org_settings where org_id = l.org_id),
    'auto_reply', coalesce(nullif((select auto_reply from hab_org_settings where org_id = l.org_id), ''), 'Respuesta automática: hemos recibido tu aviso. Este es un asistente automático; una persona lo revisará.'),
    'templates', coalesce((select templates from hab_org_settings where org_id = l.org_id), '{}'::jsonb),
    'incidents', coalesce((select jsonb_agg(jsonb_build_object('code', i.code, 'title', i.title, 'category', i.category, 'status', i.status, 'created_at', i.created_at) order by i.created_at desc)
                           from (select * from hab_incidents where tenant_id = l.tenant_id and room_id = l.room_id order by created_at desc limit 20) i), '[]'::jsonb)
  ) into res;
  return res;
end $$;

create or replace function hab_tenant_link_submit(p_token text, p_category text, p_description text, p_photos text[] default '{}') returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare l hab_tenant_links; prop uuid; inc hab_incidents; ph text;
begin
  select * into l from hab_tenant_links where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
    and revoked_at is null and expires_at > now();
  if not found then raise exception 'Enlace no válido o caducado'; end if;
  if p_category not in ('Avería','Queja','Sugerencia','Otro') then raise exception 'Categoría no válida'; end if;
  if p_description is null or char_length(trim(p_description)) not between 5 and 2000 then raise exception 'Descripción no válida'; end if;
  if cardinality(coalesce(p_photos, '{}')) > 5 then raise exception 'Máximo 5 fotos'; end if;
  foreach ph in array coalesce(p_photos, '{}') loop
    if ph not like (l.org_id::text || '/tenant-link/' || l.id::text || '/%') then raise exception 'Ruta de foto no válida'; end if;
  end loop;
  -- Límite de frecuencia por enlace: 5 avisos por hora.
  if (select count(*) from hab_incidents where link_id = l.id and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Demasiados avisos seguidos; inténtalo más tarde';
  end if;
  select property_id into prop from hab_rooms where id = l.room_id;
  insert into hab_incidents (org_id, property_id, room_id, tenant_id, link_id, category, title, severity, photo_paths, tenant_statement)
  values (l.org_id, prop, l.room_id, l.tenant_id, l.id, p_category, p_category || ': ' || left(trim(p_description), 60), 'medium', coalesce(p_photos, '{}'), trim(p_description))
  returning * into inc;
  insert into hab_incident_events (incident_id, actor, kind, note) values (inc.id, null, 'created', 'Aviso del inquilino por enlace (' || p_category || ')');
  update hab_tenant_links set last_used_at = now() where id = l.id;
  return jsonb_build_object('code', inc.code);
end $$;

-- ---------- RLS: activada en TODAS las tablas ----------
alter table hab_orgs enable row level security;
alter table hab_members enable row level security;
alter table hab_properties enable row level security;
alter table hab_property_access enable row level security;
alter table hab_rooms enable row level security;
alter table hab_tenants enable row level security;
alter table hab_clause_catalog enable row level security;
alter table hab_contracts enable row level security;
alter table hab_inventories enable row level security;
alter table hab_inventory_items enable row level security;
alter table hab_payments enable row level security;
alter table hab_utilities enable row level security;
alter table hab_utility_shares enable row level security;
alter table hab_incidents enable row level security;
alter table hab_incident_events enable row level security;
alter table hab_alerts enable row level security;
alter table hab_audit_log enable row level security;
alter table hab_invites enable row level security;
alter table hab_support_tickets enable row level security;
alter table hab_support_messages enable row level security;
alter table hab_platform_admins enable row level security;
alter table hab_sale_interests enable row level security;
alter table hab_org_settings enable row level security;
alter table hab_tenant_links enable row level security;

-- Permisos de tabla: nada para anon; authenticated solo lo que el diseño permite (RLS filtra filas).
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename like 'hab\_%' loop
    execute format('revoke all on %I from anon, public', t);
    execute format('revoke all on %I from authenticated', t);
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;
revoke insert, update, delete on hab_clause_catalog from authenticated;
revoke insert, delete on hab_orgs from authenticated;
revoke update, delete on hab_audit_log from authenticated;
revoke insert, update, delete on hab_platform_admins from authenticated;
revoke insert, delete on hab_tenant_links from authenticated;
revoke insert, update on hab_invites from authenticated;
revoke delete on hab_support_tickets from authenticated;
revoke delete on hab_sale_interests from authenticated;
revoke update, delete on hab_support_messages from authenticated;
revoke select on hab_invites from authenticated;
grant select (id, org_id, email, role, contract_id, expires_at, used_at) on hab_invites to authenticated;
revoke select on hab_tenant_links from authenticated;
grant select (id, org_id, tenant_id, contract_id, room_id, expires_at, revoked_at, last_used_at, created_at) on hab_tenant_links to authenticated;
revoke update on hab_tenant_links from authenticated;
grant update (revoked_at) on hab_tenant_links to authenticated;

-- ---------- Políticas ----------
-- hab_orgs: ver las orgs propias, las de los pisos a los que se tiene acceso y (admin de plataforma) todas. Alta solo vía hab_bootstrap_account.
drop policy if exists hab_orgs_select on hab_orgs;
create policy hab_orgs_select on hab_orgs for select to authenticated using (
  hab_is_member(id) or hab_is_platform_admin()
  or exists (select 1 from hab_properties p where p.org_id = hab_orgs.id and hab_can_access_property(p.id, 'view'))
  or exists (select 1 from hab_property_access a where a.grantee_org_id = hab_orgs.id and hab_can_access_property(a.property_id, 'manage')));
drop policy if exists hab_orgs_update on hab_orgs;
create policy hab_orgs_update on hab_orgs for update to authenticated using (hab_is_member(id, 'admin')) with check (hab_is_member(id, 'admin'));

-- hab_members: los compañeros se ven entre sí; solo el admin de la org gestiona.
drop policy if exists hab_members_select on hab_members;
create policy hab_members_select on hab_members for select to authenticated using (hab_is_member(org_id) or user_id = auth.uid());
drop policy if exists hab_members_insert on hab_members;
create policy hab_members_insert on hab_members for insert to authenticated with check (hab_is_member(org_id, 'admin'));
drop policy if exists hab_members_update on hab_members;
create policy hab_members_update on hab_members for update to authenticated using (hab_is_member(org_id, 'admin')) with check (hab_is_member(org_id, 'admin'));
drop policy if exists hab_members_delete on hab_members;
create policy hab_members_delete on hab_members for delete to authenticated using (hab_is_member(org_id, 'admin'));

-- hab_properties
drop policy if exists hab_properties_select on hab_properties;
-- Las políticas SELECT usan columnas de la propia fila (no buscan la fila por id): así INSERT ... RETURNING funciona (PostgREST .select()).
create policy hab_properties_select on hab_properties for select to authenticated using (hab_is_member(org_id) or hab_can_access_property(id, 'view'));
drop policy if exists hab_properties_insert on hab_properties;
create policy hab_properties_insert on hab_properties for insert to authenticated with check (hab_is_member(org_id, 'manager'));
drop policy if exists hab_properties_update on hab_properties;
create policy hab_properties_update on hab_properties for update to authenticated using (hab_can_access_property(id, 'manage')) with check (hab_can_access_property(id, 'manage'));
drop policy if exists hab_properties_delete on hab_properties;
create policy hab_properties_delete on hab_properties for delete to authenticated using (hab_is_member(org_id, 'admin'));

-- hab_property_access: el dueño (admin) concede/revoca; la org concesionaria solo ve lo suyo y nunca se auto-concede.
drop policy if exists hab_access_select on hab_property_access;
create policy hab_access_select on hab_property_access for select to authenticated using (
  hab_is_member(grantee_org_id) or exists (select 1 from hab_properties p where p.id = property_id and hab_is_member(p.org_id)));
drop policy if exists hab_access_insert on hab_property_access;
create policy hab_access_insert on hab_property_access for insert to authenticated with check (
  granted_by = auth.uid() and exists (select 1 from hab_properties p where p.id = property_id and hab_is_member(p.org_id, 'admin') and p.org_id <> grantee_org_id));
drop policy if exists hab_access_update on hab_property_access;
create policy hab_access_update on hab_property_access for update to authenticated
  using (exists (select 1 from hab_properties p where p.id = property_id and hab_is_member(p.org_id, 'admin')))
  with check (exists (select 1 from hab_properties p where p.id = property_id and hab_is_member(p.org_id, 'admin')));
drop policy if exists hab_access_delete on hab_property_access;
create policy hab_access_delete on hab_property_access for delete to authenticated using (
  exists (select 1 from hab_properties p where p.id = property_id and hab_is_member(p.org_id, 'admin')));

-- hab_rooms: el inquilino con cuenta ve solo su habitación.
drop policy if exists hab_rooms_select on hab_rooms;
create policy hab_rooms_select on hab_rooms for select to authenticated using (hab_can_access_property(property_id, 'view') or hab_tenant_sees_room(id));
drop policy if exists hab_rooms_insert on hab_rooms;
create policy hab_rooms_insert on hab_rooms for insert to authenticated with check (hab_can_access_property(property_id, 'sublet'));
drop policy if exists hab_rooms_update on hab_rooms;
create policy hab_rooms_update on hab_rooms for update to authenticated using (hab_can_access_property(property_id, 'sublet')) with check (hab_can_access_property(property_id, 'sublet'));
drop policy if exists hab_rooms_delete on hab_rooms;
create policy hab_rooms_delete on hab_rooms for delete to authenticated using (hab_can_access_property(property_id, 'manage'));

-- hab_tenants: org propia, el propio inquilino, o quien ve el piso de un contrato suyo.
drop policy if exists hab_tenants_select on hab_tenants;
create policy hab_tenants_select on hab_tenants for select to authenticated using (
  hab_is_member(org_id) or user_id = auth.uid()
  or exists (select 1 from hab_contracts c where c.tenant_id = hab_tenants.id and hab_can_access_room(c.room_id, 'view')));
drop policy if exists hab_tenants_insert on hab_tenants;
create policy hab_tenants_insert on hab_tenants for insert to authenticated with check (hab_is_member(org_id, 'manager') and user_id is null);
drop policy if exists hab_tenants_update on hab_tenants;
create policy hab_tenants_update on hab_tenants for update to authenticated using (hab_is_member(org_id, 'manager')) with check (hab_is_member(org_id, 'manager'));
drop policy if exists hab_tenants_delete on hab_tenants;
create policy hab_tenants_delete on hab_tenants for delete to authenticated using (hab_is_member(org_id, 'admin'));

-- hab_clause_catalog: solo lectura.
drop policy if exists hab_catalog_select on hab_clause_catalog;
create policy hab_catalog_select on hab_clause_catalog for select to authenticated using (true);

-- hab_contracts: visibles solo con acceso VIGENTE a la habitación (una concesión revocada corta el acceso a lo que creó).
drop policy if exists hab_contracts_select on hab_contracts;
create policy hab_contracts_select on hab_contracts for select to authenticated using (hab_can_access_room(room_id, 'view') or hab_is_my_contract(id));
drop policy if exists hab_contracts_insert on hab_contracts;
create policy hab_contracts_insert on hab_contracts for insert to authenticated with check (
  hab_is_member(org_id, 'manager') and hab_can_access_room(room_id, 'sublet')
  and exists (select 1 from hab_tenants t where t.id = tenant_id and t.org_id = hab_contracts.org_id));
drop policy if exists hab_contracts_update on hab_contracts;
create policy hab_contracts_update on hab_contracts for update to authenticated
  using ((hab_is_member(org_id, 'manager') and hab_can_access_room(room_id, 'sublet')) or hab_can_access_room(room_id, 'manage'))
  with check (hab_can_access_room(room_id, 'sublet') and exists (select 1 from hab_tenants t where t.id = tenant_id and t.org_id = hab_contracts.org_id));
drop policy if exists hab_contracts_delete on hab_contracts;
create policy hab_contracts_delete on hab_contracts for delete to authenticated using (hab_is_member(org_id, 'admin') and hab_can_access_room(room_id, 'sublet'));

-- inventarios
drop policy if exists hab_inv_select on hab_inventories;
create policy hab_inv_select on hab_inventories for select to authenticated using (hab_can_access_room(room_id, 'view') or hab_tenant_sees_inventory(id));
drop policy if exists hab_inv_insert on hab_inventories;
create policy hab_inv_insert on hab_inventories for insert to authenticated with check (
  hab_can_access_room(room_id, 'sublet')
  and (contract_id is null or exists (select 1 from hab_contracts c where c.id = contract_id and c.room_id = hab_inventories.room_id)));
drop policy if exists hab_inv_update on hab_inventories;
create policy hab_inv_update on hab_inventories for update to authenticated using (hab_can_access_room(room_id, 'sublet')) with check (hab_can_access_room(room_id, 'sublet'));
drop policy if exists hab_inv_delete on hab_inventories;
create policy hab_inv_delete on hab_inventories for delete to authenticated using (hab_can_access_room(room_id, 'sublet'));

drop policy if exists hab_items_select on hab_inventory_items;
create policy hab_items_select on hab_inventory_items for select to authenticated using (hab_can_access_inventory(inventory_id, 'view') or hab_tenant_sees_inventory(inventory_id));
drop policy if exists hab_items_insert on hab_inventory_items;
create policy hab_items_insert on hab_inventory_items for insert to authenticated with check (hab_can_access_inventory(inventory_id, 'sublet'));
drop policy if exists hab_items_update on hab_inventory_items;
create policy hab_items_update on hab_inventory_items for update to authenticated using (hab_can_access_inventory(inventory_id, 'sublet')) with check (hab_can_access_inventory(inventory_id, 'sublet'));
drop policy if exists hab_items_delete on hab_inventory_items;
create policy hab_items_delete on hab_inventory_items for delete to authenticated using (hab_can_access_inventory(inventory_id, 'sublet'));

-- cobros: el inquilino solo lee los suyos; no puede marcar pagos.
drop policy if exists hab_payments_select on hab_payments;
create policy hab_payments_select on hab_payments for select to authenticated using (hab_can_access_contract(contract_id, 'view') or hab_is_my_contract(contract_id));
drop policy if exists hab_payments_insert on hab_payments;
create policy hab_payments_insert on hab_payments for insert to authenticated with check (hab_can_access_contract(contract_id, 'sublet'));
drop policy if exists hab_payments_update on hab_payments;
create policy hab_payments_update on hab_payments for update to authenticated using (hab_can_access_contract(contract_id, 'sublet')) with check (hab_can_access_contract(contract_id, 'sublet'));
drop policy if exists hab_payments_delete on hab_payments;
create policy hab_payments_delete on hab_payments for delete to authenticated using (hab_can_access_contract(contract_id, 'sublet'));

-- suministros (sin acceso del inquilino en v1)
drop policy if exists hab_util_select on hab_utilities;
create policy hab_util_select on hab_utilities for select to authenticated using (hab_can_access_property(property_id, 'view'));
drop policy if exists hab_util_insert on hab_utilities;
create policy hab_util_insert on hab_utilities for insert to authenticated with check (hab_can_access_property(property_id, 'sublet'));
drop policy if exists hab_util_update on hab_utilities;
create policy hab_util_update on hab_utilities for update to authenticated using (hab_can_access_property(property_id, 'sublet')) with check (hab_can_access_property(property_id, 'sublet'));
drop policy if exists hab_util_delete on hab_utilities;
create policy hab_util_delete on hab_utilities for delete to authenticated using (hab_can_access_property(property_id, 'sublet'));

drop policy if exists hab_shares_select on hab_utility_shares;
create policy hab_shares_select on hab_utility_shares for select to authenticated using (hab_can_access_utility(utility_id, 'view'));
drop policy if exists hab_shares_insert on hab_utility_shares;
create policy hab_shares_insert on hab_utility_shares for insert to authenticated with check (
  hab_can_access_utility(utility_id, 'sublet')
  and exists (select 1 from hab_utilities u join hab_rooms r on r.property_id = u.property_id where u.id = utility_id and r.id = hab_utility_shares.room_id));
drop policy if exists hab_shares_update on hab_utility_shares;
create policy hab_shares_update on hab_utility_shares for update to authenticated using (hab_can_access_utility(utility_id, 'sublet')) with check (hab_can_access_utility(utility_id, 'sublet'));
drop policy if exists hab_shares_delete on hab_utility_shares;
create policy hab_shares_delete on hab_utility_shares for delete to authenticated using (hab_can_access_utility(utility_id, 'sublet'));

-- incidencias: registro privado de la org; el inquilino con cuenta abre y ve las suyas; no edita estado.
drop policy if exists hab_inc_select on hab_incidents;
create policy hab_inc_select on hab_incidents for select to authenticated using (
  (hab_is_member(org_id) and hab_can_access_property(property_id, 'view')) or tenant_id in (select hab_my_tenant_ids()) or reported_by = auth.uid());
drop policy if exists hab_inc_insert on hab_incidents;
create policy hab_inc_insert on hab_incidents for insert to authenticated with check (
  reported_by = auth.uid() and link_id is null and hab_room_in_property(room_id, property_id)
  and (tenant_id is null or exists (select 1 from hab_tenants t where t.id = tenant_id and t.org_id = hab_incidents.org_id)) and (
    (hab_is_member(org_id, 'manager') and hab_can_access_property(property_id, 'view'))
    or (room_id is not null and hab_tenant_room_ok(room_id, property_id, org_id) and tenant_id in (select hab_my_tenant_ids()))));
drop policy if exists hab_inc_update on hab_incidents;
create policy hab_inc_update on hab_incidents for update to authenticated
  using (hab_is_member(org_id, 'manager') and hab_can_access_property(property_id, 'view'))
  with check (hab_is_member(org_id, 'manager') and hab_can_access_property(property_id, 'view') and hab_room_in_property(room_id, property_id)
    and (tenant_id is null or exists (select 1 from hab_tenants t where t.id = tenant_id and t.org_id = hab_incidents.org_id)));
drop policy if exists hab_inc_delete on hab_incidents;
create policy hab_inc_delete on hab_incidents for delete to authenticated using (hab_is_member(org_id, 'admin') and hab_can_access_property(property_id, 'view'));

drop policy if exists hab_events_select on hab_incident_events;
create policy hab_events_select on hab_incident_events for select to authenticated using (
  hab_can_see_incident(incident_id)
  and (not internal or exists (select 1 from hab_incidents i where i.id = incident_id and hab_is_member(i.org_id))));
drop policy if exists hab_events_insert on hab_incident_events;
create policy hab_events_insert on hab_incident_events for insert to authenticated with check (actor = auth.uid() and hab_can_write_incident(incident_id));

-- avisos y auditoría
drop policy if exists hab_alerts_all on hab_alerts;
create policy hab_alerts_all on hab_alerts for all to authenticated using (hab_is_member(org_id, 'manager')) with check (hab_is_member(org_id, 'manager'));
drop policy if exists hab_audit_select on hab_audit_log;
create policy hab_audit_select on hab_audit_log for select to authenticated using (hab_is_member(org_id, 'admin'));
drop policy if exists hab_audit_insert on hab_audit_log;
create policy hab_audit_insert on hab_audit_log for insert to authenticated with check (hab_is_member(org_id) and actor = auth.uid());

-- invitaciones: solo el admin de la org las ve y las borra; se crean con hab_create_invite.
drop policy if exists hab_invites_select on hab_invites;
create policy hab_invites_select on hab_invites for select to authenticated using (hab_is_member(org_id, 'admin'));
drop policy if exists hab_invites_delete on hab_invites;
create policy hab_invites_delete on hab_invites for delete to authenticated using (hab_is_member(org_id, 'admin'));

-- soporte: cada org ve solo sus tickets (y el autor los suyos); el admin de plataforma ve todos.
drop policy if exists hab_tickets_select on hab_support_tickets;
create policy hab_tickets_select on hab_support_tickets for select to authenticated using (hab_is_member(org_id) or created_by = auth.uid() or hab_is_platform_admin());
drop policy if exists hab_tickets_insert on hab_support_tickets;
create policy hab_tickets_insert on hab_support_tickets for insert to authenticated with check (
  created_by = auth.uid() and status = 'open' and (hab_is_member(org_id) or hab_tenant_in_org(org_id)));
drop policy if exists hab_tickets_update on hab_support_tickets;
create policy hab_tickets_update on hab_support_tickets for update to authenticated using (hab_is_platform_admin()) with check (hab_is_platform_admin());

drop policy if exists hab_msgs_select on hab_support_messages;
create policy hab_msgs_select on hab_support_messages for select to authenticated using (
  exists (select 1 from hab_support_tickets t where t.id = ticket_id and (hab_is_member(t.org_id) or t.created_by = auth.uid() or hab_is_platform_admin())));
drop policy if exists hab_msgs_insert on hab_support_messages;
create policy hab_msgs_insert on hab_support_messages for insert to authenticated with check (
  author = auth.uid() and author_kind in ('user','platform') and (author_kind = 'user' or hab_is_platform_admin())
  and exists (select 1 from hab_support_tickets t where t.id = ticket_id and t.status <> 'closed'
              and (hab_is_member(t.org_id) or t.created_by = auth.uid() or hab_is_platform_admin())));

-- intereses de venta: solo la org propietaria del piso (admin/manager) crea; la org y el admin de plataforma leen.
drop policy if exists hab_sale_select on hab_sale_interests;
create policy hab_sale_select on hab_sale_interests for select to authenticated using (hab_is_member(org_id) or hab_is_platform_admin());
drop policy if exists hab_sale_insert on hab_sale_interests;
create policy hab_sale_insert on hab_sale_interests for insert to authenticated with check (
  created_by = auth.uid() and status = 'new' and hab_is_member(org_id, 'manager')
  and exists (select 1 from hab_properties p where p.id = property_id and p.org_id = hab_sale_interests.org_id));
drop policy if exists hab_sale_update on hab_sale_interests;
create policy hab_sale_update on hab_sale_interests for update to authenticated using (hab_is_platform_admin()) with check (hab_is_platform_admin());

-- administrador de plataforma: cada usuario solo puede leer SU propia fila.
drop policy if exists hab_padmin_select on hab_platform_admins;
create policy hab_padmin_select on hab_platform_admins for select to authenticated using (user_id = auth.uid());

-- ajustes de org y enlaces de inquilino
drop policy if exists hab_settings_select on hab_org_settings;
create policy hab_settings_select on hab_org_settings for select to authenticated using (hab_is_member(org_id));
drop policy if exists hab_settings_insert on hab_org_settings;
create policy hab_settings_insert on hab_org_settings for insert to authenticated with check (hab_is_member(org_id, 'admin'));
drop policy if exists hab_settings_update on hab_org_settings;
create policy hab_settings_update on hab_org_settings for update to authenticated using (hab_is_member(org_id, 'admin')) with check (hab_is_member(org_id, 'admin'));

drop policy if exists hab_links_select on hab_tenant_links;
create policy hab_links_select on hab_tenant_links for select to authenticated using (hab_is_member(org_id, 'manager') and hab_can_access_room(room_id, 'sublet'));
drop policy if exists hab_links_update on hab_tenant_links;
create policy hab_links_update on hab_tenant_links for update to authenticated using (hab_is_member(org_id, 'manager') and hab_can_access_room(room_id, 'sublet'))
  with check (hab_is_member(org_id, 'manager') and hab_can_access_room(room_id, 'sublet'));

-- ---------- Permisos de ejecución de funciones ----------
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'hab\_%' loop
    execute format('revoke all on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;
-- Las únicas funciones públicas (sin login) son las del enlace del inquilino; validan un token de 256 bits.
grant execute on function hab_tenant_link_info(text) to anon;
grant execute on function hab_tenant_link_submit(text, text, text, text[]) to anon;

-- ---------- Storage privado ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('hab-photos', 'hab-photos', false, 5242880, array['image/jpeg','image/png','image/webp']),
  ('hab-docs', 'hab-docs', false, 10485760, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists hab_obj_select on storage.objects;
create policy hab_obj_select on storage.objects for select to authenticated using (
  bucket_id in ('hab-photos','hab-docs') and (hab_is_member(hab_org_from_path(name)) or hab_can_read_path(name)));
drop policy if exists hab_obj_insert on storage.objects;
create policy hab_obj_insert on storage.objects for insert to authenticated with check (
  bucket_id in ('hab-photos','hab-docs') and (
    hab_is_member(hab_org_from_path(name), 'manager')
    or (hab_tenant_in_org(hab_org_from_path(name)) and name like hab_org_from_path(name)::text || '/tenant/' || auth.uid()::text || '/%')));
drop policy if exists hab_obj_delete on storage.objects;
create policy hab_obj_delete on storage.objects for delete to authenticated using (
  bucket_id in ('hab-photos','hab-docs') and hab_is_member(hab_org_from_path(name), 'manager'));

-- ---------- Catálogo inicial: 12 cláusulas, TODAS sin revisar por abogado ----------
insert into hab_clause_catalog (code, category, title, body, community, reviewed_by_lawyer) values
 ('duracion','Duración','Duración del contrato','El contrato tiene la duración indicada en las fechas de inicio y fin. Llegado el fin, las partes pueden acordar por escrito una prórroga.',null,false),
 ('renta_pago','Renta','Renta y forma de pago','La persona inquilina abonará la renta mensual pactada por adelantado, dentro de los primeros cinco días de cada mes, mediante transferencia a la cuenta indicada por la parte arrendadora.',null,false),
 ('fianza_general','Fianza','Fianza','A la firma se entrega la fianza pactada, que se devolverá al finalizar el contrato tras comprobar el estado de la habitación y de los elementos del inventario. Consulta el depósito autonómico que corresponda.',null,false),
 ('fianza_andalucia','Fianza','Fianza (Andalucía)','En Andalucía la custodia de la fianza corresponde a la parte propietaria desde el 24 de enero de 2026 (Ley 5/2025). Confirma el procedimiento vigente antes de usar esta cláusula.','Andalucía',false),
 ('suministros','Gastos','Suministros y gastos','Los suministros (luz, agua, gas, internet) se reparten entre las habitaciones según la regla indicada en el contrato, salvo que estén incluidos en la renta.',null,false),
 ('uso_zonas','Uso','Uso de la habitación y zonas comunes','La habitación se destina a vivienda de la persona inquilina. Las zonas comunes se usan de forma compartida, respetando las reglas de la casa adjuntas.',null,false),
 ('convivencia','Convivencia','Convivencia, ruido y humo','Se respetará el descanso del resto de personas convivientes. Las normas sobre ruido, humo y animales de compañía son las indicadas en las reglas de la casa.',null,false),
 ('visitas','Convivencia','Visitas y pernoctaciones','Las visitas deben respetar las reglas de la casa. Las pernoctaciones frecuentes de terceras personas se acordarán previamente con la parte arrendadora.',null,false),
 ('inventario','Estado','Inventario y estado de la habitación','Se adjunta el inventario de entrada con fotografías fechadas. Al salir se hará el inventario de salida y se comparará con el de entrada.',null,false),
 ('cesion','Cesión','Cesión y subarriendo','La persona inquilina no puede ceder ni subarrendar la habitación sin consentimiento escrito de la parte arrendadora.',null,false),
 ('reparaciones','Mantenimiento','Reparaciones y avisos de incidencias','La persona inquilina avisará sin demora de cualquier avería o incidencia. Las pequeñas reparaciones por uso corren a cargo de quien las cause.',null,false),
 ('preaviso','Resolución','Preaviso y resolución anticipada','Cualquiera de las partes que desee terminar antes de tiempo lo comunicará por escrito con al menos treinta días de antelación.',null,false),
 ('cond_llaves','Condiciones y entrega','Llaves y accesos','Se entregan las llaves indicadas en el Anexo II; no se permiten copias salvo pacto y se devuelven todas al terminar. Se detalla la entrega en el acta de llaves.',null,false),
 ('cond_limpieza','Condiciones y entrega','Limpieza','La limpieza de zonas comunes, de la habitación y la limpieza final se reparten como indica el Anexo II.',null,false),
 ('cond_suministros','Condiciones y entrega','Suministros y servicios','Luz, agua, gas, internet, calefacción y aire acondicionado se incluyen o reparten como indica el Anexo II, con los límites mensuales que se pacten.',null,false),
 ('cond_equipamiento','Condiciones y entrega','Equipamiento y espacios','La habitación y la vivienda se entregan con el equipamiento y espacios indicados en el Anexo II.',null,false),
 ('cond_normas','Condiciones y entrega','Normas de la casa','Se aplican las normas de la casa marcadas en el Anexo II sobre humo, mascotas, visitas, ruido, descanso y entrada del propietario con preaviso.',null,false),
 ('cond_condiciones','Condiciones y entrega','Condiciones de entrada y salida','Horarios de entrada y salida, empadronamiento, reparaciones, seguros, preaviso, penalización pactada (pendiente de revisión legal) y devolución de fianza, según el Anexo II.',null,false)
on conflict (code) do nothing;

commit;

-- =====================================================================================
-- DESPUÉS de registrarte tú en /habitaciones/app/registro, hazte administrador de la
-- plataforma ejecutando (a mano) esta línea con TU user_id (Authentication > Users):
--
--   insert into hab_platform_admins (user_id) values ('TU_USER_ID');
--
-- No hay ninguna credencial fija: sin esa fila nadie es administrador de plataforma.
-- =====================================================================================

-- ============================== 002 candidatos ==============================
-- =====================================================================================
-- Módulo Habitaciones - migración 002: Candidatos (solicitudes de alquiler)
-- NO está aplicada. Ejecutar DESPUÉS de habitaciones_001.sql, a mano, en el editor SQL.
-- Principios: decide siempre una persona; sin puntuación, ranking ni rechazo automático (RGPD art. 22;
-- Reglamento europeo de IA, anexo III 5(b)). Solo preguntas neutras y verificables. La base legal para
-- pedir ingresos y nóminas está SIN VERIFICAR con abogado.
-- PROHIBIDO preguntar o guardar: sexo, nacionalidad, origen, religión, estado civil, hijos o embarazo,
-- salud o discapacidad, orientación u opiniones, fecha de nacimiento y DNI (estos dos solo tras aprobar).
-- La lista blanca de claves de `answers` se impone en la base (hab_application_save).
-- =====================================================================================
begin;

create table if not exists hab_application_criteria (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references hab_orgs(id) on delete cascade,
  room_id uuid not null unique references hab_rooms(id) on delete cascade,
  required_docs text[] not null default '{}'
    check (required_docs <@ array['payslip','work_contract','study_proof','income_proof','reference_letter']),
  notes_public text not null default '' check (char_length(notes_public) <= 1000) -- criterios objetivos, visibles para el candidato
);

create table if not exists hab_applications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references hab_orgs(id) on delete cascade,
  room_id uuid not null references hab_rooms(id) on delete cascade,
  token_hash text not null unique,
  link_expires_at timestamptz not null,
  status text not null default 'sent' check (status in ('sent','submitted','in_review','approved','rejected','withdrawn','expired')),
  applicant_name text not null default '' check (char_length(applicant_name) <= 120),
  email text not null default '' check (char_length(email) <= 160),
  phone text not null default '' check (char_length(phone) <= 30),
  contact_verified boolean not null default false, -- verificación MANUAL del propietario (sin claves externas)
  answers jsonb not null default '{}'::jsonb,
  consent_at timestamptz, consent_text_version text,
  submitted_at timestamptz, decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  decision_reason_code text check (decision_reason_code is null or decision_reason_code in
    ('incomplete_docs','criteria_not_met','dates_mismatch','other_selected','withdrawn_by_applicant')),
  decision_note text not null default '' check (char_length(decision_note) <= 500),
  retention_until date, -- 90 días tras rechazo, retirada o expiración
  created_at timestamptz not null default now()
);
create index if not exists hab_apps_org_idx on hab_applications(org_id, created_at desc);
create index if not exists hab_apps_room_idx on hab_applications(room_id);
create index if not exists hab_apps_retention_idx on hab_applications(retention_until);

create table if not exists hab_application_docs (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references hab_applications(id) on delete cascade,
  kind text not null check (kind in ('payslip','work_contract','study_proof','income_proof','reference_letter')),
  path text not null,
  verified_by uuid references auth.users(id) on delete set null, -- "documento visto y coherente": manual, con fecha y autor
  verified_at timestamptz
);
create index if not exists hab_appdocs_app_idx on hab_application_docs(application_id);

create table if not exists hab_references (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references hab_applications(id) on delete cascade,
  name text not null, email text not null default '', phone text not null default '',
  token_hash text not null unique,
  response jsonb, answered_at timestamptz
);

-- ---------- Funciones ----------
create or replace function hab_can_see_application(p_app uuid, p_min hab_access_kind default 'view') returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from hab_applications a where a.id = p_app
    and hab_is_member(a.org_id, case when hab_access_rank(p_min) <= 1 then 'viewer'::hab_member_role else 'manager'::hab_member_role end)
    and hab_can_access_room(a.room_id, p_min)); -- privado de la org: nunca compartido entre orgs
$$;

create or replace function hab_create_application_link(p_room uuid, p_org uuid, p_days int default 14) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare tok text; a hab_applications;
begin
  if not hab_is_member(p_org, 'manager') or not hab_can_access_room(p_room, 'sublet') then raise exception 'No autorizado'; end if;
  tok := encode(gen_random_bytes(32), 'hex');
  insert into hab_applications (org_id, room_id, token_hash, link_expires_at)
  values (p_org, p_room, encode(digest(tok, 'sha256'), 'hex'), now() + make_interval(days => least(greatest(p_days, 1), 60))) returning * into a;
  return jsonb_build_object('token', tok, 'id', a.id);
end $$;

-- Pública (anon): lo que ve el candidato con su enlace. Sin datos de otros candidatos.
create or replace function hab_application_info(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare a hab_applications; crit hab_application_criteria;
begin
  select * into a from hab_applications where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found then return null; end if;
  if a.status = 'sent' and a.link_expires_at < now() then return null; end if;
  select * into crit from hab_application_criteria where room_id = a.room_id;
  return jsonb_build_object(
    'id', a.id, 'org_id', a.org_id, 'status', a.status, 'applicant_name', a.applicant_name, 'email', a.email, 'phone', a.phone, 'answers', a.answers,
    'consent_text_version', a.consent_text_version,
    'room_label', (select label from hab_rooms where id = a.room_id),
    'rent_cents', (select rent_cents from hab_rooms where id = a.room_id),
    'property_name', (select p.name from hab_properties p join hab_rooms r on r.property_id = p.id where r.id = a.room_id),
    'org_name', (select name from hab_orgs where id = a.org_id), -- responsable de los datos
    'required_docs', coalesce(crit.required_docs, '{}'), 'notes_public', coalesce(crit.notes_public, ''),
    'docs', coalesce((select jsonb_agg(jsonb_build_object('kind', d.kind)) from hab_application_docs d where d.application_id = a.id), '[]'::jsonb));
end $$;

create or replace function hab_application_save(p_token text, p_name text, p_email text, p_phone text, p_answers jsonb, p_consent boolean, p_submit boolean) returns void
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare a hab_applications; k text;
  allowed text[] := array['employment','employer','seniority','contract_type','income_bracket','move_in','duration_months','reason','adults','pets','smoker','previous_landlord'];
begin
  select * into a from hab_applications where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex') for update;
  if not found or a.status <> 'sent' or a.link_expires_at < now() then raise exception 'Solicitud no disponible'; end if;
  if jsonb_typeof(coalesce(p_answers, '{}'::jsonb)) <> 'object' then raise exception 'Respuestas no válidas'; end if;
  for k in select jsonb_object_keys(coalesce(p_answers, '{}'::jsonb)) loop
    if not (k = any (allowed)) then raise exception 'Campo no permitido: %', k; end if; -- lista blanca: nada de datos protegidos
  end loop;
  if length(p_answers::text) > 4000 or char_length(coalesce(p_name,'')) > 120 or char_length(coalesce(p_email,'')) > 160 or char_length(coalesce(p_phone,'')) > 30 then raise exception 'Datos demasiado largos'; end if;
  if p_submit and not coalesce(p_consent, false) then raise exception 'Hace falta el consentimiento'; end if;
  update hab_applications set applicant_name = coalesce(p_name, ''), email = coalesce(p_email, ''), phone = coalesce(p_phone, ''), answers = coalesce(p_answers, '{}'::jsonb),
    consent_at = case when coalesce(p_consent, false) then coalesce(consent_at, now()) else null end,
    consent_text_version = case when coalesce(p_consent, false) then '2026-1' else null end,
    status = case when p_submit then 'submitted' else status end, submitted_at = case when p_submit then now() else submitted_at end
  where id = a.id;
end $$;

create or replace function hab_application_add_doc(p_token text, p_kind text, p_path text) returns void
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare a hab_applications;
begin
  select * into a from hab_applications where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found or a.status <> 'sent' or a.link_expires_at < now() then raise exception 'Solicitud no disponible'; end if;
  if p_kind not in ('payslip','work_contract','study_proof','income_proof','reference_letter') then raise exception 'Tipo de documento no válido'; end if;
  if p_path not like (a.org_id::text || '/applications/' || a.id::text || '/%') then raise exception 'Ruta no válida'; end if;
  if (select count(*) from hab_application_docs where application_id = a.id) >= 8 then raise exception 'Máximo 8 documentos'; end if;
  insert into hab_application_docs (application_id, kind, path) values (a.id, p_kind, p_path);
end $$;

create or replace function hab_application_withdraw(p_token text) returns void
language sql security definer set search_path = public, extensions, pg_temp as $$
  update hab_applications set status = 'withdrawn', decision_reason_code = 'withdrawn_by_applicant', retention_until = current_date + 90
  where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex') and status in ('sent','submitted','in_review');
$$;

-- Decide una PERSONA: aprobar o rechazar con motivo neutro. Queda en hab_audit_log. Sin cálculo automático.
create or replace function hab_decide_application(p_id uuid, p_decision text, p_reason text, p_note text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare a hab_applications;
begin
  select * into a from hab_applications where id = p_id;
  if not found or not hab_can_see_application(p_id, 'sublet') then raise exception 'No autorizado'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Decisión no válida'; end if;
  if p_decision = 'rejected' and p_reason not in ('incomplete_docs','criteria_not_met','dates_mismatch','other_selected') then raise exception 'Elige un motivo de la lista'; end if;
  if a.status not in ('submitted','in_review') then raise exception 'La solicitud no está pendiente de decisión'; end if;
  update hab_applications set status = p_decision, decided_at = now(), decided_by = auth.uid(),
    decision_reason_code = case when p_decision = 'rejected' then p_reason end, decision_note = left(coalesce(p_note, ''), 500),
    retention_until = current_date + 90,
    answers = case when p_decision = 'approved' then '{}'::jsonb else answers end -- aprobado: se eliminan los datos no necesarios
  where id = p_id;
  if p_decision = 'approved' then delete from hab_application_docs where application_id = p_id; end if;
  insert into hab_audit_log (org_id, actor, action, ref) values (a.org_id, auth.uid(), 'application_' || p_decision || coalesce(':' || p_reason, ''), p_id::text);
end $$;

create or replace function hab_delete_application(p_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare a hab_applications;
begin
  select * into a from hab_applications where id = p_id;
  if not found or not hab_can_see_application(p_id, 'sublet') then raise exception 'No autorizado'; end if;
  delete from hab_applications where id = p_id; -- borrado inmediato a petición; los ficheros de storage se retiran aparte
  insert into hab_audit_log (org_id, actor, action, ref) values (a.org_id, auth.uid(), 'application_deleted', p_id::text);
end $$;

-- Retención: marca expiradas y borra lo vencido. NO programada. Para activarla (pg_cron), tú, a mano:
--   select cron.schedule('hab-purge-applications', '15 3 * * *', $$select hab_purge_applications()$$);
create or replace function hab_purge_applications() returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare n int;
begin
  update hab_applications set status = 'expired', retention_until = current_date + 90 where status = 'sent' and link_expires_at < now();
  delete from hab_applications where retention_until is not null and retention_until < current_date;
  get diagnostics n = row_count; return n;
end $$;

create or replace function hab_create_reference(p_app uuid, p_name text, p_email text, p_phone text) returns text
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare tok text;
begin
  if not hab_can_see_application(p_app, 'sublet') then raise exception 'No autorizado'; end if;
  tok := encode(gen_random_bytes(32), 'hex');
  insert into hab_references (application_id, name, email, phone, token_hash) values (p_app, left(p_name, 120), left(coalesce(p_email, ''), 160), left(coalesce(p_phone, ''), 30), encode(digest(tok, 'sha256'), 'hex'));
  return tok;
end $$;

create or replace function hab_reference_answer(p_token text, p_response jsonb) returns void
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if length(coalesce(p_response, '{}'::jsonb)::text) > 3000 then raise exception 'Respuesta demasiado larga'; end if;
  update hab_references set response = p_response, answered_at = now() where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex') and answered_at is null;
  if not found then raise exception 'Enlace no válido'; end if;
end $$;

-- ---------- RLS ----------
alter table hab_application_criteria enable row level security;
alter table hab_applications enable row level security;
alter table hab_application_docs enable row level security;
alter table hab_references enable row level security;

do $$ declare t text; begin
  foreach t in array array['hab_application_criteria','hab_applications','hab_application_docs','hab_references'] loop
    execute format('revoke all on %I from anon, public', t); execute format('revoke all on %I from authenticated', t);
  end loop;
end $$;
grant select, insert, update, delete on hab_application_criteria to authenticated;
grant select (id, org_id, room_id, status, applicant_name, email, phone, contact_verified, answers, consent_at, consent_text_version, submitted_at, decided_at, decided_by, decision_reason_code, decision_note, retention_until, created_at, link_expires_at) on hab_applications to authenticated;
grant update (contact_verified, status) on hab_applications to authenticated; -- la decisión final solo por hab_decide_application
grant select on hab_application_docs to authenticated; grant update (verified_by, verified_at) on hab_application_docs to authenticated;
grant select (id, application_id, name, email, phone, answered_at, response) on hab_references to authenticated;

drop policy if exists hab_crit_select on hab_application_criteria;
create policy hab_crit_select on hab_application_criteria for select to authenticated using (hab_is_member(org_id) and hab_can_access_room(room_id, 'view'));
drop policy if exists hab_crit_write on hab_application_criteria;
create policy hab_crit_write on hab_application_criteria for all to authenticated
  using (hab_is_member(org_id, 'manager') and hab_can_access_room(room_id, 'sublet'))
  with check (hab_is_member(org_id, 'manager') and hab_can_access_room(room_id, 'sublet'));

drop policy if exists hab_apps_select on hab_applications;
create policy hab_apps_select on hab_applications for select to authenticated using (hab_can_see_application(id, 'view'));
drop policy if exists hab_apps_update on hab_applications;
create policy hab_apps_update on hab_applications for update to authenticated using (hab_can_see_application(id, 'sublet')) with check (hab_can_see_application(id, 'sublet') and status in ('in_review','submitted'));

drop policy if exists hab_appdocs_select on hab_application_docs;
create policy hab_appdocs_select on hab_application_docs for select to authenticated using (hab_can_see_application(application_id, 'view'));
drop policy if exists hab_appdocs_update on hab_application_docs;
create policy hab_appdocs_update on hab_application_docs for update to authenticated using (hab_can_see_application(application_id, 'sublet'))
  with check (hab_can_see_application(application_id, 'sublet') and (verified_by is null or verified_by = auth.uid()));

drop policy if exists hab_refs_select on hab_references;
create policy hab_refs_select on hab_references for select to authenticated using (hab_can_see_application(application_id, 'view'));

-- Permisos de ejecución
revoke all on function hab_can_see_application(uuid, hab_access_kind), hab_create_application_link(uuid, uuid, int), hab_application_info(text),
  hab_application_save(text, text, text, text, jsonb, boolean, boolean), hab_application_add_doc(text, text, text), hab_application_withdraw(text),
  hab_decide_application(uuid, text, text, text), hab_delete_application(uuid), hab_purge_applications(), hab_create_reference(uuid, text, text, text),
  hab_reference_answer(text, jsonb) from public, anon, authenticated;
grant execute on function hab_can_see_application(uuid, hab_access_kind), hab_create_application_link(uuid, uuid, int), hab_decide_application(uuid, text, text, text),
  hab_delete_application(uuid), hab_create_reference(uuid, text, text, text) to authenticated;
-- Públicas (sin login; validan un token de 256 bits): el formulario del candidato y la respuesta de la referencia.
grant execute on function hab_application_info(text), hab_application_save(text, text, text, text, jsonb, boolean, boolean),
  hab_application_add_doc(text, text, text), hab_application_withdraw(text), hab_reference_answer(text, jsonb) to anon;
-- hab_purge_applications() queda SOLO para postgres / pg_cron.

commit;

-- ============================== 003 cierre ==============================
-- =====================================================================================
-- Módulo Habitaciones - migración 003: cierre de pendientes
-- NO está aplicada. Ejecutar DESPUÉS de 001 y 002, a mano, en el editor SQL de Supabase.
-- Contiene: plantillas de condiciones en base de datos, límite de frecuencia en base de datos,
-- cola de borrado de ficheros de storage, enlace seguro del contrato, respuesta pública de la
-- referencia del arrendador anterior, y cierre de acceso a ficheros y fichas al revocar permisos.
-- =====================================================================================
begin;

-- ---------- Tablas nuevas ----------
create table if not exists hab_room_templates (
  org_id uuid not null references hab_orgs(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  conditions jsonb not null default '{}'::jsonb check (length(conditions::text) <= 8000),
  primary key (org_id, name)
);
-- Contador de frecuencia compartido entre instancias (lo usan las rutas públicas vía hab_rate_hit).
create table if not exists hab_rate_limits (
  key text primary key check (char_length(key) <= 80),
  window_start timestamptz not null default now(),
  hits integer not null default 0
);
-- Cola de ficheros a borrar de storage (el SQL no puede borrar los bytes; los borra POST /habitaciones/cleanup).
create table if not exists hab_storage_trash (
  id uuid primary key default gen_random_uuid(),
  bucket text not null check (bucket in ('hab-photos','hab-docs')),
  path text not null, is_prefix boolean not null default false,
  created_at timestamptz not null default now()
);
alter table hab_contracts add column if not exists shared_pdf_path text; -- PDF para el enlace seguro de solo lectura

-- ---------- Firma electrónica simple (flujo pendiente de revisión por abogado) ----------
-- Firma electrónica simple (Reglamento UE 910/2014, art. 25). NO es firma cualificada. Valor probatorio sujeto a valoración judicial.
alter table hab_contracts add column if not exists sealed_pdf_path text; -- PDF final sellado con firmas y certificado
alter table hab_org_settings add column if not exists auto_email_copy boolean not null default false; -- copia automática al email del propietario

create table if not exists hab_sign_requests (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references hab_contracts(id) on delete cascade,
  org_id uuid not null references hab_orgs(id) on delete cascade,
  role text not null check (role in ('landlord','tenant')),
  signer_name text not null default '' check (char_length(signer_name) <= 120),
  signer_email text not null default '' check (char_length(signer_email) <= 160),
  token_hash text not null unique,                 -- token de un solo uso; solo se guarda el hash
  expires_at timestamptz not null, used_at timestamptz, revoked_at timestamptz,
  code_hash text, code_expires_at timestamptz,     -- código de 6 dígitos por email (solo si hay envío de email)
  created_at timestamptz not null default now()
);
create index if not exists hab_signreq_contract_idx on hab_sign_requests(contract_id);

-- Solo se inserta (desde el servidor con service_role): sin permisos de actualizar ni borrar para nadie desde la app.
create table if not exists hab_signatures (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references hab_contracts(id) on delete cascade,
  request_id uuid references hab_sign_requests(id) on delete set null,
  role text not null check (role in ('landlord','tenant')),
  signer_name text not null, signed_at timestamptz not null default now(),
  ip text, user_agent text, doc_hash text not null,   -- SHA-256 del documento firmado
  signature_path text, method text not null check (method in ('link','link_code')),
  consent_text text not null
);
create index if not exists hab_signatures_contract_idx on hab_signatures(contract_id);

-- Registro de envíos de email: estado, nunca el contenido.
create table if not exists hab_mail_log (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid references hab_contracts(id) on delete cascade,
  to_role text not null, kind text not null check (kind in ('sealed','code')),
  status text not null check (status in ('sent','failed')), attempts int not null default 1,
  created_at timestamptz not null default now()
);
-- Enlaces de descarga de solo lectura del contrato (30 días, regenerables).
create table if not exists hab_contract_downloads (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references hab_contracts(id) on delete cascade,
  token_hash text not null unique, expires_at timestamptz not null, revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table hab_sign_requests enable row level security;
alter table hab_signatures enable row level security;
alter table hab_mail_log enable row level security;
alter table hab_contract_downloads enable row level security;
revoke all on hab_sign_requests, hab_signatures, hab_mail_log, hab_contract_downloads from anon, public, authenticated;
grant select (id, contract_id, org_id, role, signer_name, signer_email, expires_at, used_at, revoked_at, created_at) on hab_sign_requests to authenticated;
grant update (revoked_at) on hab_sign_requests to authenticated;
grant select on hab_signatures, hab_mail_log to authenticated; -- solo lectura: sin insertar, actualizar ni borrar
drop policy if exists hab_signreq_select on hab_sign_requests;
create policy hab_signreq_select on hab_sign_requests for select to authenticated using (hab_can_access_contract(contract_id, 'view'));
drop policy if exists hab_signreq_update on hab_sign_requests;
create policy hab_signreq_update on hab_sign_requests for update to authenticated using (hab_can_access_contract(contract_id, 'sublet') and hab_is_member(org_id, 'manager'))
  with check (hab_can_access_contract(contract_id, 'sublet') and hab_is_member(org_id, 'manager'));
drop policy if exists hab_signatures_select on hab_signatures;
create policy hab_signatures_select on hab_signatures for select to authenticated using (hab_can_access_contract(contract_id, 'view') or hab_is_my_contract(contract_id));
drop policy if exists hab_maillog_select on hab_mail_log;
create policy hab_maillog_select on hab_mail_log for select to authenticated using (hab_can_access_contract(contract_id, 'view'));
-- hab_contract_downloads: sin políticas ni permisos (solo funciones y servidor).

create or replace function hab_create_sign_requests(p_contract uuid, p_signers jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare c hab_contracts; s jsonb; tok text; out jsonb := '[]'::jsonb;
begin
  select * into c from hab_contracts where id = p_contract;
  if not found or not hab_can_access_room(c.room_id, 'sublet') or not (hab_is_member(c.org_id, 'manager') or hab_can_access_room(c.room_id, 'manage')) then raise exception 'No autorizado'; end if;
  if c.shared_pdf_path is null then raise exception 'Genera primero el PDF del contrato'; end if;
  if jsonb_typeof(p_signers) <> 'array' or jsonb_array_length(p_signers) not between 1 and 4 then raise exception 'Firmantes no válidos'; end if;
  update hab_sign_requests set revoked_at = now() where contract_id = p_contract and used_at is null and revoked_at is null; -- reenviar = invalidar el anterior
  for s in select * from jsonb_array_elements(p_signers) loop
    if s->>'role' not in ('landlord','tenant') then raise exception 'Rol no válido'; end if;
    tok := encode(gen_random_bytes(32), 'hex');
    insert into hab_sign_requests (contract_id, org_id, role, signer_name, signer_email, token_hash, expires_at)
    values (p_contract, c.org_id, s->>'role', left(coalesce(s->>'name',''), 120), left(coalesce(s->>'email',''), 160), encode(digest(tok, 'sha256'), 'hex'), now() + interval '7 days');
    out := out || jsonb_build_object('role', s->>'role', 'token', tok);
  end loop;
  update hab_contracts set status = 'pending_signature' where id = p_contract and status = 'draft';
  return out;
end $$;

create or replace function hab_create_download_link(p_contract uuid) returns text
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare c hab_contracts; tok text;
begin
  select * into c from hab_contracts where id = p_contract;
  if not found or not hab_can_access_room(c.room_id, 'sublet') then raise exception 'No autorizado'; end if;
  update hab_contract_downloads set revoked_at = now() where contract_id = p_contract and revoked_at is null;
  tok := encode(gen_random_bytes(32), 'hex');
  insert into hab_contract_downloads (contract_id, token_hash, expires_at) values (p_contract, encode(digest(tok, 'sha256'), 'hex'), now() + interval '30 days');
  return tok;
end $$;

alter table hab_room_templates enable row level security;
alter table hab_rate_limits enable row level security;
alter table hab_storage_trash enable row level security;
revoke all on hab_room_templates, hab_rate_limits, hab_storage_trash from anon, public, authenticated;
grant select, insert, update, delete on hab_room_templates to authenticated;
-- rate_limits y storage_trash: sin políticas ni permisos para usuarios; solo funciones security definer y service_role.

drop policy if exists hab_tpl_select on hab_room_templates;
create policy hab_tpl_select on hab_room_templates for select to authenticated using (hab_is_member(org_id));
drop policy if exists hab_tpl_write on hab_room_templates;
create policy hab_tpl_write on hab_room_templates for all to authenticated using (hab_is_member(org_id, 'manager')) with check (hab_is_member(org_id, 'manager'));

-- ---------- Límite de frecuencia en base de datos ----------
create or replace function hab_rate_hit(p_key text, p_max int, p_window_seconds int) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare r hab_rate_limits;
begin
  if p_key is null or char_length(p_key) > 80 or p_max < 1 or p_window_seconds < 1 then return true; end if;
  insert into hab_rate_limits as t (key, window_start, hits) values (p_key, now(), 1)
  on conflict (key) do update set
    window_start = case when t.window_start < now() - make_interval(secs => p_window_seconds) then now() else t.window_start end,
    hits = case when t.window_start < now() - make_interval(secs => p_window_seconds) then 1 else t.hits + 1 end
  returning * into r;
  if random() < 0.01 then delete from hab_rate_limits where window_start < now() - interval '1 day'; end if;
  return r.hits > p_max; -- true = limitado
end $$;

-- ---------- Revocar un permiso corta también ficheros y fichas ----------
-- Ficha de inquilino: la org que la creó solo la ve mientras conserve acceso a alguno de sus pisos (o si aún no tiene contratos).
create or replace function hab_can_see_tenant(p_t uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from hab_tenants t where t.id = p_t and (
    t.user_id = auth.uid()
    or exists (select 1 from hab_contracts c where c.tenant_id = t.id and hab_can_access_room(c.room_id, 'view'))
    or (hab_is_member(t.org_id) and not exists (select 1 from hab_contracts c where c.tenant_id = t.id))));
$$;
-- ¿Tiene el inquilino algún contrato? (sin RLS: si no, un contrato oculto por una revocación parecería inexistente)
create or replace function hab_tenant_has_contract(p_t uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$ select exists (select 1 from hab_contracts c where c.tenant_id = p_t); $$;
drop policy if exists hab_tenants_select on hab_tenants;
create policy hab_tenants_select on hab_tenants for select to authenticated using (
  user_id = auth.uid() or hab_can_see_tenant(id)
  or (hab_is_member(org_id) and not hab_tenant_has_contract(id)));

-- ---------- Un subarrendador solo ve SUS contratos, cobros, fichas e inventarios (no los del dueño en el mismo piso) ----------
-- «Supervisión» del piso: miembro de la org dueña, o concesión vigente de gestión o solo lectura. El subarrendador (kind = sublet) NO la tiene.
create or replace function hab_property_oversight(p_property uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from hab_properties p where p.id = p_property and hab_is_member(p.org_id))
      or exists (select 1 from hab_property_access a where a.property_id = p_property and a.status = 'granted'
                 and (a.valid_until is null or a.valid_until >= current_date) and a.kind in ('manage', 'view') and hab_is_member(a.grantee_org_id));
$$;

create or replace function hab_can_access_contract(p_contract uuid, p_min hab_access_kind default 'view') returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from hab_contracts c join hab_rooms r on r.id = c.room_id
                 where c.id = p_contract and hab_can_access_room(c.room_id, p_min)
                   and (hab_property_oversight(r.property_id) or hab_is_member(c.org_id)));
$$;

create or replace function hab_can_access_inventory(p_inv uuid, p_min hab_access_kind default 'view') returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from hab_inventories i join hab_rooms r on r.id = i.room_id
                 where i.id = p_inv and hab_can_access_room(i.room_id, p_min)
                   and (hab_property_oversight(r.property_id) or i.contract_id is null
                        or exists (select 1 from hab_contracts c where c.id = i.contract_id and hab_is_member(c.org_id))));
$$;

create or replace function hab_can_see_tenant(p_t uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from hab_tenants t where t.id = p_t and (
    t.user_id = auth.uid()
    or exists (select 1 from hab_contracts c where c.tenant_id = t.id and hab_can_access_contract(c.id, 'view'))
    or (hab_is_member(t.org_id) and not exists (select 1 from hab_contracts c where c.tenant_id = t.id))));
$$;

create or replace function hab_inv_visible(p_room uuid, p_contract uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from hab_rooms r where r.id = p_room and hab_can_access_room(p_room, 'view')
                 and (hab_property_oversight(r.property_id) or p_contract is null
                      or exists (select 1 from hab_contracts c where c.id = p_contract and hab_is_member(c.org_id))));
$$;

drop policy if exists hab_contracts_select on hab_contracts;
create policy hab_contracts_select on hab_contracts for select to authenticated using (
  (hab_is_member(org_id) and hab_can_access_room(room_id, 'view')) or hab_can_access_contract(id, 'view') or hab_is_my_contract(id));
drop policy if exists hab_inv_select on hab_inventories;
create policy hab_inv_select on hab_inventories for select to authenticated using (hab_inv_visible(room_id, contract_id) or hab_tenant_sees_inventory(id));


-- ¿Algún registro referencia este fichero? (si sí, la lectura exige acceso vigente al registro)
create or replace function hab_path_referenced(p_name text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from hab_inventory_items ii where p_name = any (ii.photo_paths))
      or exists (select 1 from hab_incidents i where p_name = any (i.photo_paths))
      or exists (select 1 from hab_utilities u where u.invoice_path = p_name)
      or exists (select 1 from hab_contracts c where c.signed_pdf_path = p_name or c.shared_pdf_path = p_name or c.sealed_pdf_path = p_name)
      or exists (select 1 from hab_property_access a where a.consent_doc_path = p_name)
      or exists (select 1 from hab_support_tickets t where p_name = any (t.attachment_paths))
      or exists (select 1 from hab_application_docs d where d.path = p_name)
      or exists (select 1 from hab_signatures g where g.signature_path = p_name);
$$;

create or replace function hab_can_read_path(p_name text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from hab_inventory_items ii where p_name = any (ii.photo_paths)
                 and (hab_can_access_inventory(ii.inventory_id, 'view') or hab_tenant_sees_inventory(ii.inventory_id)))
      or exists (select 1 from hab_incidents i where p_name = any (i.photo_paths) and hab_can_see_incident(i.id))
      or exists (select 1 from hab_utilities u where u.invoice_path = p_name and hab_can_access_property(u.property_id, 'view'))
      or exists (select 1 from hab_contracts c where (c.signed_pdf_path = p_name or c.shared_pdf_path = p_name or c.sealed_pdf_path = p_name)
                 and (hab_can_access_room(c.room_id, 'view') or hab_is_my_contract(c.id)))
      or exists (select 1 from hab_property_access a where a.consent_doc_path = p_name
                 and (hab_is_member(a.grantee_org_id) or hab_can_access_property(a.property_id, 'manage')))
      or exists (select 1 from hab_support_tickets t where p_name = any (t.attachment_paths)
                 and (hab_is_platform_admin() or hab_is_member(t.org_id) or t.created_by = auth.uid()))
      or exists (select 1 from hab_application_docs d where d.path = p_name and hab_can_see_application(d.application_id, 'view'))
      or exists (select 1 from hab_signatures g where g.signature_path = p_name and hab_can_access_contract(g.contract_id, 'view'));
$$;

-- Lectura de ficheros: por acceso vigente al registro que los referencia. La carpeta de la org solo vale para
-- ficheros recién subidos que todavía no cuelgan de ningún registro (vista previa antes de guardar).
drop policy if exists hab_obj_select on storage.objects;
create policy hab_obj_select on storage.objects for select to authenticated using (
  bucket_id in ('hab-photos','hab-docs') and (
    hab_can_read_path(name) or (hab_is_member(hab_org_from_path(name)) and not hab_path_referenced(name))));

-- ---------- Borrado de ficheros al borrar cuenta o solicitud ----------
create or replace function hab_delete_org(p_org uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not hab_is_member(p_org, 'admin') then raise exception 'No autorizado'; end if;
  insert into hab_storage_trash (bucket, path, is_prefix) values ('hab-photos', p_org::text || '/', true), ('hab-docs', p_org::text || '/', true);
  delete from hab_orgs where id = p_org; -- cascada de filas; los ficheros salen de storage con POST /habitaciones/cleanup
end $$;

create or replace function hab_decide_application(p_id uuid, p_decision text, p_reason text, p_note text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare a hab_applications;
begin
  select * into a from hab_applications where id = p_id;
  if not found or not hab_can_see_application(p_id, 'sublet') then raise exception 'No autorizado'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Decisión no válida'; end if;
  if p_decision = 'rejected' and p_reason not in ('incomplete_docs','criteria_not_met','dates_mismatch','other_selected') then raise exception 'Elige un motivo de la lista'; end if;
  if a.status not in ('submitted','in_review') then raise exception 'La solicitud no está pendiente de decisión'; end if;
  update hab_applications set status = p_decision, decided_at = now(), decided_by = auth.uid(),
    decision_reason_code = case when p_decision = 'rejected' then p_reason end, decision_note = left(coalesce(p_note, ''), 500),
    retention_until = current_date + 90,
    answers = case when p_decision = 'approved' then '{}'::jsonb else answers end -- aprobado: se eliminan los datos no necesarios
  where id = p_id;
  if p_decision = 'approved' then
    insert into hab_storage_trash (bucket, path) select 'hab-docs', path from hab_application_docs where application_id = p_id; -- salen de storage
    delete from hab_application_docs where application_id = p_id;
  end if;
  insert into hab_audit_log (org_id, actor, action, ref) values (a.org_id, auth.uid(), 'application_' || p_decision || coalesce(':' || p_reason, ''), p_id::text);
end $$;

create or replace function hab_delete_application(p_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare a hab_applications;
begin
  select * into a from hab_applications where id = p_id;
  if not found or not hab_can_see_application(p_id, 'sublet') then raise exception 'No autorizado'; end if;
  insert into hab_storage_trash (bucket, path) select 'hab-docs', path from hab_application_docs where application_id = p_id;
  delete from hab_applications where id = p_id; -- borrado inmediato a petición; los ficheros de storage se retiran aparte
  insert into hab_audit_log (org_id, actor, action, ref) values (a.org_id, auth.uid(), 'application_deleted', p_id::text);
end $$;

-- Retención: marca expiradas y borra lo vencido (con sus ficheros). Programable con pg_cron (NO activado).
create or replace function hab_purge_applications() returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare n int;
begin
  update hab_applications set status = 'expired', retention_until = current_date + 90 where status = 'sent' and link_expires_at < now();
  insert into hab_storage_trash (bucket, path)
    select 'hab-docs', d.path from hab_application_docs d join hab_applications a on a.id = d.application_id where a.retention_until is not null and a.retention_until < current_date;
  delete from hab_applications where retention_until is not null and retention_until < current_date;
  get diagnostics n = row_count; return n;
end $$;

-- ---------- Enlace seguro del contrato (el PDF cuelga del contrato; se sirve con el enlace personal del inquilino) ----------
create or replace function hab_tenant_link_info(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare l hab_tenant_links; res jsonb;
begin
  select * into l from hab_tenant_links where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
    and revoked_at is null and expires_at > now();
  if not found then return null; end if;
  update hab_tenant_links set last_used_at = now() where id = l.id;
  select jsonb_build_object(
    'link_id', l.id, 'org_id', l.org_id,
    'tenant_name', (select full_name from hab_tenants where id = l.tenant_id),
    'room_label', (select label from hab_rooms where id = l.room_id),
    'property_name', (select p.name from hab_properties p join hab_rooms r on r.property_id = p.id where r.id = l.room_id),
    'org_name', (select name from hab_orgs where id = l.org_id),
    'contract_pdf_path', (select shared_pdf_path from hab_contracts where id = l.contract_id),
    'org_whatsapp', (select whatsapp_e164 from hab_org_settings where org_id = l.org_id),
    'auto_reply', coalesce(nullif((select auto_reply from hab_org_settings where org_id = l.org_id), ''), 'Respuesta automática: hemos recibido tu aviso. Este es un asistente automático; una persona lo revisará.'),
    'templates', coalesce((select templates from hab_org_settings where org_id = l.org_id), '{}'::jsonb),
    'incidents', coalesce((select jsonb_agg(jsonb_build_object('code', i.code, 'title', i.title, 'category', i.category, 'status', i.status, 'created_at', i.created_at) order by i.created_at desc)
                           from (select * from hab_incidents where tenant_id = l.tenant_id and room_id = l.room_id order by created_at desc limit 20) i), '[]'::jsonb)
  ) into res;
  return res;
end $$;

-- ---------- Respuesta pública de la referencia del arrendador anterior ----------
create or replace function hab_reference_info(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare r hab_references;
begin
  select * into r from hab_references where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found then return null; end if;
  return jsonb_build_object('answered', r.answered_at is not null, 'reference_name', r.name,
    'applicant_name', (select applicant_name from hab_applications where id = r.application_id),
    'org_name', (select o.name from hab_orgs o join hab_applications a on a.org_id = o.id where a.id = r.application_id));
end $$;

-- Solo estas claves: tiempo de alquiler, puntualidad, estado del inmueble y comentario breve.
create or replace function hab_reference_answer(p_token text, p_response jsonb) returns void
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare k text;
begin
  if jsonb_typeof(coalesce(p_response, '{}'::jsonb)) <> 'object' or length(coalesce(p_response, '{}'::jsonb)::text) > 2000 then raise exception 'Respuesta no válida'; end if;
  for k in select jsonb_object_keys(coalesce(p_response, '{}'::jsonb)) loop
    if k not in ('months', 'punctual', 'property_condition', 'comment') then raise exception 'Campo no permitido: %', k; end if;
  end loop;
  update hab_references set response = p_response, answered_at = now()
    where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex') and answered_at is null;
  if not found then raise exception 'Enlace no válido o ya respondido'; end if;
end $$;

-- ---------- Pisos completos (rental_mode) ----------
-- 'rooms' (por defecto): se alquila por habitaciones. 'whole': se alquila entero; el piso tiene UNA sola unidad
-- (una fila de hab_rooms llamada «Piso entero»), así contratos, inventario, cobros, incidencias y candidatos funcionan igual.
alter table hab_properties add column if not exists rental_mode text not null default 'rooms' check (rental_mode in ('rooms','whole'));

create or replace function hab_one_unit_if_whole() returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if exists (select 1 from hab_properties p where p.id = new.property_id and p.rental_mode = 'whole')
     and exists (select 1 from hab_rooms r where r.property_id = new.property_id and r.id <> new.id) then
    raise exception 'Un piso alquilado entero tiene una sola unidad';
  end if;
  return new;
end $$;
drop trigger if exists hab_one_unit on hab_rooms;
create trigger hab_one_unit before insert or update of property_id on hab_rooms for each row execute function hab_one_unit_if_whole();

create or replace function hab_rent_cap_ok(p_property uuid) returns boolean
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare total bigint; cap bigint;
begin
  if not hab_can_access_property(p_property, 'view') then return null; end if;
  if exists (select 1 from hab_properties where id = p_property and rental_mode = 'whole') then return true; end if; -- el tope solo aplica por habitaciones
  select coalesce(sum(rent_cents), 0) into total from hab_rooms where property_id = p_property;
  select min(c) into cap from (
    select whole_flat_rent_cents as c from hab_properties where id = p_property and whole_flat_rent_cents > 0
    union all
    select max_total_rent_cents from hab_property_access
      where property_id = p_property and kind = 'sublet' and status = 'granted' and max_total_rent_cents > 0
        and (valid_until is null or valid_until >= current_date)
  ) x;
  return cap is null or total <= cap;
end $$;

-- ---------- Permisos de ejecución ----------
revoke all on function hab_property_oversight(uuid), hab_inv_visible(uuid, uuid), hab_tenant_has_contract(uuid), hab_rate_hit(text, int, int), hab_can_see_tenant(uuid), hab_path_referenced(text), hab_reference_info(text) from public, anon, authenticated;
grant execute on function hab_can_see_tenant(uuid), hab_path_referenced(text), hab_property_oversight(uuid), hab_inv_visible(uuid, uuid), hab_tenant_has_contract(uuid) to authenticated;
grant execute on function hab_rate_hit(text, int, int), hab_reference_info(text) to anon, authenticated;
revoke all on function hab_purge_applications() from public, anon, authenticated;
revoke all on function hab_create_sign_requests(uuid, jsonb), hab_create_download_link(uuid) from public, anon;
grant execute on function hab_create_sign_requests(uuid, jsonb), hab_create_download_link(uuid) to authenticated;
revoke all on function hab_one_unit_if_whole() from public, anon, authenticated;
grant execute on function hab_tenant_link_info(text) to anon;
grant execute on function hab_decide_application(uuid, text, text, text), hab_delete_application(uuid) to authenticated;

commit;


-- =====================================================================================
-- ============================== 004 paths ==============================
-- =====================================================================================
-- Habitaciones 004: los paths de ficheros solo pueden apuntar a la carpeta de la organización de la propia fila.
-- Idempotente. Cierra: un miembro de la org A guardaba en su fila un path de la org B y lo leía vía hab_can_read_path.
begin;

-- ¿El path pertenece a una org válida para esta fila?
--  p_row_org  : org de la fila (contratos, incidencias, tickets, solicitudes, firmas). Si es null, la fila cuelga de una propiedad:
--  p_check_member: false al LEER (el inquilino lee sin ser miembro). p_property : el path debe ser de la org dueña de la propiedad, o (piso con concesión vigente) de la org concesionaria,
--               y quien escribe (si hay sesión) debe ser miembro de esa org. p_owner_only fuerza solo la org dueña.
create or replace function hab_path_org_ok(p_path text, p_row_org uuid, p_property uuid, p_owner_only boolean default false, p_check_member boolean default true) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select case
    when p_path is null then true
    when hab_org_from_path(p_path) is null then false
    when p_row_org is not null then hab_org_from_path(p_path) = p_row_org
    else exists (select 1 from hab_properties pr where pr.id = p_property and (
           pr.org_id = hab_org_from_path(p_path)
           or (not p_owner_only and exists (select 1 from hab_property_access a where a.property_id = pr.id
                 and a.grantee_org_id = hab_org_from_path(p_path) and a.status = 'granted'))))
         and (p_owner_only or not p_check_member or auth.uid() is null or hab_is_member(hab_org_from_path(p_path)))
  end;
$$;

-- Trigger único: valida los campos *_path de cada tabla (solo los que cambian, para no bloquear filas antiguas).
create or replace function hab_check_paths() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare n jsonb := to_jsonb(new); o jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
        col text; p text; row_org uuid; prop uuid; owner_only boolean := false;
begin
  case tg_table_name
    when 'hab_contracts' then row_org := new.org_id;
    when 'hab_support_tickets' then row_org := new.org_id;
    when 'hab_incidents' then row_org := new.org_id;
    when 'hab_property_access' then prop := new.property_id; owner_only := true;
    when 'hab_utilities' then prop := new.property_id;
    when 'hab_inventory_items' then
      select r.property_id into prop from hab_inventories i join hab_rooms r on r.id = i.room_id where i.id = new.inventory_id;
    when 'hab_signatures' then select c.org_id into row_org from hab_contracts c where c.id = new.contract_id;
    when 'hab_application_docs' then select a.org_id into row_org from hab_applications a where a.id = new.application_id;
  end case;
  foreach col in array array['signed_pdf_path','shared_pdf_path','sealed_pdf_path','attachment_paths','photo_paths','consent_doc_path','invoice_path','signature_path','path'] loop
    if n ? col and n -> col is distinct from o -> col and n -> col <> 'null'::jsonb then
      for p in select jsonb_array_elements_text(case jsonb_typeof(n -> col) when 'array' then n -> col else jsonb_build_array(n ->> col) end) loop
        if not hab_path_org_ok(p, row_org, prop, owner_only) then
          raise exception 'Ruta de fichero no válida para esta organización (%)', col;
        end if;
      end loop;
    end if;
  end loop;
  return new;
end $$;

do $$ declare t text; begin
  foreach t in array array['hab_contracts','hab_support_tickets','hab_incidents','hab_property_access','hab_utilities','hab_inventory_items','hab_signatures','hab_application_docs'] loop
    execute format('drop trigger if exists hab_check_paths on %I', t);
    execute format('create trigger hab_check_paths before insert or update on %I for each row execute function hab_check_paths()', t);
  end loop;
end $$;

-- Lectura: una referencia solo da acceso si el org del path coincide con el de la fila que lo referencia.
create or replace function hab_can_read_path(p_name text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from hab_inventory_items ii join hab_inventories iv on iv.id = ii.inventory_id join hab_rooms r on r.id = iv.room_id
                 where p_name = any (ii.photo_paths) and hab_path_org_ok(p_name, null, r.property_id, false, false)
                 and (hab_can_access_inventory(ii.inventory_id, 'view') or hab_tenant_sees_inventory(ii.inventory_id)))
      or exists (select 1 from hab_incidents i where p_name = any (i.photo_paths) and hab_org_from_path(p_name) = i.org_id and hab_can_see_incident(i.id))
      or exists (select 1 from hab_utilities u where u.invoice_path = p_name and hab_path_org_ok(p_name, null, u.property_id, false, false)
                 and hab_can_access_property(u.property_id, 'view'))
      or exists (select 1 from hab_contracts c where (c.signed_pdf_path = p_name or c.shared_pdf_path = p_name or c.sealed_pdf_path = p_name)
                 and hab_org_from_path(p_name) = c.org_id
                 and (hab_can_access_room(c.room_id, 'view') or hab_is_my_contract(c.id)))
      or exists (select 1 from hab_property_access a where a.consent_doc_path = p_name and hab_path_org_ok(p_name, null, a.property_id, true)
                 and (hab_is_member(a.grantee_org_id) or hab_can_access_property(a.property_id, 'manage')))
      or exists (select 1 from hab_support_tickets t where p_name = any (t.attachment_paths) and hab_org_from_path(p_name) = t.org_id
                 and (hab_is_platform_admin() or hab_is_member(t.org_id) or t.created_by = auth.uid()))
      or exists (select 1 from hab_application_docs d join hab_applications ap on ap.id = d.application_id
                 where d.path = p_name and hab_org_from_path(p_name) = ap.org_id and hab_can_see_application(d.application_id, 'view'))
      or exists (select 1 from hab_signatures g join hab_contracts c on c.id = g.contract_id
                 where g.signature_path = p_name and hab_org_from_path(p_name) = c.org_id and hab_can_access_contract(g.contract_id, 'view'));
$$;

-- Límite de frecuencia: solo el servidor (service_role) puede escribir contadores; anon ya no puede pisar claves ajenas.
revoke all on function hab_path_org_ok(text, uuid, uuid, boolean, boolean), hab_check_paths() from public, anon, authenticated;
revoke execute on function hab_rate_hit(text, int, int) from public, anon, authenticated;
grant execute on function hab_rate_hit(text, int, int) to service_role;

commit;
