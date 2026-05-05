import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
	test("robots.txt responde", async ({ page }) => {
		const res = await page.goto("/robots.txt");
		expect(res?.ok()).toBeTruthy();
	});

	test("página de login responde", async ({ page }) => {
		await page.goto("/login");
		await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible({ timeout: 15_000 });
		await expect(page.getByRole("button", { name: /entrar/i })).toBeVisible({ timeout: 15_000 });
	});

	test("onboarding público responde", async ({ page }) => {
		await page.goto("/onboarding");
		await expect(page.locator("main h1").first()).toBeVisible({ timeout: 15_000 });
		await expect(page.getByRole("textbox").first()).toBeVisible({ timeout: 15_000 });
	});

	test("saas admin protegido redirige a login", async ({ page }) => {
		await page.goto("/companies");
		await expect(page).toHaveURL(/\/login/i, { timeout: 15_000 });
		await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible({ timeout: 15_000 });
	});

	test("saas admin autenticado carga empresas", async ({ page }) => {
		const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL?.trim();
		const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD?.trim();
		if (!adminEmail || !adminPassword) {
			test.skip();
			return;
		}

		await page.goto("/login");
		await page.getByRole("textbox", { name: /email/i }).fill(adminEmail);
		await page.getByRole("textbox", { name: /password/i }).fill(adminPassword);
		await page.keyboard.press("Enter");
		await expect(page.getByText(/acceso concedido|redirigiendo/i)).toBeVisible({ timeout: 20_000 });
		await page.goto("/companies");
		await expect(page.getByRole("heading", { name: /empresas/i })).toBeVisible({ timeout: 20_000 });
	});

	test("ruta menú tenant responde (slug inexistente → tienda no disponible)", async ({ page }) => {
		await page.goto("/__e2e_no_such_tenant__/menu");
		await expect(page.getByRole("heading", { name: /tienda no disponible/i })).toBeVisible({
			timeout: 15_000,
		});
	});

	test("menú tenant con slug opcional (PLAYWRIGHT_TENANT_SLUG)", async ({ page }) => {
		const slug = process.env.PLAYWRIGHT_TENANT_SLUG?.trim();
		if (!slug) {
			test.skip();
			return;
		}
		await page.goto(`/${slug}/menu`);
		await expect(
			page.getByText("Tienda no disponible").or(page.getByText("Total:", { exact: false })),
		).toBeVisible({ timeout: 20_000 });
	});
});
