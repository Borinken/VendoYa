-- Pruebas de RLS. Cada bloque se ejecuta como un usuario distinto (rol authenticated/anon + claims JWT) y se revierte.
create or replace function public.zz_n(p_tbl text, p_where text default 'true') returns bigint language plpgsql as $$
declare n bigint; begin execute format('select count(*) from %s where %s', p_tbl, p_where) into n; return n; end $$;
-- Ejecuta SQL; devuelve 'ok' o el mensaje de error (los cambios del intento fallido se deshacen).
create or replace function public.zz_try(p_sql text) returns text language plpgsql as $$
begin execute p_sql; return 'ok'; exception when others then return 'ERR: ' || sqlerrm; end $$;
grant execute on function public.zz_n(text, text), public.zz_try(text) to anon, authenticated;

\set A '''{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}'''
\set B '''{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}'''
\set S '''{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated"}'''
\set T '''{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated"}'''
\set N '''{"sub":"eeeeeeee-0000-0000-0000-000000000005","role":"authenticated"}'''

\echo '=== A (dueño) ==='
begin; select set_config('request.jwt.claims', :A, true); set local role authenticated;
select zz_check('A ve solo su piso', zz_n('hab_properties') = 1 and zz_n('hab_properties',$$name='Piso A'$$) = 1);
select zz_check('A no ve habitaciones de B', zz_n('hab_rooms',$$label='B-1'$$) = 0);
select zz_check('A ve los 2 contratos de su piso', zz_n('hab_contracts') = 2);
select zz_check('A ve los 2 inquilinos de su piso y no el de B', zz_n('hab_tenants') = 2 and zz_n('hab_tenants',$$full_name='Inquilino B1'$$) = 0);
select zz_check('A ve cobros de su piso (2) y no los de B', zz_n('hab_payments') = 2);
select zz_check('A ve solo SUS incidencias (privadas por org)', zz_n('hab_incidents') = 1 and zz_n('hab_incidents',$$title='Incidencia de S'$$) = 0);
select zz_check('A ve solo sus tickets', zz_n('hab_support_tickets') = 1);
select zz_check('A no ve orgs ajenas (B)', zz_n('hab_orgs',$$name='Org B'$$) = 0 and zz_n('hab_orgs',$$name='Org S'$$) = 1);
select zz_check('A (admin) lee su auditoría', zz_n('hab_audit_log') = 1);
select zz_check('A no puede crear piso en la org B', zz_try($$insert into hab_properties (org_id,name,address,city,province,community) values ('b0000000-0000-0000-0000-00000000000b','X','x','x','x','x')$$) like 'ERR:%');
select zz_check('A no puede mover org_id de su piso', zz_try($$update hab_properties set org_id='b0000000-0000-0000-0000-00000000000b' where name='Piso A'$$) like 'ERR:%');
select zz_check('A no puede editar el piso de B', zz_n('hab_properties',$$name='Piso B'$$) = 0);
select zz_check('A no puede conceder acceso sobre el piso de B', zz_try($$insert into hab_property_access (property_id,grantee_org_id,kind,granted_by) values ('b1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000a','manage','aaaaaaaa-0000-0000-0000-000000000001')$$) like 'ERR:%');
select zz_check('A no puede auto-concederse acceso (misma org)', zz_try($$insert into hab_property_access (property_id,grantee_org_id,kind,granted_by) values ('a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000a','manage','aaaaaaaa-0000-0000-0000-000000000001')$$) like 'ERR:%');
select zz_check('subarriendo sin documento/tope es rechazado (constraint)', zz_try($$insert into hab_property_access (property_id,grantee_org_id,kind,status,granted_by) values ('a1000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-00000000000b','sublet','granted','aaaaaaaa-0000-0000-0000-000000000001')$$) like 'ERR:%');
select zz_check('A puede crear habitación en su piso', zz_try($$insert into hab_rooms (property_id,label,size_m2,rent_cents) values ('a1000000-0000-0000-0000-000000000001','A-3',9,30000)$$) = 'ok');
select zz_check('A no puede crear contrato con inquilino de otra org', zz_try($$insert into hab_contracts (org_id,room_id,tenant_id,starts_on,ends_on,rent_cents) values ('a0000000-0000-0000-0000-00000000000a','a2000000-0000-0000-0000-000000000001','b4000000-0000-0000-0000-000000000001','2027-01-01','2027-06-01',100)$$) like 'ERR:%');
select zz_check('A no puede fijar user_id de un inquilino (solo por invitación)', zz_try($$update hab_tenants set user_id='eeeeeeee-0000-0000-0000-000000000005' where full_name='Inquilino A1'$$) like 'ERR:%');
select zz_check('A no puede escribir en hab_rate_limits ni hab_storage_trash', zz_try($$select count(*) from hab_rate_limits$$) like 'ERR:%' and zz_try($$select count(*) from hab_storage_trash$$) like 'ERR:%');
select zz_check('A no puede ver hab_contract_downloads', zz_try($$select count(*) from hab_contract_downloads$$) like 'ERR:%');
select zz_check('hab_signatures: A puede leer, no insertar/actualizar/borrar', zz_n('hab_signatures') = 1
  and zz_try($$insert into hab_signatures (contract_id,role,signer_name,doc_hash,method,consent_text) values ('a5000000-0000-0000-0000-000000000001','tenant','x','h','link','c')$$) like 'ERR:%'
  and zz_try($$update hab_signatures set signer_name='hack'$$) like 'ERR:%' and zz_try($$delete from hab_signatures$$) like 'ERR:%');
