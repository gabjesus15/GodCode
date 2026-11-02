-- 2026-11-02 · audit_log guarda la cadena completa de x-forwarded-for, no solo el primero.
--
-- El primer valor de x-forwarded-for lo escribe el cliente si ningún proxy lo limpia: con
-- él, cualquiera podía poner la IP que quisiera en el registro de auditoría. Cada proxy
-- (Traefik, el BFF del panel, Kong) agrega la suya al final, así que la IP confiable es la
-- que agregó el primer proxy nuestro, y su posición cambia según el camino (tienda, panel
-- o servidor de GodCode). Guardar la cadena entera (hasta 200 caracteres) deja la
-- evidencia completa y no depende de cuántos proxies haya. Cuando se sepa si Traefik
-- limpia el encabezado del cliente (fase 4, VPS), se puede volver a un solo valor.
--
-- Solo cambia la línea de la IP en audit_row_change(); lo demás es igual a
-- 2026-11-02_audit_log.sql. Correr como postgres. Antes: pg_dump -Fc a /root/backups.

begin;

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
	v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
	v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
	v_row jsonb := coalesce(v_new, v_old);
	v_values text[] := string_to_array(coalesce(tg_argv[0], ''), ',');
	v_ignore text[] := array['updated_at'] || string_to_array(coalesce(tg_argv[1], ''), ',');
	v_changed text[];
	v_before jsonb := '{}';
	v_after jsonb := '{}';
	v_key text;
	v_claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
	v_headers jsonb := nullif(current_setting('request.headers', true), '')::jsonb;
	v_uid uuid := auth.uid();
	v_role text;
begin
	if tg_op = 'UPDATE' then
		select array_agg(k order by k) into v_changed
		from jsonb_object_keys(v_new) as k
		where not (k = any (v_ignore)) and v_new -> k is distinct from v_old -> k;
		if v_changed is null then
			return null;
		end if;
	end if;

	foreach v_key in array v_values loop
		continue when v_key = '';
		if tg_op = 'INSERT' or (tg_op = 'UPDATE' and v_key = any (v_changed)) then
			v_after := v_after || jsonb_build_object(v_key, v_new -> v_key);
		end if;
		if tg_op = 'DELETE' or (tg_op = 'UPDATE' and v_key = any (v_changed)) then
			v_before := v_before || jsonb_build_object(v_key, v_old -> v_key);
		end if;
	end loop;

	if v_uid is not null then
		select u.role into v_role from public.users u where u.auth_user_id = v_uid limit 1;
	end if;
	v_role := coalesce(v_role, nullif(v_claims ->> 'role', ''), current_user::text);

	insert into public.audit_log (
		company_id, actor_auth_user_id, actor_role, action, target_type, target_count,
		target_ids, ip, user_agent, request_id, metadata
	) values (
		case when tg_table_name = 'companies' then (v_row ->> 'id')::uuid
			else nullif(v_row ->> 'company_id', '')::uuid end,
		v_uid,
		v_role,
		'db.' || lower(tg_op),
		tg_table_name,
		1,
		jsonb_build_array(v_row ->> 'id'),
		left(nullif(btrim(coalesce(v_headers ->> 'x-forwarded-for', v_headers ->> 'x-real-ip', '')), ''), 200),
		left(v_headers ->> 'user-agent', 300),
		left(v_headers ->> 'x-request-id', 100),
		-- Sin jsonb_strip_nulls: un valor anterior null también es información.
		case when v_changed is null then '{}'::jsonb else jsonb_build_object('changed', to_jsonb(v_changed)) end
			|| case when v_before = '{}'::jsonb then '{}'::jsonb else jsonb_build_object('before', v_before) end
			|| case when v_after = '{}'::jsonb then '{}'::jsonb else jsonb_build_object('after', v_after) end
	);
	return null;
end;
$$;

revoke all on function public.audit_row_change() from public, anon, authenticated;

do $$
begin
	if position('split_part' in (select prosrc from pg_proc where oid = 'public.audit_row_change()'::regprocedure)) > 0 then
		raise exception 'comprobación fallida: audit_row_change sigue tomando solo el primer valor';
	end if;
end
$$;

commit;

-- Para deshacer: volver a correr la función de 2026-11-02_audit_log.sql.
