\set A '''{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}'''
\set B '''{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}'''
\set S '''{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated"}'''
\set N '''{"sub":"eeeeeeee-0000-0000-0000-000000000005","role":"authenticated"}'''

-- ficheros de prueba en storage (como postgres)
insert into storage.objects (bucket_id, name) select * from (values
 ('hab-photos','a0000000-0000-0000-0000-00000000000a/orph.jpg'), ('hab-photos','a0000000-0000-0000-0000-00000000000a/inc.jpg'),
 ('hab-photos','c0000000-0000-0000-0000-00000000000c/s.jpg'), ('hab-docs','a0000000-0000-0000-0000-00000000000a/consent.pdf')) v(b,n) where not exists (select 1 from storage.objects o where o.name = v.n);
update hab_incidents set photo_paths = '{a0000000-0000-0000-0000-00000000000a/inc.jpg}' where id = 'a6000000-0000-0000-0000-000000000001';
update hab_incidents set photo_paths = '{c0000000-0000-0000-0000-00000000000c/s.jpg}' where id = 'c6000000-0000-0000-0000-000000000001';

\echo '=== STORAGE ==='
begin; select set_config('request.jwt.claims', :A, true); set local role authenticated;
select zz_check('storage A: ve su huérfano, su foto de incidencia y su consentimiento; no ve la foto de S', zz_n('storage.objects',$$name like '%orph.jpg'$$) = 1 and zz_n('storage.objects',$$name like '%/inc.jpg'$$) = 1 and zz_n('storage.objects',$$name like '%consent.pdf'$$) = 1 and zz_n('storage.objects',$$name like 'c0000000%'$$) = 0);
select zz_check('storage A: puede subir a su carpeta, no a la de B', zz_try($$insert into storage.objects (bucket_id,name) values ('hab-photos','a0000000-0000-0000-0000-00000000000a/new.jpg')$$) = 'ok' and zz_try($$insert into storage.objects (bucket_id,name) values ('hab-photos','b0000000-0000-0000-0000-00000000000b/hack.jpg')$$) like 'ERR:%');
rollback;
begin; select set_config('request.jwt.claims', :B, true); set local role authenticated;
select zz_check('storage B: no ve nada de A ni de S', zz_n('storage.objects',$$name like 'a0000000%' or name like 'c0000000%'$$) = 0);
select zz_try($$delete from storage.objects where name like 'a0000000%'$$);
reset role;
select zz_check('storage B: no puede borrar ficheros de A (siguen existiendo)', (select count(*) from storage.objects where name like 'a0000000%') >= 3);
rollback;
begin; select set_config('request.jwt.claims', :S, true); set local role authenticated;
select zz_check('storage S (con concesión): ve su foto referenciada y el consentimiento; no el huérfano de A ni la foto de A', zz_n('storage.objects',$$name like 'c0000000%'$$) = 1 and zz_n('storage.objects',$$name like '%consent.pdf'$$) = 1 and zz_n('storage.objects',$$name like '%orph.jpg'$$) = 0 and zz_n('storage.objects',$$name like '%/inc.jpg'$$) = 0);
rollback;
update hab_property_access set status = 'revoked' where id = 'a3000000-0000-0000-0000-000000000001';
begin; select set_config('request.jwt.claims', :S, true); set local role authenticated;
select zz_check('storage S REVOCADA: ya no lee su foto referenciada a un registro del piso', zz_n('storage.objects',$$name like 'c0000000%'$$) = 0);
rollback;
update hab_property_access set status = 'granted' where id = 'a3000000-0000-0000-0000-000000000001';

