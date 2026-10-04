import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { isOrderReceiptPath, orderReceiptPath } from "@/lib/storage/private-receipts";

import { makeAdminMock } from "../menu-account/test-supabase-mock";

type StorageCall = { bucket: string; method: string; args: unknown[] };

function makeStorageMock() {
	const calls: StorageCall[] = [];
	const from = vi.fn((bucket: string) => ({
		upload: vi.fn(async (...args: unknown[]) => {
			calls.push({ bucket, method: "upload", args });
			return { data: { path: args[0] }, error: null };
		}),
		remove: vi.fn(async (...args: unknown[]) => {
			calls.push({ bucket, method: "remove", args });
			return { data: null, error: null };
		}),
	}));
	return { from, calls };
}

const holder = {
	admin: makeAdminMock({ tables: {} }),
	storage: makeStorageMock(),
};

vi.mock("@/lib/infra/supabase-admin", () => ({
	get supabaseAdmin() {
		return { from: holder.admin.from, storage: holder.storage };
	},
}));
vi.mock("@/lib/infra/public-rate-limit", () => ({
	assertPublicRateLimit: vi.fn(async () => null),
}));

import { POST } from "@/app/api/tenant/public-order-receipt/route";

const COMPANY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BRANCH = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TOKEN = "22222222-2222-4222-8222-222222222222";
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);

function pendingOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: 101,
		company_id: COMPANY,
		branch_id: BRANCH,
		status: "pending",
		created_at: new Date().toISOString(),
		payment_ref: null,
		...overrides,
	};
}

/** Cola de `orders`: primero la lectura del pedido, después el UPDATE que lo adjunta. */
function setDb(orders: unknown[]) {
	holder.admin = makeAdminMock({ tables: { orders } });
}

async function post(
	fields: Record<string, string | null> = {},
	options: { bytes?: Uint8Array<ArrayBuffer>; contentLength?: string | null } = {},
) {
	const form = new FormData();
	form.append("file", new File([options.bytes ?? JPEG], "comprobante.jpg", { type: "image/jpeg" }));
	const values: Record<string, string | null> = { orderId: "101", clientRequestId: TOKEN, ...fields };
	for (const [key, value] of Object.entries(values)) {
		if (value !== null) form.append(key, value);
	}
	// Serializa el multipart como lo haría el navegador, con su Content-Length.
	const encoded = new Response(form);
	const body = new Uint8Array(await encoded.arrayBuffer());
	const headers = new Headers({ "content-type": encoded.headers.get("content-type") ?? "" });
	const contentLength = options.contentLength === undefined ? String(body.byteLength) : options.contentLength;
	if (contentLength !== null) headers.set("content-length", contentLength);
	return POST(new NextRequest("http://localhost/api/tenant/public-order-receipt", { method: "POST", body, headers }));
}

beforeEach(() => {
	holder.storage = makeStorageMock();
	setDb([{ data: pendingOrder(), error: null }, { data: [{ id: 101 }], error: null }]);
});

describe("rutas de comprobantes de pedido", () => {
	it("cuelgan de la carpeta de la empresa, como los que sube la caja", () => {
		const path = orderReceiptPath({
			companyId: COMPANY,
			branchId: BRANCH,
			orderId: 101,
			fileId: TOKEN,
			extension: "jpg",
			now: new Date(Date.UTC(2026, 9, 4)),
		});
		expect(path).toBe(`${COMPANY}/orders/${BRANCH}/receipts/2026/10/101/${TOKEN}.jpg`);
		expect(isOrderReceiptPath(path, COMPANY)).toBe(true);
		expect(isOrderReceiptPath(path, BRANCH)).toBe(false);
		expect(isOrderReceiptPath("REF-123", COMPANY)).toBe(false);
	});

	it("no aceptan empresa, sucursal o pedido con otra forma", () => {
		const base = { branchId: BRANCH, orderId: 1, fileId: TOKEN, extension: "jpg" };
		expect(orderReceiptPath({ ...base, companyId: "../otra" })).toBeNull();
		expect(orderReceiptPath({ ...base, companyId: "acme" })).toBeNull();
		expect(orderReceiptPath({ ...base, companyId: COMPANY, orderId: "1; drop" })).toBeNull();
		expect(orderReceiptPath({ ...base, companyId: COMPANY, extension: "gif" })).toBeNull();
	});
});

/**
 * El comprobante se adjunta al pedido recién creado con el client_request_id del
 * navegador como credencial, y va al bucket privado bajo la empresa: la caja lo
 * encuentra en `orders.payment_ref` igual que los comprobantes que sube ella misma.
 */
