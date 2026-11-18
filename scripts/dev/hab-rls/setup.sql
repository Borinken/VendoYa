-- Datos de prueba (como postgres: salta RLS). IDs fijos para poder referirlos.
create or replace function public.zz_check(p_name text, p_ok boolean) returns void language plpgsql as $$
begin raise notice '%: %', case when p_ok then 'PASS' else 'FAIL' end, p_name; end $$;
grant execute on function public.zz_check(text, boolean) to anon, authenticated;

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
 ('aaaaaaaa-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.es', now(), '{}', now(), now()),
 ('bbbbbbbb-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@test.es', now(), '{}', now(), now()),
 ('cccccccc-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','s@test.es', now(), '{}', now(), now()),
 ('dddddddd-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','t@test.es', now(), '{}', now(), now()),
 ('eeeeeeee-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p@test.es', now(), '{}', now(), now());

-- orgs: A (dueño), B (otro dueño), S (subarrendador)
insert into hab_orgs (id, name, kind, created_by) values
 ('a0000000-0000-0000-0000-00000000000a','Org A','owner','aaaaaaaa-0000-0000-0000-000000000001'),
 ('b0000000-0000-0000-0000-00000000000b','Org B','owner','bbbbbbbb-0000-0000-0000-000000000002'),
 ('c0000000-0000-0000-0000-00000000000c','Org S','subtenant','cccccccc-0000-0000-0000-000000000003');
insert into hab_members (org_id, user_id, role) values
 ('a0000000-0000-0000-0000-00000000000a','aaaaaaaa-0000-0000-0000-000000000001','admin'),
 ('b0000000-0000-0000-0000-00000000000b','bbbbbbbb-0000-0000-0000-000000000002','admin'),
 ('c0000000-0000-0000-0000-00000000000c','cccccccc-0000-0000-0000-000000000003','admin');

insert into hab_properties (id, org_id, name, address, city, province, community, whole_flat_rent_cents) values
 ('a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000a','Piso A','Calle A 1','Antequera','Málaga','Andalucía',100000),
 ('b1000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-00000000000b','Piso B','Calle B 1','Antequera','Málaga','Andalucía',90000);
insert into hab_rooms (id, property_id, label, size_m2, rent_cents, deposit_cents) values
 ('a2000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','A-1',10,40000,40000),
 ('a2000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000001','A-2',10,40000,40000),
 ('b2000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','B-1',10,40000,40000);
-- concesión sublet de Piso A a Org S (con documento y tope)
insert into hab_property_access (id, property_id, grantee_org_id, kind, consent_doc_path, max_total_rent_cents, status, granted_by) values
 ('a3000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-00000000000c','sublet','a0000000-0000-0000-0000-00000000000a/consent.pdf',90000,'granted','aaaaaaaa-0000-0000-0000-000000000001');

insert into hab_tenants (id, org_id, full_name, email, phone) values
 ('a4000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000a','Inquilino A1','t@test.es','+34600000001'),
 ('c4000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-00000000000c','Inquilino S1','p@test.es','+34600000002'),
 ('b4000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-00000000000b','Inquilino B1','b1@test.es','');
-- vincular el inquilino A1 a su usuario (como lo haría hab_accept_invite)
select set_config('hab.allow_link','on',false);
update hab_tenants set user_id = 'dddddddd-0000-0000-0000-000000000004' where id = 'a4000000-0000-0000-0000-000000000001';
select set_config('hab.allow_link','off',false);

insert into hab_contracts (id, org_id, room_id, tenant_id, starts_on, ends_on, rent_cents, deposit_cents, status, shared_pdf_path) values
 ('a5000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000a','a2000000-0000-0000-0000-000000000001','a4000000-0000-0000-0000-000000000001','2026-01-01','2026-12-31',40000,40000,'active','a0000000-0000-0000-0000-00000000000a/contracts/c1.pdf'),
 ('c5000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-00000000000c','a2000000-0000-0000-0000-000000000002','c4000000-0000-0000-0000-000000000001','2026-01-01','2026-12-31',40000,40000,'active','c0000000-0000-0000-0000-00000000000c/contracts/c2.pdf'),
 ('b5000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-00000000000b','b2000000-0000-0000-0000-000000000001','b4000000-0000-0000-0000-000000000001','2026-01-01','2026-12-31',40000,40000,'active',null);
insert into hab_payments (contract_id, due_on, amount_cents) values
 ('a5000000-0000-0000-0000-000000000001','2026-02-01',40000),('c5000000-0000-0000-0000-000000000001','2026-02-01',40000),('b5000000-0000-0000-0000-000000000001','2026-02-01',40000);
insert into hab_incidents (id, org_id, property_id, room_id, title) values
 ('a6000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000001','Incidencia de A'),
 ('c6000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-00000000000c','a1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000002','Incidencia de S'),
 ('b6000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-00000000000b','b1000000-0000-0000-0000-000000000001',null,'Incidencia de B');
insert into hab_audit_log (org_id, actor, action) values ('a0000000-0000-0000-0000-00000000000a','aaaaaaaa-0000-0000-0000-000000000001','seed');
insert into hab_signatures (id, contract_id, role, signer_name, doc_hash, method, consent_text) values
 ('a7000000-0000-0000-0000-000000000001','a5000000-0000-0000-0000-000000000001','tenant','Inquilino A1','hash','link','consent');
insert into hab_support_tickets (id, org_id, created_by, category, subject, body) values
 ('a8000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000a','aaaaaaaa-0000-0000-0000-000000000001','Otro','ticket A','x'),
 ('b8000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-00000000000b','bbbbbbbb-0000-0000-0000-000000000002','Otro','ticket B','x');
insert into hab_sale_interests (org_id, property_id, timeline) values ('a0000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-000000000001','6m');
insert into hab_sign_requests (id, contract_id, org_id, role, token_hash, expires_at) values
 ('a9000000-0000-0000-0000-000000000001','a5000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000a','tenant', encode(extensions.digest('tok-sign','sha256'),'hex'), now() + interval '7 days');
