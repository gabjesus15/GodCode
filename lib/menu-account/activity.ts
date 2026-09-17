import "server-only";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { logger } from "@/lib/infra/logger";
import type {
	MenuAccountAddress,
	MenuAccountOrder,
	MenuAccountOrderItem,
} from "@/components/tenant/account/menu-account-types";

import { menuAccountErrors } from "./errors";
import { isSealedPii, openPii, sealPii } from "./pii";
import type { MenuClientAccountRow } from "./types";

const ORDER_HISTORY_LIMIT = 30;
export const ADDRESS_LIMIT = 10;
/** Se leen más filas que el tope para poder descartar duplicados antes de cortar. */
const ADDRESS_SCAN_LIMIT = 50;

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
	return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function toNumber(value: unknown): number {
	const n = Number(value);
	return Number.isFinite(n) ? n : 0;
}

function toText(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

/**
 * Líneas del pedido tal como las guardó el RPC. El total de línea replica su cálculo:
 * (precio unitario, o el de descuento si aplica, + extras) × cantidad.
 */
export function mapOrderItems(raw: unknown): MenuAccountOrderItem[] {
	if (!Array.isArray(raw)) return [];
	return raw
		.map(asRecord)
		.filter((item): item is JsonRecord => !!item && item.is_extra !== true && !!toText(item.name))
		.map((item) => {
			const quantity = toNumber(item.quantity) > 0 ? toNumber(item.quantity) : 1;
			const discounted = item.has_discount === true && item.discount_price != null;
			const unitPrice = toNumber(discounted ? item.discount_price : item.price);
			const extras = (Array.isArray(item.extras) ? item.extras : [])
				.map(asRecord)
				.filter((extra): extra is JsonRecord => !!extra && !!toText(extra.name))
				.map((extra) => ({
					id: toText(extra.id) || null,
					name: toText(extra.name),
					quantity: toNumber(extra.qty ?? extra.quantity) || 1,
					price: toNumber(extra.price),
				}));
			const extrasPerUnit =
				item.extras_total != null
					? toNumber(item.extras_total)
					: extras.reduce((sum, extra) => sum + extra.price * extra.quantity, 0);
			return {
				productId: toText(item.id) || null,
				name: toText(item.name),
				quantity,
				unitPrice,
				extras,
				note: toText(item.note) || null,
				lineTotal: (unitPrice + extrasPerUnit) * quantity,
			};
		});
}

/**
 * El RPC mete en `note` etiquetas internas (`[Sucursal: …]`, `[Envio: …]`) junto a lo
 * que escribió la persona. Solo se devuelve lo suyo.
 */
export function cleanOrderNote(raw: string | null | undefined): string | null {
	const text = String(raw ?? "")
		.split("\n")
		.map((line) => line.replace(/\[[^\]]*\]/g, "").trim())
		.filter(Boolean)
		.join("\n");
	return text || null;
}

function mapDelivery(raw: unknown): MenuAccountOrder["delivery"] {
	const address = asRecord(raw);
	if (!address) return null;
	const line = toText(address.address) || toText(address.formatted_address) || toText(address.line1);
	return {
		address: line.replace(/^[\s,]+/, ""),
		reference: toText(address.reference),
	};
}

/**
 * Historial de la cuenta. Filtra por `client_id` Y `company_id`: el `client_id` sale
 * de la sesión, pero el filtro por negocio es la segunda barrera si alguna vez una
 * ficha quedara mal vinculada.
 */
