import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "."),
			// `server-only` lanza al importarse fuera de un Server Component, lo que
			// impediría testear los módulos que lo declaran. La guarda real sigue
			// activa en el build de Next.
			"server-only": path.resolve(__dirname, "__tests__/stubs/server-only.ts"),
		},
	},
	test: {
		environment: "node",
		include: ["__tests__/**/*.test.ts"],
		coverage: {
			include: ["lib/**/*.ts"],
			exclude: ["lib/onboarding/emails.ts"],
		},
	},
});
