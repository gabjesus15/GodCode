import { defineConfig, devices } from "@playwright/test";

const baseURL = (process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
/** Ruta sin SSR a Supabase: el readiness de webServer no debe depender de la home. */
const webServerReadyURL = `${baseURL}/login`;

export default defineConfig({
	testDir: "e2e",
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: "list",
	use: {
		baseURL,
		trace: "on-first-retry",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: process.env.CI
		? {
				command: "npm run build && npm run start",
				url: webServerReadyURL,
				timeout: 180_000,
				reuseExistingServer: true,
			}
		: {
				command: "npm run build && npm run start",
				url: webServerReadyURL,
				timeout: 180_000,
				reuseExistingServer: true,
			},
});