describe("POST /api/tenant/public-order-receipt", () => {
	it("sin client_request_id no toca la base", async () => {
		const res = await post({ clientRequestId: null });
		expect(res.status).toBe(400);
		expect(holder.admin.from).not.toHaveBeenCalled();
		expect(holder.storage.calls).toHaveLength(0);
	});

	it("busca el pedido por id y client_request_id; uno ajeno no se encuentra y no sube nada", async () => {
		setDb([{ data: null, error: null }]);
		const res = await post();
		expect(res.status).toBe(404);
		const lookup = holder.admin.chains[0].chain;
		expect(lookup.eq).toHaveBeenCalledWith("id", "101");
		expect(lookup.eq).toHaveBeenCalledWith("client_request_id", TOKEN);
		expect(holder.storage.calls).toHaveLength(0);
	});

	it("guarda el comprobante en el bucket privado bajo la empresa y lo deja en payment_ref", async () => {
		const res = await post();
		expect(res.status).toBe(200);
		const body = (await res.json()) as { path: string; status: string };
		expect(body.status).toBe("uploaded");

		const upload = holder.storage.calls.find((c) => c.method === "upload")!;
		expect(upload.bucket).toBe("receipts");
		expect(String(upload.args[0])).toMatch(
			new RegExp(`^${COMPANY}/orders/${BRANCH}/receipts/\\d{4}/\\d{2}/101/[0-9a-f-]{36}\\.jpg$`),
		);
		expect(upload.args[2]).toMatchObject({ contentType: "image/jpeg" });
		expect(body.path).toBe(upload.args[0]);

		const update = holder.admin.chains[1].chain;
		expect(update.update).toHaveBeenCalledWith({ payment_ref: body.path });
		expect(update.eq).toHaveBeenCalledWith("id", "101");
		expect(update.eq).toHaveBeenCalledWith("client_request_id", TOKEN);
		expect(update.is).toHaveBeenCalledWith("payment_ref", null);
	});

	it("guarda con el tipo detectado, no con el declarado", async () => {
		const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
		const res = await post({}, { bytes: png });
		expect(res.status).toBe(200);
		const upload = holder.storage.calls.find((c) => c.method === "upload")!;
		expect(String(upload.args[0])).toMatch(/\.png$/);
		expect(upload.args[2]).toMatchObject({ contentType: "image/png" });
	});

	it("no admite comprobante en un pedido que ya avanzó o es viejo", async () => {
		setDb([{ data: pendingOrder({ status: "preparing" }), error: null }]);
		expect((await post()).status).toBe(400);
		setDb([{ data: pendingOrder({ created_at: new Date(Date.now() - 60 * 60_000).toISOString() }), error: null }]);
		expect((await post()).status).toBe(400);
		expect(holder.storage.calls).toHaveLength(0);
	});

	it("un reintento del mismo pedido no sube otro archivo", async () => {
		const existing = `${COMPANY}/orders/${BRANCH}/receipts/2026/10/101/${TOKEN}.png`;
		setDb([{ data: pendingOrder({ payment_ref: existing }), error: null }]);
		const res = await post();
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ path: existing, idempotentReplay: true });
		expect(holder.storage.calls).toHaveLength(0);
	});

	it("no pisa una referencia que no es nuestra", async () => {
		setDb([{ data: pendingOrder({ payment_ref: "REF-123" }), error: null }]);
		expect((await post()).status).toBe(409);
		expect(holder.storage.calls).toHaveLength(0);
	});

	it("rechaza lo que no es una imagen, lo que declara pesar de más y lo que no declara tamaño", async () => {
		const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
		expect((await post({}, { bytes: html })).status).toBe(400);
		expect(holder.storage.calls).toHaveLength(0);

		const heavy = await post({}, { contentLength: String(10 * 1024 * 1024) });
		expect(heavy.status).toBe(413);
		expect((await post({}, { contentLength: null })).status).toBe(411);
	});

	it("si otro intento lo adjuntó primero, borra el archivo subido", async () => {
		setDb([{ data: pendingOrder(), error: null }, { data: [], error: null }]);
		const res = await post();
		expect(res.status).toBe(409);
		expect(holder.storage.calls.map((c) => c.method)).toEqual(["upload", "remove"]);
	});

	it("si la base falla al adjuntar, borra el archivo y no devuelve el detalle", async () => {
		setDb([
			{ data: pendingOrder(), error: null },
			{ data: null, error: { message: 'column "payment_ref" of relation secreta' } },
		]);
		const res = await post();
		expect(res.status).toBe(500);
		expect(JSON.stringify(await res.json())).not.toContain("secreta");
		expect(holder.storage.calls.map((c) => c.method)).toEqual(["upload", "remove"]);
	});
});
