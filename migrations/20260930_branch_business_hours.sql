-- Horario de atención por sucursal.
--
-- Fuera de horario el menú deja de recibir pedidos aunque la caja siga abierta. La caja
-- no se toca a propósito: cerrarla sola descuadraría el turno si nadie lo cuadró.
--
-- Hasta ahora ni la pausa manual (order_intake_paused) ni el horario se validaban en la
-- base: solo el carrito los miraba. create_order_transaction (lo usa solo el menú, con y
-- sin cuenta; el POS crea pedidos por create_manual_order_*) ahora rechaza ambos.
--
-- Misma regla que lib/tenant/business-hours.ts; cualquier cambio va en los dos lados.

alter table public.branches add column if not exists business_hours jsonb;

comment on column public.branches.business_hours is
	'Horario del menú: {enabled, timezone, week: {"0".."6": [{open:"HH:MM", close:"HH:MM"}]}}. 0 = domingo. close <= open cruza la medianoche; iguales = 24 horas.';

-- true si a esa hora el menú puede recibir pedidos. Sin horario, desactivado o sin ningún
-- turno válido cargado, no bloquea.
create or replace function public.branch_business_hours_open(p_hours jsonb, p_at timestamptz default now())
returns boolean
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
	v_time_re constant text := '^([01][0-9]|2[0-3]):[0-5][0-9]$';
	v_local timestamp;
	v_dow int;
	v_min int;
	v_open int;
	v_close int;
	v_item jsonb;
begin
	if p_hours is null or jsonb_typeof(p_hours) <> 'object' or (p_hours -> 'enabled') is distinct from 'true'::jsonb then
		return true;
	end if;

	if not exists (
		select 1
		from generate_series(0, 6) as d,
			jsonb_array_elements(
				case when jsonb_typeof(p_hours -> 'week' -> d::text) = 'array' then p_hours -> 'week' -> d::text else '[]'::jsonb end
			) as e
		where coalesce(e ->> 'open', '') ~ v_time_re and coalesce(e ->> 'close', '') ~ v_time_re
	) then
		return true;
	end if;

	begin
		v_local := p_at at time zone coalesce(nullif(btrim(p_hours ->> 'timezone'), ''), 'America/Santiago');
	exception when others then
		-- Zona inválida guardada a mano: mejor la de por defecto que romper los pedidos.
		v_local := p_at at time zone 'America/Santiago';
	end;
	v_dow := extract(dow from v_local)::int;
	v_min := extract(hour from v_local)::int * 60 + extract(minute from v_local)::int;

	-- Turnos de hoy.
	for v_item in
		select e from jsonb_array_elements(
			case when jsonb_typeof(p_hours -> 'week' -> v_dow::text) = 'array' then p_hours -> 'week' -> v_dow::text else '[]'::jsonb end
		) as e
	loop
		continue when coalesce(v_item ->> 'open', '') !~ v_time_re or coalesce(v_item ->> 'close', '') !~ v_time_re;
		v_open := split_part(v_item ->> 'open', ':', 1)::int * 60 + split_part(v_item ->> 'open', ':', 2)::int;
		v_close := split_part(v_item ->> 'close', ':', 1)::int * 60 + split_part(v_item ->> 'close', ':', 2)::int;
		if v_open = v_close then return true; end if;
		if v_open < v_close then
			if v_min >= v_open and v_min < v_close then return true; end if;
		elsif v_min >= v_open then
			return true;
		end if;
	end loop;

	-- Turnos de ayer que pasan la medianoche (p. ej. 18:00 a 02:00).
	for v_item in
		select e from jsonb_array_elements(
			case when jsonb_typeof(p_hours -> 'week' -> ((v_dow + 6) % 7)::text) = 'array'
				then p_hours -> 'week' -> ((v_dow + 6) % 7)::text else '[]'::jsonb end
		) as e
	loop
		continue when coalesce(v_item ->> 'open', '') !~ v_time_re or coalesce(v_item ->> 'close', '') !~ v_time_re;
		v_open := split_part(v_item ->> 'open', ':', 1)::int * 60 + split_part(v_item ->> 'open', ':', 2)::int;
		v_close := split_part(v_item ->> 'close', ':', 1)::int * 60 + split_part(v_item ->> 'close', ':', 2)::int;
		if v_close < v_open and v_min < v_close then return true; end if;
	end loop;

	return false;
end;
$$;

-- Pausa manual y horario: lo que decide si el menú recibe pedidos. La caja no cuenta aquí.
create or replace function public.assert_branch_accepting_menu_orders(p_branch_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
	v_paused boolean;
	v_hours jsonb;
begin
	select b.order_intake_paused, b.business_hours into v_paused, v_hours
	from public.branches b
	where b.id = p_branch_id;

	if coalesce(v_paused, false) then
		raise exception 'order_intake_paused' using errcode = 'P0001';
	end if;
	if not public.branch_business_hours_open(v_hours, now()) then
		raise exception 'outside_business_hours' using errcode = 'P0001';
	end if;
end;
$$;

revoke all on function public.assert_branch_accepting_menu_orders(uuid) from public, anon, authenticated;

-- Inserta el control en la definición viva de create_order_transaction en vez de
-- copiarla entera: así no se pisa ningún cambio hecho después de leerla.
do $$
declare
	v_fn regprocedure := 'public.create_order_transaction(text,text,text,jsonb,numeric,text,text,text,uuid,uuid,text,text,text,jsonb,numeric,text,text,jsonb,uuid)'::regprocedure;
	v_anchor constant text := $a$if v_company_id is null then raise exception 'company_not_found' using errcode = 'P0001'; end if;$a$;
	v_def text;
begin
	v_def := pg_get_functiondef(v_fn);
	if position('assert_branch_accepting_menu_orders' in v_def) > 0 then
		return;
	end if;
	if position(v_anchor in v_def) = 0 then
		raise exception 'create_order_transaction cambió: no se encontró dónde insertar el control de horario';
	end if;
	v_def := replace(
		v_def,
		v_anchor,
		v_anchor || E'\n\n  -- Pausa manual y horario de atención (la caja no cuenta).\n  perform public.assert_branch_accepting_menu_orders(p_branch_id);'
	);
	execute v_def;
end;
$$;