export async function listMenuAccountOrders(
	account: MenuClientAccountRow,
	/** El carrito solo necesita el último pedido; el historial pide el tope completo. */
	limit = ORDER_HISTORY_LIMIT,
): Promise<MenuAccountOrder[]> {
	if (!account.client_id) return [];

	const { data, error } = await supabaseAdmin
		.from("orders")
		.select(
			"id, shift_sequence, created_at, status, payment_status, payment_method_specific, delivery_address, delivery_fee, subtotal, discount_total, total, currency, items, note, handoff_code, branch_id",
		)
		.eq("client_id", account.client_id)
		.eq("company_id", account.company_id)
		.order("created_at", { ascending: false })
		.limit(Math.min(Math.max(1, limit), ORDER_HISTORY_LIMIT));

	if (error) {
		logger.error("menu_account_orders_failed", { message: error.message });
		throw menuAccountErrors.internal();
	}

	const rows = data ?? [];
	const branchIds = [...new Set(rows.map((row) => row.branch_id).filter(Boolean))] as string[];
	const branches = new Map<string, MenuAccountOrder["branch"]>();
	if (branchIds.length > 0) {
		const { data: branchRows } = await supabaseAdmin
			.from("branches")
			.select("id, name, address, phone")
			.in("id", branchIds)
			.eq("company_id", account.company_id);
		for (const branch of branchRows ?? []) {
			branches.set(String(branch.id), {
				name: branch.name,
				address: branch.address ?? null,
				phone: branch.phone ?? null,
			});
		}
	}

	return rows.map((row) => {
		const delivery = mapDelivery(row.delivery_address);
		return {
			id: String(row.id),
			number: row.shift_sequence != null ? String(row.shift_sequence) : String(row.id),
			createdAt: String(row.created_at),
			status: String(row.status ?? "pending"),
			paymentStatus: row.payment_status ?? null,
			fulfillment: delivery ? "delivery" : "pickup",
			total: toNumber(row.total),
			currency: row.currency ?? "CLP",
			items: mapOrderItems(row.items),
			subtotal: toNumber(row.subtotal),
			discountTotal: toNumber(row.discount_total),
			deliveryFee: toNumber(row.delivery_fee),
			paymentMethod: row.payment_method_specific ?? null,
			handoffCode: delivery ? (row.handoff_code ?? null) : null,
			branchId: row.branch_id ? String(row.branch_id) : null,
			branch: row.branch_id ? (branches.get(String(row.branch_id)) ?? null) : null,
			delivery,
			note: cleanOrderNote(row.note),
		};
	});
}

export async function listMenuAccountAddresses(
	account: MenuClientAccountRow,
): Promise<MenuAccountAddress[]> {
	if (!account.client_id) return [];

	const { data, error } = await supabaseAdmin
		.from("client_addresses")
		.select("id, address_line, reference, named_area_id, last_used_at")
		.eq("client_id", account.client_id)
		.eq("company_id", account.company_id)
		.order("last_used_at", { ascending: false, nullsFirst: false })
		.limit(ADDRESS_SCAN_LIMIT);

	if (error) {
		logger.error("menu_account_addresses_failed", { message: error.message });
		throw menuAccountErrors.internal();
	}

	const rows = data ?? [];
	const { keep, duplicateIds } = dedupeAddresses(
		rows.map((row) => ({
			id: String(row.id),
			addressLine: openPii(row.address_line) ?? "",
			reference: openPii(row.reference) ?? "",
			namedAreaId: row.named_area_id ?? null,
			lastUsedAt: row.last_used_at ?? null,
		})),
	);

	await sealPlainAddressRows(account, rows, duplicateIds);
	return keep.slice(0, ADDRESS_LIMIT);
}

