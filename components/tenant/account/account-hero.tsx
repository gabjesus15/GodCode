"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronLeft, Moon, Sun } from "lucide-react";

import type { AccountScheme } from "./use-account-scheme";

export type AccountHeroChrome = {
	businessName: string;
	/** Ruta del menú público, ya con el prefijo del tenant. */
	menuPath: string;
	scheme: AccountScheme;
	onToggleScheme: () => void;
};

type AccountHeroProps = AccountHeroChrome & {
	/** Destino de la flecha si no es el menú (los términos vuelven a la cuenta). */
	back?: { href: string; label: string; ariaLabel: string };
	children: ReactNode;
};

/**
 * Cabecera de "Mi cuenta" con el color del local: volver al menú, nombre del negocio,
 * el cambio claro/oscuro y, debajo, el contenido de cada pantalla (saludo o título).
 */
export function AccountHero({ businessName, menuPath, scheme, onToggleScheme, back, children }: AccountHeroProps) {
	const t = useTranslations("tenant.account");
	return (
		<header className="account-hero">
			<div className="account-hero-inner">
				<div className="account-hero-top">
					<Link href={back?.href ?? menuPath} className="account-hero-back" aria-label={back?.ariaLabel ?? t("back")}>
						<ChevronLeft size={18} aria-hidden />
						<span>{back?.label ?? t("hero.back")}</span>
					</Link>
					<span className="account-hero-business">{businessName}</span>
					<button
						type="button"
						className="account-hero-scheme"
						onClick={onToggleScheme}
						aria-label={t(scheme === "light" ? "scheme.toDark" : "scheme.toLight")}
						title={t(scheme === "light" ? "scheme.toDark" : "scheme.toLight")}
					>
						{scheme === "light" ? <Moon size={18} aria-hidden /> : <Sun size={18} aria-hidden />}
					</button>
				</div>
				{children}
			</div>
		</header>
	);
}

/** Iniciales para el avatar: primera letra de las dos primeras palabras. */
export function initialsOf(name: string): string {
	const words = name.trim().split(/\s+/).filter(Boolean);
	return words
		.slice(0, 2)
		.map((word) => word[0]?.toUpperCase() ?? "")
		.join("");
}

/** Avatar redondo: logo del local si lo hay, si no las iniciales. */
export function AccountAvatar({ label, imageUrl = null }: { label: string; imageUrl?: string | null }) {
	return (
		<span className="account-avatar" aria-hidden>
			{imageUrl ? (
				<Image src={imageUrl} alt="" width={64} height={64} unoptimized />
			) : (
				label
			)}
		</span>
	);
}
