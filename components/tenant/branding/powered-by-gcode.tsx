"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { LANDING_BRAND_NAME } from "@/lib/landing/brand";
import {
	buildPoweredByHref,
	type PoweredBySurface,
} from "@/lib/tenant/powered-by";

type PoweredByGcodeProps = {
	tenantSlug?: string | null;
	surface?: PoweredBySurface;
	/** Si false, solo texto (útil cuando la misma vista ya muestra el logo). */
	showMark?: boolean;
};

/**
 * Crédito discreto al pie del storefront.
 * Usa tokens del tema del tenant para no pelear con dark/light.
 */
export function PoweredByGcode({
	tenantSlug = null,
	surface = "menu",
	showMark,
}: PoweredByGcodeProps) {
	const t = useTranslations("tenant.menu");
	const href = buildPoweredByHref({ tenantSlug, surface });
	// En home ya está el logo en "REGISTRAR MI NEGOCIO".
	const withMark = showMark ?? surface !== "home";

	return (
		<a
			href={href}
			className={`powered-by-gcode powered-by-gcode--${surface}`}
			rel="noopener noreferrer"
			/* WCAG 2.5.3 (etiqueta en el nombre): el nombre accesible debe contener el
			   texto visible. Decia solo "Gcode: menú digital…" mientras en pantalla
			   pone "Hecho con Gcode", asi que quien navega por voz no podia activarlo
			   leyendo lo que veia. */
			aria-label={t("poweredBy.aria", { brand: LANDING_BRAND_NAME })}
		>
			<span className="powered-by-gcode__label">{t("poweredBy.madeWith")}</span>
			<span className="powered-by-gcode__brand">
				{withMark ? (
					<Image
						src="/favicon-32.png"
						alt=""
						width={14}
						height={14}
						className="powered-by-gcode__mark"
					/>
				) : null}
				{LANDING_BRAND_NAME}
			</span>
		</a>
	);
}
