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
