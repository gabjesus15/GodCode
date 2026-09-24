-- Estados de payments_history para los pagos del portal /cuenta.
--
-- Cada compra del dueño (renovar, subir de plan, extra, sucursal extra) crea un pedido:
--   pending             -> falta pagar (PayPal o subir el comprobante)
--   pending_validation  -> comprobante enviado, lo revisa el equipo
--   paid                -> pagado y aplicado
--   rejected            -> comprobante rechazado; puede mandar otro o pagar con PayPal
--   cancelled           -> el dueño lo anuló sin pagar
-- (approved / failed / refunded quedan permitidos para registros antiguos o ajustes a mano:
-- con NOT VALID las filas viejas no se revisan al crear el CHECK, pero sí al actualizarlas,
-- así que la lista debe incluir todo estado que ya exista en la tabla).
--
-- Sin esta migración la app sigue funcionando: si la base rechaza "pending" crea el
-- pedido como "pending_validation" sin comprobante, y si rechaza "cancelled" borra el
-- pedido sin pagar. Con ella, la cola "Pagos por validar" solo muestra lo que de verdad
-- hay que revisar.
--
-- Es idempotente: quita cualquier CHECK previo sobre status y deja uno con la lista
-- completa (NOT VALID: no revisa filas viejas con otros valores).

do $$
declare
	r record;
begin
	for r in
		select conname
		from pg_constraint
		where conrelid = 'public.payments_history'::regclass
			and contype = 'c'
			and pg_get_constraintdef(oid) ilike '%status%'
	loop
		execute format('alter table public.payments_history drop constraint %I', r.conname);
	end loop;
end $$;

alter table public.payments_history
	add constraint payments_history_status_check
	check (
		status is null
		or status in ('pending', 'pending_validation', 'paid', 'rejected', 'cancelled', 'approved', 'failed', 'refunded')
	)
	not valid;

-- La cola del super admin y el portal buscan por estado.
create index if not exists payments_history_status_date_idx
	on public.payments_history (status, payment_date desc);
