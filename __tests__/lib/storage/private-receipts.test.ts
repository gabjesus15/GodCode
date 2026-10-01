import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	parsePrivateReceiptHref,
	paymentReferenceCompanyId,
	paymentReferencePath,
	privateReceiptHref,
	storefrontReceiptPath,
} from "@/lib/storage/private-receipts";

const FILE_ID = "11111111-1111-4111-8111-111111111111";

type StorageCall = { bucket: string; method: string; args: unknown[] };

function makeStorageMock() {
	const calls: StorageCall[] = [];
	const from = vi.fn((bucket: string) => ({
		upload: vi.fn(async (...args: unknown[]) => {
			calls.push({ bucket, method: "upload", args });
			return { data: { path: args[0] }, error: null };
		}),
		createSignedUrl: vi.fn(async (...args: unknown[]) => {
			calls.push({ bucket, method: "createSignedUrl", args });
			return { data: { signedUrl: `https://sb.example/storage/v1/object/sign/${bucket}/${args[0]}?token=t` }, error: null };
		}),
		getPublicUrl: vi.fn((path: string) => {
			calls.push({ bucket, method: "getPublicUrl", args: [path] });
			return { data: { publicUrl: `https://sb.example/storage/v1/object/public/${bucket}/${path}` } };
		}),
		remove: vi.fn(async (...args: unknown[]) => {
			calls.push({ bucket, method: "remove", args });
			return { data: null, error: null };
		}),
	}));
	return { from, calls };
}

const holder = {
	storage: makeStorageMock(),
	adminOk: false,
	customerCompanyId: null as string | null,
};

vi.mock("@/lib/infra/supabase-admin", () => ({
	get supabaseAdmin() {
		return { storage: holder.storage };
	},
}));
vi.mock("@/lib/infra/public-rate-limit", () => ({
	assertPublicRateLimit: vi.fn(async () => null),
}));
vi.mock("@/utils/admin/server-auth", () => ({
	SAAS_READ_ROLES: ["super_admin", "support"],
	SAAS_MUTATE_ROLES: ["super_admin"],
	validateAdminRolesOnServer: vi.fn(async () =>
		holder.adminOk ? { ok: true, status: 200 } : { ok: false, status: 401, error: "No autenticado" },
	),
}));
vi.mock("@/lib/tenant/customer-account-context", () => ({
	getCustomerAccountContext: vi.fn(async () =>
		holder.customerCompanyId ? { companyId: holder.customerCompanyId } : null,
	),
}));

import { POST as uploadImage } from "@/app/api/storage/upload-image/route";
import { GET as openReceipt } from "@/app/api/storage/receipt/route";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);

function uploadRequest(folder: string) {
	const form = new FormData();
	form.append("file", new File([JPEG], "comprobante.jpg", { type: "image/jpeg" }));
	form.append("folder", folder);
	return new NextRequest("http://localhost/api/storage/upload-image", { method: "POST", body: form });
}

function openRequest(path: string) {
	return new NextRequest(`http://localhost/api/storage/receipt?path=${encodeURIComponent(path)}`);
}

beforeEach(() => {
	holder.storage = makeStorageMock();
	holder.adminOk = false;
	holder.customerCompanyId = null;
});

describe("rutas de comprobantes privados", () => {
	it("solo aceptan rutas bajo platform/ con uuid y extensión de imagen", () => {
		expect(paymentReferencePath("acme-1", FILE_ID, "jpg")).toBe(`platform/payment-reference/acme-1/${FILE_ID}.jpg`);
		expect(paymentReferencePath("../otra", FILE_ID, "jpg")).toBeNull();
		expect(paymentReferencePath("", FILE_ID, "jpg")).toBeNull();
		expect(storefrontReceiptPath(FILE_ID, "gif")).toBeNull();
	});

	it("el enlace guardado vuelve a la misma ruta y rechaza cualquier otra cosa", () => {
		const path = paymentReferencePath("acme", FILE_ID, "png")!;
		expect(parsePrivateReceiptHref(privateReceiptHref(path))).toBe(path);
		expect(paymentReferenceCompanyId(path)).toBe("acme");
		expect(parsePrivateReceiptHref("https://evil.example/x.png")).toBeNull();
		expect(parsePrivateReceiptHref(`/api/storage/receipt?path=${encodeURIComponent("acme/orders/x.png")}`)).toBeNull();
		expect(parsePrivateReceiptHref(`${privateReceiptHref(path)}&path=otra`)).toBeNull();
	});
});

