import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchTenantLogo, sniffRasterType } from "@/lib/tenant/favicon-icon";

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46]);
const bytes = (text: string) => new TextEncoder().encode(text);

describe("sniffRasterType", () => {
	it("reconoce los mapas de bits por sus primeros bytes", () => {
		expect(sniffRasterType(PNG)).toBe("image/png");
		expect(sniffRasterType(JPEG)).toBe("image/jpeg");
		expect(sniffRasterType(bytes("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
		expect(sniffRasterType(bytes("GIF89a......"))).toBe("image/gif");
		expect(sniffRasterType(bytes("\0\0\0\x1cftypavif\0\0"))).toBe("image/avif");
		expect(sniffRasterType(Uint8Array.from([0, 0, 1, 0, 1, 0]))).toBe("image/x-icon");
	});

	it("no deja pasar un SVG ni un HTML", () => {
		expect(sniffRasterType(bytes('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))).toBeNull();
		expect(sniffRasterType(bytes("<!doctype html><html></html>"))).toBeNull();
		expect(sniffRasterType(new Uint8Array())).toBeNull();
	});
});

describe("fetchTenantLogo", () => {
	afterEach(() => vi.unstubAllGlobals());

	const serve = (body: Uint8Array<ArrayBuffer>, contentType: string | null) =>
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(body, { status: 200, headers: contentType ? { "content-type": contentType } : {} })),
		);
	const URL_LOGO = "https://storage.example.com/storage/v1/object/public/menu/logo.png";

	it("acepta un PNG que el Storage sirve como application/octet-stream (archivos migrados)", async () => {
		serve(PNG, "application/octet-stream");
		expect(await fetchTenantLogo(URL_LOGO)).toMatchObject({ contentType: "image/png" });
	});

	it("con un tipo de imagen declarado, lo respeta", async () => {
		serve(JPEG, "image/jpeg");
		expect(await fetchTenantLogo(URL_LOGO)).toMatchObject({ contentType: "image/jpeg" });
	});

	it("rechaza un HTML sin tipo y un SVG aunque declare imagen", async () => {
		serve(bytes("<!doctype html><title>no</title>"), "application/octet-stream");
		expect(await fetchTenantLogo(URL_LOGO)).toBeNull();
		serve(bytes("<svg></svg>"), "image/svg+xml");
		expect(await fetchTenantLogo(URL_LOGO)).toBeNull();
		serve(bytes("<html></html>"), "text/html");
		expect(await fetchTenantLogo(URL_LOGO)).toBeNull();
	});
});
