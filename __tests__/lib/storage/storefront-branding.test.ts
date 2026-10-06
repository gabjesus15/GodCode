import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createSignedUrl = vi.fn();

vi.mock("@/lib/infra/supabase-admin", () => ({
	supabaseAdmin: { storage: { from: () => ({ createSignedUrl }) } },
}));

import {
	resolveStorefrontAssetPublicUrl,
	resolveStorefrontThemeAssets,
} from "@/lib/storage/storefront-branding";

const COMPANY = "c0ffee00-1111-2222-3333-444455556666";
const ORIGINAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

describe("resolveStorefrontAssetPublicUrl", () => {
	beforeEach(() => {
		process.env.NEXT_PUBLIC_SUPABASE_URL = "https://db.example.com/";
		createSignedUrl.mockReset();
	});

	afterEach(() => {
		process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_URL;
	});

	it("construye la URL pública del bucket menu sin llamar a Storage", () => {
		expect(resolveStorefrontAssetPublicUrl(`${COMPANY}/storefront/branding/logo/a b.png`, COMPANY)).toBe(
			`https://db.example.com/storage/v1/object/public/menu/${COMPANY}/storefront/branding/logo/a%20b.png`,
		);
		expect(createSignedUrl).not.toHaveBeenCalled();
	});

	it("deja tal cual las URLs externas y las rutas absolutas", () => {
		expect(resolveStorefrontAssetPublicUrl("https://cdn.example.com/logo.png", COMPANY)).toBe(
			"https://cdn.example.com/logo.png",
		);
		expect(resolveStorefrontAssetPublicUrl("/tenant/logo-placeholder.svg", COMPANY)).toBe(
			"/tenant/logo-placeholder.svg",
		);
	});

	it("rechaza rutas de otra empresa, fuera de branding o vacías", () => {
		expect(resolveStorefrontAssetPublicUrl(`otra/storefront/branding/logo/x.png`, COMPANY)).toBe("");
		expect(resolveStorefrontAssetPublicUrl(`${COMPANY}/receipts/x.png`, COMPANY)).toBe("");
		expect(resolveStorefrontAssetPublicUrl(`${COMPANY}/storefront/branding/../x.png`, COMPANY)).toBe("");
		expect(resolveStorefrontAssetPublicUrl("", COMPANY)).toBe("");
		expect(resolveStorefrontAssetPublicUrl(null, COMPANY)).toBe("");
	});

	it("el tema de la tienda sale con URLs públicas y estables", async () => {
		const path = `${COMPANY}/storefront/branding/background/fondo.webp`;
		const first = await resolveStorefrontThemeAssets({ logoUrl: "", backgroundImageUrl: path } as never, COMPANY);
		const second = await resolveStorefrontThemeAssets({ logoUrl: "", backgroundImageUrl: path } as never, COMPANY);
		expect(first.backgroundImageUrl).toBe(`https://db.example.com/storage/v1/object/public/menu/${path}`);
		expect(second.backgroundImageUrl).toBe(first.backgroundImageUrl);
		expect(createSignedUrl).not.toHaveBeenCalled();
	});
});
