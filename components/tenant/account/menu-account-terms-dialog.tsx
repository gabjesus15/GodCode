"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import { getTenantScopedPath } from "../utils/tenant-route";

import { MENU_ACCOUNT_TERMS_UPDATED_AT, MenuAccountTermsContent } from "./menu-account-terms-content";

type MenuAccountTermsDialogProps = {
	open: boolean;
	onClose: () => void;
	/** Solo en el registro: acepta y cierra de un toque. */
	onAccept?: () => void;
};

/**
 * Los términos sin salir del formulario. `<dialog>` nativo: el navegador ya se
 * encarga de atrapar el foco, cerrar con Escape y devolver el foco al cerrar.
 */
export function MenuAccountTermsDialog({ open, onClose, onAccept }: MenuAccountTermsDialogProps) {
	const t = useTranslations("tenant.account.terms");
	const pathname = usePathname();
	const termsPath = useMemo(() => getTenantScopedPath(pathname ?? "/", "/mi-cuenta/terminos"), [pathname]);
	const dialogRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	}, [open]);

	return (
		<dialog
			ref={dialogRef}
			className="account-terms-dialog"
			aria-labelledby="account-terms-dialog-title"
			onClose={onClose}
			// Tocar fuera del panel (el backdrop es el propio <dialog>) lo cierra.
			onClick={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<div className="account-terms-dialog__panel">
				<header className="account-terms-dialog__head">
					<div>
						<h2 id="account-terms-dialog-title" className="account-terms-dialog__title">
							{t("title")}
						</h2>
						<p className="account-terms-updated">{t("updated", { date: MENU_ACCOUNT_TERMS_UPDATED_AT })}</p>
					</div>
					<button type="button" className="account-icon-button" onClick={onClose} aria-label={t("close")}>
						<X size={18} aria-hidden />
					</button>
				</header>

				<div className="account-terms-dialog__body">
					<MenuAccountTermsContent />
				</div>

				<footer className="account-terms-dialog__foot">
					<Link href={termsPath} className="account-link-button" target="_blank" rel="noopener">
						{t("openPage")}
					</Link>
					{onAccept ? (
						<button type="button" className="account-button" onClick={onAccept}>
							{t("accept")}
						</button>
					) : (
						<button type="button" className="account-button account-button--ghost" onClick={onClose}>
							{t("close")}
						</button>
					)}
				</footer>
			</div>
		</dialog>
	);
}
