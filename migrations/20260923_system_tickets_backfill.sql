-- Tickets automáticos antiguos -> "system".
--
-- Hasta ahora /cuenta abría tickets a nombre del dueño (source = 'tenant') cada vez que
-- publicaba la tienda, cancelaba, reactivaba o cambiaba de plan. Aparecían en su Soporte
-- y en su actividad como si él los hubiera escrito (en Rica Pizza, decenas de
-- "Publicacion de cambios de tienda"). La app ya no los crea así: los registros internos
-- van con source = 'system' y el portal no los muestra.
--
-- Esto reclasifica los que ya existen. No borra nada: el equipo los sigue viendo en el
-- panel de tickets. Revisa el conteo con el SELECT antes de correr el UPDATE.

select subject, status, count(*)
from public.saas_tickets
where source = 'tenant'
	and (
		subject = 'Publicacion de cambios de tienda'
		or subject like 'Cancelacion programada del plan · %'
		or subject like 'Cancelacion revertida · %'
		or subject like 'Downgrade programado · %'
		or subject like 'Cambio de plan aplicado · %'
		or subject like 'Cambio de plan pendiente · %'
		or subject like 'Compra de extra pendiente · %'
		or subject like 'Compra de extra aplicada · %'
	)
group by subject, status
order by count(*) desc;

update public.saas_tickets
set source = 'system'
where source = 'tenant'
	and (
		subject = 'Publicacion de cambios de tienda'
		or subject like 'Cancelacion programada del plan · %'
		or subject like 'Cancelacion revertida · %'
		or subject like 'Downgrade programado · %'
		or subject like 'Cambio de plan aplicado · %'
		or subject like 'Cambio de plan pendiente · %'
		or subject like 'Compra de extra pendiente · %'
		or subject like 'Compra de extra aplicada · %'
	);
