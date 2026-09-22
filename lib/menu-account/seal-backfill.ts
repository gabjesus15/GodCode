import "server-only";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";

import { openAccountRow } from "./account-records";
import { listMenuAccountAddresses } from "./activity";
import { accountClientFields, syncMenuAccountClient } from "./client-link";
import { isSealedOrderAddress, sealOrderDeliveryAddress } from "./order-address";
import { isSealedPii } from "./pii";
import type { MenuClientAccountRow } from "./types";

/**
 * Cifra lo que quedó en claro de las cuentas antes de que el cifrado llegara a sus
 * fichas y pedidos: la ficha en `clients`, sus pedidos (contacto y dirección), sus
 * direcciones guardadas y los canjes de cupón de esos pedidos.
 *
 * Es idempotente: lo que ya está cifrado se salta. Sin `apply` solo cuenta.
 */
export type SealBackfillReport = {
	accounts: number;
	clients: number;
	orders: number;
	addresses: number;
	redemptions: number;
};

type OrderRow = {
	id: number;
	client_phone: string | null;
	client_rut: string | null;
	client_name: string | null;
	delivery_address: unknown;
};

/** ¿Tiene la dirección datos personales en claro? (Solo zona o proveedor no cuenta.) */
function addressHasPlainPii(address: unknown): boolean {
	if (!address || isSealedOrderAddress(address)) return false;
	const sealed = sealOrderDeliveryAddress(address);
	return Boolean(sealed && "sealed" in sealed);
}

function orderNeedsSealing(order: OrderRow, shortName: string): boolean {
	return (
		(Boolean(order.client_phone) && !isSealedPii(order.client_phone)) ||
		(Boolean(order.client_rut) && !isSealedPii(order.client_rut)) ||
		order.client_name !== shortName ||
		addressHasPlainPii(order.delivery_address)
	);
}

export async function sealExistingAccountData(options: { apply: boolean }): Promise<SealBackfillReport> {
	const report: SealBackfillReport = { accounts: 0, clients: 0, orders: 0, addresses: 0, redemptions: 0 };

	const { data: rows, error } = await supabaseAdmin
		.from("menu_client_accounts")
		.select("*")
		.not("client_id", "is", null);
	if (error) throw new Error(`No se pudieron leer las cuentas: ${error.message}`);

	for (const raw of (rows ?? []) as MenuClientAccountRow[]) {
		// Si la llave no es la que cifró las cuentas, esto lanza y no se toca nada más.
		const account = openAccountRow(raw, "");
		report.accounts += 1;
		const fields = accountClientFields(account);

		const { data: client } = await supabaseAdmin
			.from("clients")
			.select("phone, rut, name, phone_normalized")
			.eq("id", account.client_id as string)
			.maybeSingle();
		if (
			client &&
			((client.phone && !isSealedPii(client.phone)) ||
				(client.rut && !isSealedPii(client.rut)) ||
				client.phone_normalized != null ||
				client.name !== fields.name)
		) {
			report.clients += 1;
			if (options.apply) await syncMenuAccountClient(account);
		}

		const { data: orders } = await supabaseAdmin
			.from("orders")
			.select("id, client_phone, client_rut, client_name, delivery_address")
			.eq("client_id", account.client_id as string)
			.eq("company_id", account.company_id);
		const pending = ((orders ?? []) as OrderRow[]).filter((o) => orderNeedsSealing(o, fields.name));
		report.orders += pending.length;

		if (options.apply) {
			for (const order of pending) {
				const { error: orderError } = await supabaseAdmin
					.from("orders")
					.update({
						client_name: fields.name,
						client_phone: fields.phone,
						client_rut: fields.rut,
						delivery_address: sealOrderDeliveryAddress(order.delivery_address) as never,
					})
					.eq("id", order.id)
					.eq("client_id", account.client_id as string);
				if (orderError) throw new Error(`Pedido ${order.id}: ${orderError.message}`);

				const { data: redeemed } = await supabaseAdmin
					.from("discount_coupon_redemptions")
					.update({ client_phone: fields.phone })
					.eq("order_id", order.id)
					.select("id");
				report.redemptions += redeemed?.length ?? 0;
			}
		}

		const { data: addressRows } = await supabaseAdmin
			.from("client_addresses")
			.select("address_line, reference")
			.eq("client_id", account.client_id as string);
		report.addresses += (addressRows ?? []).filter(
			(a) => (a.address_line && !isSealedPii(a.address_line)) || (a.reference && !isSealedPii(a.reference)),
		).length;
		// Leer la lista las cifra y quita duplicados (mismo mantenimiento que en /mi-cuenta).
		if (options.apply) await listMenuAccountAddresses(account);
	}

	return report;
}
