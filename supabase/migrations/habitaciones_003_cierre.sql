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