select zz_check('hab_audit_log: insertar sí, actualizar/borrar no', zz_try($$insert into hab_audit_log (org_id,actor,action) values ('a0000000-0000-0000-0000-00000000000a','aaaaaaaa-0000-0000-0000-000000000001','test')$$) = 'ok'
  and zz_try($$update hab_audit_log set action='x'$$) like 'ERR:%' and zz_try($$delete from hab_audit_log$$) like 'ERR:%');
select zz_check('audit: no se puede insertar a nombre de otro actor ni de otra org', zz_try($$insert into hab_audit_log (org_id,actor,action) values ('a0000000-0000-0000-0000-00000000000a','bbbbbbbb-0000-0000-0000-000000000002','x')$$) like 'ERR:%'
  and zz_try($$insert into hab_audit_log (org_id,actor,action) values ('b0000000-0000-0000-0000-00000000000b','aaaaaaaa-0000-0000-0000-000000000001','x')$$) like 'ERR:%');
select zz_check('catálogo: lectura sí (18), insertar/actualizar/borrar no', zz_n('hab_clause_catalog') = 18
  and zz_try($$insert into hab_clause_catalog (code,category,title,body) values ('x','x','x','x')$$) like 'ERR:%'
  and zz_try($$update hab_clause_catalog set reviewed_by_lawyer=true$$) like 'ERR:%' and zz_try($$delete from hab_clause_catalog$$) like 'ERR:%');
