"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

// Misma paleta que la 404 (components/brand/illustrated-404.tsx).
const TEXT = "#4A3E1E";
const MUTED = "#8A7A48";

/**
 * Error en una sección sin página de error propia: la landing, el alta, Labs o el layout de una
 * tienda (si la base no respondió al buscar el local). «Intentar de nuevo» vuelve a pedir los
 * datos al servidor (`unstable_retry`). Sin esta página se veía la pantalla genérica de Next.
 */
export default function AppError({
	error,
	unstable_retry,
}: {
	error: Error & { digest?: string };
	unstable_retry: () => void;
}) {
	const t = useTranslations("common.errorPage");

	useEffect(() => {
		console.error("page error:", error);
	}, [error]);

	return (
		<main
			className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center"
			style={{ background: "#ffffff" }}
		>
			{/* Si falló el layout de una tienda, su metadata tampoco llegó: la pestaña quedaba sin título. */}
			<title>{t("title")}</title>
			<h1
				className="font-serif text-xl font-bold leading-snug sm:text-2xl md:text-3xl"
				style={{ color: TEXT, maxWidth: "34rem" }}
			>
				{t("title")}
			</h1>
			<p className="mt-2 max-w-xs text-sm leading-relaxed text-pretty sm:max-w-sm" style={{ color: MUTED }}>
				{t("body")}
			</p>
			<button
				type="button"
				onClick={() => unstable_retry()}
				className="mt-10 inline-flex items-center justify-center rounded-full text-sm font-semibold shadow-sm transition-all hover:shadow-md hover:brightness-110 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
				style={{ background: TEXT, color: "#ffffff", padding: "0.875rem 2.5rem", letterSpacing: "0.03em", whiteSpace: "nowrap" }}
			>
				{t("retry")}
			</button>
		</main>
	);
}
