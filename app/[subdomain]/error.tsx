"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { CloudOff } from "lucide-react";

/**
 * Error al cargar la portada, el menú o Mi cuenta de una tienda (la base no respondió, por
 * ejemplo). Se pinta dentro del layout de la tienda, con sus colores y en su idioma. «Intentar
 * de nuevo» vuelve a pedir los datos al servidor (`unstable_retry`); `reset()` solo repintaría
 * lo que ya falló. Sin esta página, el cliente veía la pantalla genérica de Next.
 */
export default function TenantPageError({
	error,
	unstable_retry,
}: {
	error: Error & { digest?: string };
	unstable_retry: () => void;
}) {
	const t = useTranslations("common.errorPage");

	useEffect(() => {
		console.error("tenant page error:", error);
	}, [error]);

	return (
		<main className="tenant-error">
			<div className="tenant-error-card">
				<span className="tenant-error-glyph" aria-hidden>
					<CloudOff size={26} strokeWidth={1.8} />
				</span>
				<h1 className="tenant-error-title">{t("title")}</h1>
				<p className="tenant-error-text">{t("body")}</p>
				<button type="button" className="tenant-error-action" onClick={() => unstable_retry()}>
					{t("retry")}
				</button>
			</div>
		</main>
	);
}