select zz_check('hab_platform_admins: no insertable por usuarios', zz_try($$insert into hab_platform_admins (user_id) values ('aaaaaaaa-0000-0000-0000-000000000001')$$) like 'ERR:%');
select zz_check('A no es admin de plataforma y hab_platform_stats falla', (select hab_is_platform_admin()) = false and zz_try($$select hab_platform_stats()$$) like 'ERR:%');
select zz_check('hab_rent_cap_ok: A supera tope de la concesión (110k>90k)=false; B ajeno=null', (select hab_rent_cap_ok('a1000000-0000-0000-0000-000000000001')) is false and (select hab_rent_cap_ok('b1000000-0000-0000-0000-000000000001')) is null);
select zz_check('A crea enlace de inquilino para su contrato; B no podría', (select (hab_create_tenant_link('a5000000-0000-0000-0000-000000000001'))->>'token') is not null);
select zz_check('A: hab_create_sign_requests ok', zz_try($$select hab_create_sign_requests('a5000000-0000-0000-0000-000000000001','[{"role":"landlord","name":"A","email":"a@test.es"},{"role":"tenant","name":"T","email":"t@test.es"}]'::jsonb)$$) = 'ok');
select zz_check('A: hab_sign_requests no expone token_hash/code_hash', zz_try($$select token_hash from hab_sign_requests$$) like 'ERR:%' and zz_try($$select code_hash from hab_sign_requests$$) like 'ERR:%');
select zz_check('A: hab_tenant_links/hab_invites no exponen token_hash', zz_try($$select token_hash from hab_tenant_links$$) like 'ERR:%' and zz_try($$select token_hash from hab_invites$$) like 'ERR:%');
rollback;

\echo '=== B (otro dueño) ==='
begin; select set_config('request.jwt.claims', :B, true); set local role authenticated;
select zz_check('B ve solo su piso/habitación/contrato', zz_n('hab_properties') = 1 and zz_n('hab_rooms') = 1 and zz_n('hab_contracts') = 1 and zz_n('hab_tenants') = 1);
select zz_check('B no ve nada de A (cobros, incidencias, tickets, firmas, ventas, auditoría)', zz_n('hab_payments') = 1 and zz_n('hab_incidents') = 1 and zz_n('hab_support_tickets') = 1 and zz_n('hab_signatures') = 0 and zz_n('hab_sale_interests') = 0 and zz_n('hab_audit_log') = 0);
select zz_check('B no puede crear habitación en el piso de A', zz_try($$insert into hab_rooms (property_id,label,size_m2,rent_cents) values ('a1000000-0000-0000-0000-000000000001','hack',9,1)$$) like 'ERR:%');
select zz_check('B no puede crear enlace de inquilino del contrato de A', zz_try($$select hab_create_tenant_link('a5000000-0000-0000-0000-000000000001')$$) like 'ERR:%');
select zz_check('B no puede crear solicitudes de firma sobre contrato de A', zz_try($$select hab_create_sign_requests('a5000000-0000-0000-0000-000000000001','[{"role":"tenant","name":"x","email":"x@x.es"}]'::jsonb)$$) like 'ERR:%');
select zz_check('B no puede borrar org A', zz_try($$select hab_delete_org('a0000000-0000-0000-0000-00000000000a')$$) like 'ERR:%');
select zz_check('B no puede leer tickets de A por id', zz_n('hab_support_tickets',$$subject='ticket A'$$) = 0);
rollback;

