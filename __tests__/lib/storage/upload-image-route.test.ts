import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { sniffImageType } from "@/lib/storage/image-file";
import {
	parsePrivateReceiptHref,
	paymentReferenceCompanyId,
	paymentReferencePath,
	privateReceiptHref,
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

async function uploadRequest(
	folder: string,
	options: { bytes?: Uint8Array<ArrayBuffer>; type?: string; inQuery?: boolean; contentLength?: string | null } = {},
) {
	const form = new FormData();
	form.append("file", new File([options.bytes ?? JPEG], "comprobante.jpg", { type: options.type ?? "image/jpeg" }));
	form.append("folder", folder);
	// Serializa el multipart como lo haría el navegador, con su Content-Length.
	const encoded = new Response(form);
	const body = new Uint8Array(await encoded.arrayBuffer());
	const headers = new Headers({ "content-type": encoded.headers.get("content-type") ?? "" });
	const contentLength = options.contentLength === undefined ? String(body.byteLength) : options.contentLength;
	if (contentLength !== null) headers.set("content-length", contentLength);
	const query = options.inQuery === false ? "" : `?folder=${encodeURIComponent(folder)}`;
	return new NextRequest(`http://localhost/api/storage/upload-image${query}`, { method: "POST", body, headers });
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
		expect(paymentReferencePath("acme", FILE_ID, "gif")).toBeNull();
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
		const res = await uploadImage(await uploadRequest("payment-reference"));
		expect(res.status).toBe(200);
		const body = await res.json();

		const upload = holder.storage.calls.find((c) => c.method === "upload")!;
		expect(upload.bucket).toBe("receipts");
		expect(String(upload.args[0])).toMatch(/^platform\/payment-reference\/acme\/[0-9a-f-]{36}\.jpg$/);
		expect(body.url).toBe(privateReceiptHref(String(upload.args[0])));
		expect(holder.storage.calls.some((c) => c.bucket === "menu")).toBe(false);
	});

	it("el comprobante del checkout ya no entra por aquí: va con su pedido a public-order-receipt", async () => {
		const res = await uploadImage(await uploadRequest("receipts"));
		expect(res.status).toBe(400);
		expect(holder.storage.calls).toHaveLength(0);
	});

	it("las imágenes de marca siguen en el bucket público", async () => {
		holder.adminOk = true;
		const res = await uploadImage(await uploadRequest("tenant"));
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

	it("rechaza rutas fuera de platform/ aunque sea el equipo: los de pedidos los abre la caja", async () => {
		holder.adminOk = true;
		const res = await openReceipt(openRequest("acme/orders/b1/receipts/2026/01/1/x.jpg"));
		expect(res.status).toBe(404);
		expect(holder.storage.calls).toHaveLength(0);
	});
});

describe("POST /api/storage/upload-image antes de leer el cuerpo", () => {
	it("rechaza sin leer nada lo que declara pesar más que el máximo", async () => {
		const req = await uploadRequest("onboarding", { contentLength: String(10 * 1024 * 1024) });
		const formData = vi.spyOn(req, "formData");
		const res = await uploadImage(req);
		expect(res.status).toBe(413);
		expect(formData).not.toHaveBeenCalled();
	});

	it("exige Content-Length", async () => {
		const res = await uploadImage(await uploadRequest("onboarding", { contentLength: null }));
		expect(res.status).toBe(411);
	});

	it("con la carpeta en la URL autoriza antes de leer el cuerpo", async () => {
		const req = await uploadRequest("tenant");
		const formData = vi.spyOn(req, "formData");
		const res = await uploadImage(req);
		expect(res.status).toBe(401);
		expect(formData).not.toHaveBeenCalled();
	});

	it("rechaza que el formulario contradiga la carpeta de la URL", async () => {
		holder.customerCompanyId = "acme";
		const req = await uploadRequest("tenant");
		const url = new URL(req.url);
		url.searchParams.set("folder", "payment-reference");
		const res = await uploadImage(new NextRequest(url, { method: "POST", body: await req.arrayBuffer(), headers: req.headers }));
		expect(res.status).toBe(400);
		expect(holder.storage.calls).toHaveLength(0);
	});

	it("un cliente viejo sin carpeta en la URL sigue funcionando", async () => {
		const res = await uploadImage(await uploadRequest("onboarding", { inQuery: false }));
		expect(res.status).toBe(200);
	});
});

describe("POST /api/storage/upload-image y el tipo real del archivo", () => {
	it("rechaza un archivo que dice ser JPEG pero no lo es", async () => {
		const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
		const res = await uploadImage(await uploadRequest("onboarding", { bytes: html }));
		expect(res.status).toBe(400);
		expect(holder.storage.calls).toHaveLength(0);
	});

	it("guarda con el tipo detectado, no con el declarado", async () => {
		const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
		const res = await uploadImage(await uploadRequest("onboarding", { bytes: png, type: "image/jpeg" }));
		expect(res.status).toBe(200);
		const upload = holder.storage.calls.find((c) => c.method === "upload")!;
		expect(String(upload.args[0])).toMatch(/\.png$/);
		expect(upload.args[2]).toMatchObject({ contentType: "image/png" });
	});
});

describe("sniffImageType", () => {
	it("reconoce JPEG, PNG y WebP por su firma", () => {
		expect(sniffImageType(JPEG)).toBe("image/jpeg");
		expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
		const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");
		expect(sniffImageType(webp)).toBe("image/webp");
		expect(sniffImageType(new TextEncoder().encode("GIF89a"))).toBeNull();
		expect(sniffImageType(new Uint8Array())).toBeNull();
	});
});
