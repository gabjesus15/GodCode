-- 2026-11-02 · Seguridad: el secreto JWT ya no queda guardado en la base.
--
-- La base `postgres` tenía las opciones app.settings.jwt_secret y app.settings.jwt_exp
-- (las dejó el script de arranque 99-jwt.sql de Supabase al crear la base). Cualquier rol
-- conectado las lee con current_setting(): con ese secreto se firma un JWT de
-- service_role y se salta todo RLS. Ninguna función de ningún esquema las usa (revisado
-- en pg_proc el 2026-11-02); PostgREST, GoTrue y Realtime toman el secreto de sus
-- variables de entorno, no de aquí.
--
-- Esto no reemplaza rotar el secreto: el valor estuvo legible para cualquier rol con
-- acceso a la base (MCP incluido). La rotación cambia la anon key y la service role key
-- de GodCode, del panel y de las edge functions, y se hace aparte, en una sola ventana.
--
-- Las sesiones ya abiertas (pooler, PostgREST) conservan el valor hasta reconectarse.
-- 99-jwt.sql solo corre al crear la base desde cero: si algún día se recrea el volumen,
-- vuelve a aparecer y hay que correr esto de nuevo.
--
-- Correr como supabase_admin (postgres no es dueño de la base ni superusuario).

begin;

alter database postgres reset "app.settings.jwt_secret";
alter database postgres reset "app.settings.jwt_exp";

do $$
begin
	if exists (
		select 1 from pg_db_role_setting
		where setconfig::text like '%app.settings.jwt_secret%'
	) then
		raise exception 'comprobación fallida: el secreto sigue en pg_db_role_setting';
	end if;
end
$$;

commit;

-- Para deshacer: alter database postgres set "app.settings.jwt_secret" to '<secreto>';
-- (no hace falta: nada lo usa).