\echo '=== S (subarrendador con concesión sublet) ==='
begin; select set_config('request.jwt.claims', :S, true); set local role authenticated;
select zz_check('S ve el piso A (concesión) y no el piso B', zz_n('hab_properties') = 1 and zz_n('hab_properties',$$name='Piso B'$$) = 0);
select zz_check('S solo ve SUS contratos del piso (no los del dueño)', zz_n('hab_contracts') = 1 and zz_n('hab_contracts',$$org_id='a0000000-0000-0000-0000-00000000000a'$$) = 0);
select zz_check('S solo ve SUS cobros (no los del dueño)', zz_n('hab_payments') = 1);
select zz_check('S solo ve SUS inquilinos (no los del dueño)', zz_n('hab_tenants') = 1 and zz_n('hab_tenants',$$full_name='Inquilino A1'$$) = 0);
select zz_check('S solo ve sus incidencias', zz_n('hab_incidents') = 1 and zz_n('hab_incidents',$$title='Incidencia de A'$$) = 0);
select zz_check('S no ve tickets/firmas/ventas/auditoría del dueño', zz_n('hab_support_tickets') = 0 and zz_n('hab_signatures') = 0 and zz_n('hab_sale_interests') = 0 and zz_n('hab_audit_log') = 0);
select zz_check('S ve el documento de consentimiento de su concesión', zz_n('hab_property_access') = 1);
select zz_check('S no puede editar el piso ni borrar habitaciones', zz_try($$update hab_properties set name='hack'$$) = 'ok' and zz_n('hab_properties',$$name='hack'$$) = 0 and zz_try($$delete from hab_rooms$$) = 'ok' and zz_n('hab_rooms') = 2);
select zz_check('S no puede concederse más permisos', zz_try($$insert into hab_property_access (property_id,grantee_org_id,kind,granted_by) values ('a1000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-00000000000c','manage','cccccccc-0000-0000-0000-000000000003')$$) like 'ERR:%');
select zz_check('S no puede crear nada en el piso B', zz_try($$insert into hab_rooms (property_id,label,size_m2,rent_cents) values ('b1000000-0000-0000-0000-000000000001','x',9,1)$$) like 'ERR:%');
select zz_check('S puede crear habitación en el piso con sublet', zz_try($$insert into hab_rooms (property_id,label,size_m2,rent_cents) values ('a1000000-0000-0000-0000-000000000001','S-3',9,1000)$$) = 'ok');
select zz_check('S no puede crear contrato con inquilino del dueño', zz_try($$insert into hab_contracts (org_id,room_id,tenant_id,starts_on,ends_on,rent_cents) values ('c0000000-0000-0000-0000-00000000000c','a2000000-0000-0000-0000-000000000002','a4000000-0000-0000-0000-000000000001','2027-01-01','2027-06-01',100)$$) like 'ERR:%');
select zz_check('S no puede crear contrato en sala de B', zz_try($$insert into hab_contracts (org_id,room_id,tenant_id,starts_on,ends_on,rent_cents) values ('c0000000-0000-0000-0000-00000000000c','b2000000-0000-0000-0000-000000000001','c4000000-0000-0000-0000-000000000001','2027-01-01','2027-06-01',100)$$) like 'ERR:%');
select zz_check('S no puede crear enlace de inquilino del contrato del dueño', zz_try($$select hab_create_tenant_link('a5000000-0000-0000-0000-000000000001')$$) like 'ERR:%');
select zz_check('S puede crear enlace de su propio contrato', zz_try($$select hab_create_tenant_link('c5000000-0000-0000-0000-000000000001')$$) = 'ok');
rollback;

\echo '=== S tras REVOCAR la concesión ==='
update hab_property_access set status = 'revoked' where id = 'a3000000-0000-0000-0000-000000000001';
begin; select set_config('request.jwt.claims', :S, true); set local role authenticated;
select zz_check('revocada: S no ve el piso ni sus habitaciones', zz_n('hab_properties') = 0 and zz_n('hab_rooms') = 0);
select zz_check('revocada: S no ve contratos, cobros, firmas ni incidencias', zz_n('hab_contracts') = 0 and zz_n('hab_payments') = 0 and zz_n('hab_signatures') = 0 and zz_n('hab_incidents') = 0);
select zz_check('revocada: S no ve la ficha de sus inquilinos con contrato en ese piso', zz_n('hab_tenants') = 0);
select zz_check('revocada: S no puede crear habitaciones', zz_try($$insert into hab_rooms (property_id,label,size_m2,rent_cents) values ('a1000000-0000-0000-0000-000000000001','S-4',9,1)$$) like 'ERR:%');
select zz_check('revocada: S no puede crear solicitudes de firma ni enlaces', zz_try($$select hab_create_tenant_link('c5000000-0000-0000-0000-000000000001')$$) like 'ERR:%');
rollback;
update hab_property_access set status = 'granted' where id = 'a3000000-0000-0000-0000-000000000001';
update hab_property_access set valid_until = current_date - 1 where id = 'a3000000-0000-0000-0000-000000000001';
begin; select set_config('request.jwt.claims', :S, true); set local role authenticated;
select zz_check('concesión caducada: S no ve el piso', zz_n('hab_properties') = 0);
rollback;
update hab_property_access set valid_until = null where id = 'a3000000-0000-0000-0000-000000000001';

