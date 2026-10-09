import type { NextConfig } from "next";
import { resolve } from "path";

const monorepoRoot = resolve(__dirname, "../..");

const nextConfig: NextConfig = {
	// Solo en la imagen Docker (Coolify); en Vercel el build sigue igual.
	...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" as const } : {}),
	// Alineado con Vercel/monorepo: Turbopack y NFT ven la raíz del repo.
	turbopack: {
		root: monorepoRoot,
	},
	outputFileTracingRoot: monorepoRoot,
	// APIs importan `lib/` fuera de este paquete; sin esto el deploy puede romper en runtime (MODULE_NOT_FOUND).
	outputFileTracingIncludes: {
		"/api/**": ["../../lib/**/*"],
	},
};

export default nextConfig;
