-- 004: un miembro de la org A no puede apuntar un path de la org B ni leerlo. Ejecutar tras setup.sql, tests.sql y tests2.sql.
\set A '''{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}'''
\set S '''{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated"}'''
\echo '=== 004: paths de otra org ==='
insert into storage.objects (bucket_id, name) select 'hab-docs', 'b0000000-0000-0000-0000-00000000000b/secret.pdf'
  where not exists (select 1 from storage.objects where name = 'b0000000-0000-0000-0000-00000000000b/secret.pdf');
insert into storage.objects (bucket_id, name) select 'hab-photos', 'b0000000-0000-0000-0000-00000000000b/secret.jpg'
  where not exists (select 1 from storage.objects where name = 'b0000000-0000-0000-0000-00000000000b/secret.jpg');

begin; select set_config('request.jwt.claims', :A, true); set local role authenticated;
select zz_check('004 incidencia: A no puede guardar foto de B', zz_try($$update hab_incidents set photo_paths = '{b0000000-0000-0000-0000-00000000000b/secret.jpg}' where id = 'a6000000-0000-0000-0000-000000000001'$$) like '%Ruta de fichero%');
select zz_check('004 incidencia: A sí puede guardar foto de su carpeta', zz_try($$update hab_incidents set photo_paths = '{a0000000-0000-0000-0000-00000000000a/ok.jpg}' where id = 'a6000000-0000-0000-0000-000000000001'$$) = 'ok');
select zz_check('004 incidencia: path sin carpeta de org rechazado', zz_try($$update hab_incidents set photo_paths = '{secret.jpg}' where id = 'a6000000-0000-0000-0000-000000000001'$$) like '%Ruta de fichero%');
select zz_check('004 ticket: A no puede adjuntar fichero de B', zz_try($$insert into hab_support_tickets (org_id, created_by, category, subject, body, attachment_paths) values ('a0000000-0000-0000-0000-00000000000a','aaaaaaaa-0000-0000-0000-000000000001','Otro','x','x','{b0000000-0000-0000-0000-00000000000b/secret.pdf}')$$) like '%Ruta de fichero%');
select zz_check('004 factura: A no puede apuntar factura de B', zz_try($$insert into hab_utilities (property_id, kind, period, total_cents, invoice_path) values ('a1000000-0000-0000-0000-000000000001','Luz','2026-01',1000,'b0000000-0000-0000-0000-00000000000b/secret.pdf')$$) like '%Ruta de fichero%');
select zz_check('004 factura: A sí puede apuntar factura propia', zz_try($$insert into hab_utilities (property_id, kind, period, total_cents, invoice_path) values ('a1000000-0000-0000-0000-000000000001','Luz','2026-01',1000,'a0000000-0000-0000-0000-00000000000a/f.pdf')$$) = 'ok');
select zz_check('004 contrato: A no puede apuntar PDF de B en su contrato', zz_try($$update hab_contracts set shared_pdf_path = 'b0000000-0000-0000-0000-00000000000b/secret.pdf' where id = 'a5000000-0000-0000-0000-000000000001'$$) like '%Ruta de fichero%'
  and zz_try($$update hab_contracts set signed_pdf_path = 'b0000000-0000-0000-0000-00000000000b/secret.pdf' where id = 'a5000000-0000-0000-0000-000000000001'$$) like '%Ruta de fichero%'
  and zz_try($$update hab_contracts set sealed_pdf_path = 'b0000000-0000-0000-0000-00000000000b/secret.pdf' where id = 'a5000000-0000-0000-0000-000000000001'$$) like '%Ruta de fichero%');
select zz_check('004 contrato: A sí puede apuntar PDF propio', zz_try($$update hab_contracts set shared_pdf_path = 'a0000000-0000-0000-0000-00000000000a/contracts/c1b.pdf' where id = 'a5000000-0000-0000-0000-000000000001'$$) = 'ok');
select zz_check('004 consentimiento: A no puede apuntar doc de B', zz_try($$update hab_property_access set consent_doc_path = 'b0000000-0000-0000-0000-00000000000b/secret.pdf' where id = 'a3000000-0000-0000-0000-000000000001'$$) like '%Ruta de fichero%');
rollback;

begin; select set_config('request.jwt.claims', :S, true); set local role authenticated;
select zz_check('004 piso con concesión: S no puede apuntar factura de la carpeta de A (ni de B)', zz_try($$insert into hab_utilities (property_id, kind, period, total_cents, invoice_path) values ('a1000000-0000-0000-0000-000000000001','Luz','2026-01',1000,'a0000000-0000-0000-0000-00000000000a/orph.jpg')$$) like '%Ruta de fichero%'
  and zz_try($$insert into hab_utilities (property_id, kind, period, total_cents, invoice_path) values ('a1000000-0000-0000-0000-000000000001','Luz','2026-01',1000,'b0000000-0000-0000-0000-00000000000b/secret.pdf')$$) like '%Ruta de fichero%');
rollback;

-- Lectura: aunque una fila antigua (anterior al 004, simulada saltando triggers) apunte al fichero de B, A no lo lee.
set session_replication_role = replica;
update hab_incidents set photo_paths = '{b0000000-0000-0000-0000-00000000000b/secret.jpg}' where id = 'a6000000-0000-0000-0000-000000000001';
update hab_support_tickets set attachment_paths = '{b0000000-0000-0000-0000-00000000000b/secret.pdf}' where id = 'a8000000-0000-0000-0000-000000000001';
set session_replication_role = origin;
begin; select set_config('request.jwt.claims', :A, true); set local role authenticated;
select zz_check('004 lectura: referencia con org distinta no da acceso al fichero de B', zz_n('storage.objects',$$name like 'b0000000%'$$) = 0
  and not hab_can_read_path('b0000000-0000-0000-0000-00000000000b/secret.jpg') and not hab_can_read_path('b0000000-0000-0000-0000-00000000000b/secret.pdf'));
rollback;
-- limpieza de lo simulado
set session_replication_role = replica;
update hab_incidents set photo_paths = '{a0000000-0000-0000-0000-00000000000a/inc.jpg}' where id = 'a6000000-0000-0000-0000-000000000001';
update hab_support_tickets set attachment_paths = '{}' where id = 'a8000000-0000-0000-0000-000000000001';
set session_replication_role = origin;

\echo '=== 004: límite de frecuencia solo servidor ==='
begin; set local role anon;
select zz_check('004 anon ya no puede llamar a hab_rate_hit', zz_try($$select hab_rate_hit('cleanup:global',1,60)$$) like 'ERR:%');
rollback;
begin; set local role service_role;
select zz_check('004 service_role sí limita con hab_rate_hit', (select hab_rate_hit('t3-key',1,60)) = false and (select hab_rate_hit('t3-key',1,60)) = true);
rollback;