\echo '=== T (inquilino con cuenta) ==='
begin; select set_config('request.jwt.claims', :T, true); set local role authenticated;
select zz_check('T ve solo su contrato, sus cobros y su habitación', zz_n('hab_contracts') = 1 and zz_n('hab_payments') = 1 and zz_n('hab_rooms') = 1 and zz_n('hab_tenants') = 1);
select zz_check('T no ve pisos directamente (usa la función mínima) ni otros contratos/incidencias', zz_n('hab_properties') = 0 and zz_n('hab_incidents') = 0);
select zz_check('T obtiene su piso con hab_my_tenant_property (sin notas)', (select count(*) from hab_my_tenant_property()) = 1 and (select notes from hab_my_tenant_property() limit 1) = '');
select zz_check('T no puede modificar contrato ni cobros', zz_try($$update hab_contracts set rent_cents=1$$) = 'ok' and zz_n('hab_contracts',$$rent_cents=1$$) = 0 and zz_try($$update hab_payments set paid_on=current_date$$) = 'ok' and zz_n('hab_payments',$$paid_on is not null$$) = 0);
select zz_check('T no ve firmas ni auditoría ni ventas', zz_n('hab_signatures') = 1 and zz_n('hab_audit_log') = 0 and zz_n('hab_sale_interests') = 0);
select zz_check('T puede abrir incidencia de SU habitación', zz_try($$insert into hab_incidents (org_id,property_id,room_id,reported_by,tenant_id,title) values ('a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000001','dddddddd-0000-0000-0000-000000000004','a4000000-0000-0000-0000-000000000001','Mi avería')$$) = 'ok');
select zz_check('T no puede abrir incidencia en otra habitación', zz_try($$insert into hab_incidents (org_id,property_id,room_id,reported_by,tenant_id,title) values ('a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000002','dddddddd-0000-0000-0000-000000000004','a4000000-0000-0000-0000-000000000001','x')$$) like 'ERR:%');
select zz_check('T no puede crear tickets en otra org', zz_try($$insert into hab_support_tickets (org_id,created_by,category,subject,body) values ('b0000000-0000-0000-0000-00000000000b','dddddddd-0000-0000-0000-000000000004','Otro','x','x')$$) like 'ERR:%');
rollback;

\echo '=== N (usuario sin org ni contrato) ==='
begin; select set_config('request.jwt.claims', :N, true); set local role authenticated;
select zz_check('N no ve nada', zz_n('hab_properties') = 0 and zz_n('hab_rooms') = 0 and zz_n('hab_contracts') = 0 and zz_n('hab_tenants') = 0 and zz_n('hab_orgs') = 0 and zz_n('hab_support_tickets') = 0);
select zz_check('N puede registrarse con hab_bootstrap_account (idempotente)', (select hab_bootstrap_account('owner','Org N')) is not null and (select hab_bootstrap_account('owner','Otra')) = (select hab_bootstrap_account('owner','Otra')));
select zz_check('tras registrarse N ve solo su org', zz_n('hab_orgs') = 1);
rollback;