describe("POST /api/storage/upload-image con comprobantes", () => {
	it("payment-reference va al bucket privado bajo la empresa y devuelve el enlace a la ruta firmante", async () => {
		holder.customerCompanyId = "acme";
		const res = await uploadImage(uploadRequest("payment-reference"));
		expect(res.status).toBe(200);
		const body = await res.json();

		const upload = holder.storage.calls.find((c) => c.method === "upload")!;
		expect(upload.bucket).toBe("receipts");
		expect(String(upload.args[0])).toMatch(/^platform\/payment-reference\/acme\/[0-9a-f-]{36}\.jpg$/);
		expect(body.url).toBe(privateReceiptHref(String(upload.args[0])));
		expect(holder.storage.calls.some((c) => c.bucket === "menu")).toBe(false);
	});

	it("receipts del checkout va al bucket privado y devuelve una URL firmada, nunca pública", async () => {
		const res = await uploadImage(uploadRequest("receipts"));
		expect(res.status).toBe(200);
		const body = await res.json();

		const upload = holder.storage.calls.find((c) => c.method === "upload")!;
		expect(upload.bucket).toBe("receipts");
		expect(String(upload.args[0])).toMatch(/^platform\/storefront-receipts\//);
		expect(body.url).toContain("/object/sign/receipts/");
		expect(holder.storage.calls.some((c) => c.method === "getPublicUrl")).toBe(false);
	});

	it("las imágenes de marca siguen en el bucket público", async () => {
		holder.adminOk = true;
		const res = await uploadImage(uploadRequest("tenant"));
		expect(res.status).toBe(200);
		expect(holder.storage.calls.find((c) => c.method === "upload")!.bucket).toBe("menu");
	});
});

describe("GET /api/storage/receipt", () => {
	const ownPath = `platform/payment-reference/acme/${FILE_ID}.jpg`;

	it("sin sesión responde 404 y no firma nada", async () => {
		const res = await openReceipt(openRequest(ownPath));
		expect(res.status).toBe(404);
		expect(holder.storage.calls).toHaveLength(0);
	});

	it("el CEO de otra empresa no abre el comprobante", async () => {
		holder.customerCompanyId = "otra";
		const res = await openReceipt(openRequest(ownPath));
		expect(res.status).toBe(404);
		expect(holder.storage.calls).toHaveLength(0);
	});

	it("el CEO dueño recibe un redirect a una URL firmada corta", async () => {
		holder.customerCompanyId = "acme";
		const res = await openReceipt(openRequest(ownPath));
		expect(res.status).toBe(302);
		expect(res.headers.get("location")).toContain("/object/sign/receipts/");
		const sign = holder.storage.calls.find((c) => c.method === "createSignedUrl")!;
		expect(sign.args).toEqual([ownPath, 300]);
	});

	it("los del checkout solo los abre el equipo", async () => {
		const storefront = `platform/storefront-receipts/${FILE_ID}.png`;
		holder.customerCompanyId = "acme";
		expect((await openReceipt(openRequest(storefront))).status).toBe(404);
		holder.adminOk = true;
		expect((await openReceipt(openRequest(storefront))).status).toBe(302);
	});

	it("rechaza rutas fuera de platform/ aunque sea el equipo", async () => {
		holder.adminOk = true;
		const res = await openReceipt(openRequest("acme/orders/b1/receipts/2026/01/1/x.jpg"));
		expect(res.status).toBe(404);
		expect(holder.storage.calls).toHaveLength(0);
	});
});