function addressKey(address: MenuAccountAddress): string {
	const norm = (text: string) => text.toLowerCase().replace(/[\s,.#-]+/g, " ").trim();
	return [address.namedAreaId ?? "", norm(address.addressLine), norm(address.reference)].join("|");
}

/**
 * El RPC del pedido deduplica comparando el texto de la dirección, y con la dirección
 * guardada cifrada ya no la reconoce: inserta otra fila igual. Aquí se queda la más
 * reciente de cada dirección (las filas llegan ordenadas por uso).
 */
export function dedupeAddresses(addresses: MenuAccountAddress[]): {
	keep: MenuAccountAddress[];
	duplicateIds: string[];
} {
	const seen = new Set<string>();
	const keep: MenuAccountAddress[] = [];
	const duplicateIds: string[] = [];
	for (const address of addresses) {
		const key = addressKey(address);
		if (seen.has(key)) {
			duplicateIds.push(address.id);
			continue;
		}
		seen.add(key);
		keep.push(address);
	}
	return { keep, duplicateIds };
}

/**
 * Cifra las direcciones que el RPC del pedido dejó en claro y borra los duplicados.
 * Es mantenimiento: si falla, la lista ya está descifrada y se reintenta la próxima vez.
 */
async function sealPlainAddressRows(
	account: MenuClientAccountRow,
	rows: Array<{ id: unknown; address_line: string | null; reference: string | null }>,
	duplicateIds: string[],
): Promise<void> {
	try {
		if (duplicateIds.length > 0) {
			await supabaseAdmin
				.from("client_addresses")
				.delete()
				.in("id", duplicateIds)
				.eq("client_id", account.client_id as string)
				.eq("company_id", account.company_id);
		}

		const duplicates = new Set(duplicateIds);
		for (const row of rows) {
			const id = String(row.id);
			if (duplicates.has(id)) continue;
			const plainLine = row.address_line && !isSealedPii(row.address_line);
			const plainReference = row.reference && !isSealedPii(row.reference);
			if (!plainLine && !plainReference) continue;
			await supabaseAdmin
				.from("client_addresses")
				.update({ address_line: sealPii(row.address_line), reference: sealPii(row.reference) })
				.eq("id", id)
				.eq("client_id", account.client_id as string);
		}
	} catch (error) {
		logger.warn("menu_account_addresses_seal_failed", {
			message: error instanceof Error ? error.message : String(error),
		});
	}
}

/**
 * Guarda una dirección escrita a mano. `clientId` debe venir de
 * `ensureMenuAccountClient`: sin ficha no hay dónde colgarla.
 */
export async function addMenuAccountAddress(
	account: MenuClientAccountRow,
	clientId: string,
	input: { addressLine: string; reference: string; namedAreaId: string | null },
): Promise<MenuAccountAddress> {
	const { count } = await supabaseAdmin
		.from("client_addresses")
		.select("id", { count: "exact", head: true })
		.eq("client_id", clientId)
		.eq("company_id", account.company_id);
	if ((count ?? 0) >= ADDRESS_LIMIT) throw menuAccountErrors.addressLimit();

	const { data, error } = await supabaseAdmin
		.from("client_addresses")
		.insert({
			client_id: clientId,
			company_id: account.company_id,
			address_line: sealPii(input.addressLine),
			reference: sealPii(input.reference),
			named_area_id: input.namedAreaId,
			last_used_at: new Date().toISOString(),
		})
		.select("id, address_line, reference, named_area_id, last_used_at")
		.single();

	if (error || !data) {
		logger.error("menu_account_address_create_failed", { message: error?.message });
		throw menuAccountErrors.internal();
	}

	return {
		id: String(data.id),
		addressLine: openPii(data.address_line) ?? "",
		reference: openPii(data.reference) ?? "",
		namedAreaId: data.named_area_id ?? null,
		lastUsedAt: data.last_used_at ?? null,
	};
}

/** Borra una dirección solo si pertenece a la ficha de esta cuenta. */
export async function deleteMenuAccountAddress(
	account: MenuClientAccountRow,
	addressId: string,
): Promise<void> {
	if (!account.client_id) return;

	const { error } = await supabaseAdmin
		.from("client_addresses")
		.delete()
		.eq("id", addressId)
		.eq("client_id", account.client_id)
		.eq("company_id", account.company_id);

	if (error) {
		logger.error("menu_account_address_delete_failed", { message: error.message });
		throw menuAccountErrors.internal();
	}
}
