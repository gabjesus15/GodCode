import type { NextConfig } from "next";
import { resolve } from "path";

const nextConfig: NextConfig = {
	// Misma raíz que el monorepo y que outputFileTracingRoot en Vercel (evita warning y mezcla de roots).
	turbopack: {
		root: resolve(__dirname, "../.."),
	},
};

export default nextConfig;