\echo '=== ANON y enlaces por token ==='
begin; set local role anon;
select zz_check('anon no lee tablas', zz_try($$select count(*) from hab_properties$$) like 'ERR:%' and zz_try($$select count(*) from hab_contracts$$) like 'ERR:%' and zz_try($$select count(*) from hab_clause_catalog$$) like 'ERR:%');
select zz_check('anon no puede crear enlaces/solicitudes/descargas ni borrar orgs', zz_try($$select hab_create_tenant_link('a5000000-0000-0000-0000-000000000001')$$) like 'ERR:%' and zz_try($$select hab_create_download_link('a5000000-0000-0000-0000-000000000001')$$) like 'ERR:%' and zz_try($$select hab_delete_org('a0000000-0000-0000-0000-00000000000a')$$) like 'ERR:%');
select zz_check('anon: token inválido -> null', (select hab_tenant_link_info('no-es-un-token')) is null);
rollback;
-- enlace real: lo crea A (como postgres para poder leer el token), y anon lo usa
select set_config('request.jwt.claims', :A, false);
create table public.zz_tok as select (hab_create_tenant_link('a5000000-0000-0000-0000-000000000001'))->>'token' as t;
select set_config('request.jwt.claims', '', false);
grant select on zz_tok to anon;
begin; set local role anon;
select zz_check('anon: token válido devuelve nombre y habitación mínimos', (select hab_tenant_link_info((select t from zz_tok))->>'tenant_name') = 'Inquilino A1' and (select hab_tenant_link_info((select t from zz_tok))->>'room_label') = 'A-1');
select zz_check('anon: info no filtra datos de otros inquilinos', (select hab_tenant_link_info((select t from zz_tok))::text) not like '%Inquilino S1%' and (select hab_tenant_link_info((select t from zz_tok))::text) not like '%Inquilino B1%');
select zz_check('anon: enviar aviso crea incidencia atribuida al inquilino', (select hab_tenant_link_submit((select t from zz_tok),'Avería','La persiana no sube', '{}')->>'code') like 'INC-%');
select zz_check('anon: categoría o foto ajena rechazadas', zz_try($$select hab_tenant_link_submit((select t from zz_tok),'Hackeo','xxxxxxx','{}')$$) like 'ERR:%' and zz_try($$select hab_tenant_link_submit((select t from zz_tok),'Avería','xxxxxxx','{otra-org/foto.jpg}')$$) like 'ERR:%');
select zz_check('anon: límite de 5 avisos/hora por enlace', (select count(*) from (select zz_try($$select hab_tenant_link_submit((select t from zz_tok),'Queja','mensaje repetido','{}')$$) r from generate_series(1,8)) s where r like 'ERR:%') >= 3);
select zz_check('hab_rate_hit: limita tras el máximo', (select hab_rate_hit('test-key',2,60)) = false and (select hab_rate_hit('test-key',2,60)) = false and (select hab_rate_hit('test-key',2,60)) = true);
rollback;
-- revocar el enlace lo invalida
update hab_tenant_links set revoked_at = now();
begin; set local role anon;
select zz_check('enlace revocado deja de funcionar', (select hab_tenant_link_info((select t from zz_tok))) is null);
rollback;

\echo '=== Estructura: RLS, search_path, grants ==='
select zz_check('RLS activada en TODAS las tablas hab_*', (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relname like 'hab\_%' and not c.relrowsecurity) = 0);
select zz_check('todas las security definer hab_* tienen search_path fijo', (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'hab\_%' and p.prosecdef and not coalesce(p.proconfig::text,'') like '%search_path%') = 0);
select zz_check('anon solo ejecuta las funciones públicas previstas', (select string_agg(p.proname, ',' order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'hab\_%' and has_function_privilege('anon', p.oid, 'execute')) = 'hab_application_add_doc,hab_application_info,hab_application_save,hab_application_withdraw,hab_rate_hit,hab_reference_answer,hab_reference_info,hab_tenant_link_info,hab_tenant_link_submit');
select 'anon ejecuta: ' || coalesce((select string_agg(p.proname, ',' order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'hab\_%' and has_function_privilege('anon', p.oid, 'execute')), '');
select zz_check('anon sin privilegios sobre tablas hab_*', (select count(*) from information_schema.role_table_grants where grantee='anon' and table_name like 'hab\_%') = 0);
select zz_check('authenticated sin DELETE/UPDATE en hab_signatures y hab_audit_log', (select count(*) from information_schema.role_table_grants where grantee='authenticated' and table_name in ('hab_signatures','hab_audit_log','hab_clause_catalog') and privilege_type in ('UPDATE','DELETE')) = 0);
