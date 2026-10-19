-- Recompensas por puntos: solo CEO / admin / owner las crean o cambian.
--
-- En 2026-10-13_loyalty_rewards.sql cualquier persona de la empresa podía insertar y
-- actualizar loyalty_rewards (solo el borrado pedía is_admin()). El cajero ahora las ve
-- sin poder tocarlas, igual que loyalty_settings. El panel oculta los botones
-- (GodCode-Panel: src/modules/cash/components/AdminLoyaltyRewards.jsx); esto lo hace
-- valer aunque se llame a la API directo.
--
-- Leer (todo el personal) y borrar (ya admin) quedan como estaban. El menú lee con
-- service_role y redeem_loyalty_reward es security definer: ninguno cambia.
--
-- Aplicar en una sola transacción. Antes: pg_dump -Fc a /root/backups.

begin;

drop policy if exists loyalty_rewards_insert_tenant on public.loyalty_rewards;
drop policy if exists loyalty_rewards_insert_admin on public.loyalty_rewards;
create policy loyalty_rewards_insert_admin on public.loyalty_rewards for insert
	with check (company_id = current_user_company_id() and is_admin());

drop policy if exists loyalty_rewards_update_tenant on public.loyalty_rewards;
drop policy if exists loyalty_rewards_update_admin on public.loyalty_rewards;
create policy loyalty_rewards_update_admin on public.loyalty_rewards for update
	using (company_id = current_user_company_id() and is_admin())
	with check (company_id = current_user_company_id() and is_admin());

commit;
