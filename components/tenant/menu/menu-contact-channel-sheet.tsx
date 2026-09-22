"use client";



import { memo, useEffect, useState } from "react";

import { createPortal } from "react-dom";

import { MapPin, MessageCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";



import type { BranchContactChannel } from "@/lib/tenant/menu/menu-helpers";



type MenuContactChannelSheetProps = {

	isOpen: boolean;

	channels: BranchContactChannel[];

	onClose: () => void;

	onSelectChannel: (channel: BranchContactChannel) => void;

};



const CHANNEL_KEYS: Record<BranchContactChannel, { label: string; hint: string }> = {
	whatsapp: { label: "contact.whatsapp", hint: "contact.whatsappHint" },
	instagram: { label: "contact.instagram", hint: "contact.instagramHint" },
	location: { label: "contact.location", hint: "contact.locationHint" },
};



const SHEET_CLOSE_MS = 360;



function getCloseDurationMs(): number {

	if (typeof window === "undefined") return SHEET_CLOSE_MS;

	return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : SHEET_CLOSE_MS;

}



export const MenuContactChannelSheet = memo(function MenuContactChannelSheet({

	isOpen,

	channels,

	onClose,

	onSelectChannel,

}: MenuContactChannelSheetProps) {

	const t = useTranslations("tenant.menu");
	const [portalReady, setPortalReady] = useState(false);

	const [isRendered, setIsRendered] = useState(false);

	const [isClosing, setIsClosing] = useState(false);



	useEffect(() => {

		const timer = window.setTimeout(() => setPortalReady(true), 0);

		return () => window.clearTimeout(timer);

	}, []);



	useEffect(() => {

		if (isOpen && channels.length > 0) {

			const timer = window.setTimeout(() => {

				setIsRendered(true);

				setIsClosing(false);

			}, 0);

			return () => window.clearTimeout(timer);

		}



		if (isRendered && !isOpen) {

			const timer = window.setTimeout(() => setIsClosing(true), 0);

			return () => window.clearTimeout(timer);

		}

	}, [channels.length, isOpen, isRendered]);



	useEffect(() => {

		if (!isClosing) return;



		const timer = window.setTimeout(() => {

			setIsRendered(false);

			setIsClosing(false);

		}, getCloseDurationMs());



		return () => window.clearTimeout(timer);

	}, [isClosing]);



	if (!isRendered || channels.length === 0) return null;

	if (!portalReady || typeof document === "undefined") return null;



	const handleDismiss = () => {

		if (isClosing) return;

		onClose();

	};



	const sheet = (

		<div

			className={`menu-contact-sheet-overlay${isClosing ? " menu-contact-sheet-overlay--closing" : ""}`}

			role="presentation"

			onClick={handleDismiss}

		>

			<div

				className="menu-contact-sheet"

				role="dialog"

				aria-modal="true"

				aria-label={t("contact.pickChannel")}

				onClick={(e) => e.stopPropagation()}

			>

				<div className="menu-contact-sheet__header">

					<h2>{t("contact.title")}</h2>

					<button type="button" className="menu-contact-sheet__close" onClick={handleDismiss} aria-label={t("nav.close")}>

						<X size={20} />

					</button>

				</div>

				<p className="menu-contact-sheet__subtitle">{t("contact.subtitle")}</p>

				<div className="menu-contact-sheet__actions">

					{channels.map((channel, index) => {

						const meta = CHANNEL_KEYS[channel];

						const enterDelay = 120 + index * 55;

						const exitDelay = (channels.length - 1 - index) * 45;

						return (

							<button

								key={channel}

								type="button"

								className="menu-contact-sheet__btn"

								style={{ animationDelay: `${isClosing ? exitDelay : enterDelay}ms` }}

								onClick={() => onSelectChannel(channel)}

								disabled={isClosing}

							>

								<span className="menu-contact-sheet__btn-icon" aria-hidden>

									{channel === "location" ? <MapPin size={22} /> : <MessageCircle size={22} />}

								</span>

								<span className="menu-contact-sheet__btn-text">

									<strong>{t(meta.label)}</strong>

									<span>{t(meta.hint)}</span>

								</span>

							</button>

						);

					})}

				</div>

			</div>

		</div>

	);



	const portalRoot = document.getElementById("modal-root") || document.body;

	return createPortal(sheet, portalRoot);

});