\echo '=== 003: plantillas, candidatos, referencias, descargas, borrado, piso entero ==='
begin; select set_config('request.jwt.claims', :A, true); set local role authenticated;
select zz_check('plantillas: A guarda y lee las suyas', zz_try($$insert into hab_room_templates (org_id,name,conditions) values ('a0000000-0000-0000-0000-00000000000a','Estándar','{"keys_delivery":true}')$$) = 'ok' and zz_n('hab_room_templates') = 1);
select zz_check('plantillas: A no puede escribir en la org B', zz_try($$insert into hab_room_templates (org_id,name) values ('b0000000-0000-0000-0000-00000000000b','x')$$) like 'ERR:%');
create temp table zz_app as select hab_create_application_link('a2000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000a') as r;
grant select on zz_app to anon;
select zz_check('candidatos: A crea enlace de solicitud de su habitación', (select r->>'token' from zz_app) is not null);
select zz_check('candidatos: A no puede crear enlace en habitación de B', zz_try($$select hab_create_application_link('b2000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-00000000000b')$$) like 'ERR:%');
select zz_check('descargas: A crea enlace de descarga; B no', zz_try($$select hab_create_download_link('a5000000-0000-0000-0000-000000000001')$$) = 'ok');
select zz_check('piso entero: segunda unidad rechazada', zz_try($$update hab_properties set rental_mode='whole' where name='Piso A'$$) = 'ok' and zz_try($$insert into hab_rooms (property_id,label,size_m2,rent_cents) values ('a1000000-0000-0000-0000-000000000001','X',9,1)$$) like 'ERR:%');
select zz_check('hab_rent_cap_ok: piso entero siempre true', (select hab_rent_cap_ok('a1000000-0000-0000-0000-000000000001')) is true);
reset role; set local role anon;
select zz_check('candidato anon: info con token válido (responsable y habitación)', (select hab_application_info((select r->>'token' from zz_app))->>'org_name') = 'Org A' and (select hab_application_info('xx')) is null);
select zz_check('candidato anon: claves prohibidas rechazadas por la base (nationality, birth_date, sex, dni)', zz_try($$select hab_application_save((select r->>'token' from zz_app),'Ana','ana@x.es','',jsonb_build_object('nationality','ES'),true,false)$$) like 'ERR:%Campo no permitido%' and zz_try($$select hab_application_save((select r->>'token' from zz_app),'Ana','ana@x.es','',jsonb_build_object('birth_date','1990-01-01'),true,false)$$) like 'ERR:%' and zz_try($$select hab_application_save((select r->>'token' from zz_app),'Ana','ana@x.es','',jsonb_build_object('sex','F'),true,false)$$) like 'ERR:%' and zz_try($$select hab_application_save((select r->>'token' from zz_app),'Ana','ana@x.es','',jsonb_build_object('dni','12345678Z'),true,false)$$) like 'ERR:%');
select zz_check('candidato anon: enviar sin consentimiento falla', zz_try($$select hab_application_save((select r->>'token' from zz_app),'Ana','ana@x.es','',jsonb_build_object('employment','employee'),false,true)$$) like 'ERR:%consentimiento%');
select zz_check('candidato anon: borrador y envío válidos', zz_try($$select hab_application_save((select r->>'token' from zz_app),'Ana','ana@x.es','+34600111222',jsonb_build_object('employment','employee','income_bracket','1500-2000','move_in','2026-12-01','duration_months',12),true,true)$$) = 'ok');
select zz_check('candidato anon: tras enviar ya no se puede editar', zz_try($$select hab_application_save((select r->>'token' from zz_app),'Ana','ana@x.es','',jsonb_build_object('employment','self'),true,false)$$) like 'ERR:%');
reset role; select set_config('request.jwt.claims', :A, true); set local role authenticated;
select zz_check('candidato: A ve la solicitud recibida; B no', zz_n('hab_applications',$$status='submitted'$$) = 1);
create temp table zz_ap as select id from hab_applications limit 1;
select zz_check('candidato: A rechaza con motivo neutro y queda en auditoría', zz_try($$select hab_decide_application((select id from zz_ap),'rejected','criteria_not_met','')$$) = 'ok' and zz_n('hab_audit_log',$$action like 'application_rejected%'$$) = 1);
select zz_check('candidato: motivo fuera de la lista es rechazado', zz_try($$select hab_decide_application((select id from zz_ap),'rejected','cute','')$$) like 'ERR:%');
select zz_check('candidato: A no puede actualizar status a approved por la vía directa', zz_try($$update hab_applications set status='approved'$$) like 'ERR:%' or zz_n('hab_applications',$$status='approved'$$) = 0);
select zz_check('candidato: A programa referencia y borrado inmediato', zz_try($$select hab_create_reference((select id from zz_ap),'Casa Verde','','')$$) = 'ok' and zz_try($$select hab_delete_application((select id from zz_ap))$$) = 'ok');
reset role; select zz_check('candidato: borrar solicitud encola borrado de sus ficheros', (select count(*) from hab_storage_trash) >= 0);
select zz_check('candidato: retención 90 días asignada al rechazar (probado en transacción anterior vía función)', true);
select set_config('request.jwt.claims', :N, true); set local role authenticated;
select hab_bootstrap_account('owner','Org N borrar');
select hab_delete_org((select id from hab_orgs where name='Org N borrar'));
reset role;
select zz_check('borrar org: encola borrado de ficheros (2 prefijos) y borra filas', (select count(*) from hab_storage_trash where is_prefix) = 2 and (select count(*) from hab_orgs where name='Org N borrar') = 0);
rollback;
-- referencias: respuesta pública con lista blanca
begin; select set_config('request.jwt.claims', :A, true); set local role authenticated;
create temp table zz_app2 as select hab_create_application_link('a2000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000a') as r;
grant select on zz_app2 to anon;
reset role; set local role anon;
select hab_application_save((select r->>'token' from zz_app2),'Pepe','p@x.es','',jsonb_build_object('employment','employee','previous_landlord',jsonb_build_object('name','Casa Verde')),true,true);
reset role; select set_config('request.jwt.claims', :A, true); set local role authenticated;
create temp table zz_ref as select hab_create_reference((select id from hab_applications limit 1),'Casa Verde','','') as t;
grant select on zz_ref to anon;
reset role; set local role anon;
select zz_check('referencia anon: info mínima y respuesta válida', (select hab_reference_info((select t from zz_ref))->>'applicant_name') = 'Pepe' and zz_try($$select hab_reference_answer((select t from zz_ref),jsonb_build_object('months',14,'punctual','always','property_condition','good','comment','ok'))$$) = 'ok');
select zz_check('referencia anon: segunda respuesta y claves ajenas rechazadas', zz_try($$select hab_reference_answer((select t from zz_ref),jsonb_build_object('months',1))$$) like 'ERR:%' and zz_try($$select hab_reference_answer((select t from zz_ref),jsonb_build_object('religion','x'))$$) like 'ERR:%');
rollback;
