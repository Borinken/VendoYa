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
