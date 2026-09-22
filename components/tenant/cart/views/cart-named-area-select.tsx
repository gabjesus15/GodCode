"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import type { DeliveryNamedArea } from "@/lib/delivery/delivery-settings";

/** Listbox propio: el `<select>` nativo no permite teñir el resaltado del sistema. */
export function CartNamedAreaSelect({
	areas,
	value,
	onPick,
	formatMoney,
	currency = "CLP",
}: {
	areas: DeliveryNamedArea[];
	value: string | null;
	onPick: (id: string | null) => void;
	formatMoney: (amount: number, currency?: string) => string;
	currency?: string;
}) {
	const t = useTranslations("tenant.cart.modal");
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const onDocument = (event: MouseEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
		};
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};
		document.addEventListener("mousedown", onDocument);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDocument);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	const selected = value ? areas.find((area) => area.id === value) : undefined;
	const optionLabel = (area: DeliveryNamedArea) => `${area.name} — ${formatMoney(area.feeFlat, currency)}`;

	return (
		<div className={clsx("cart-select", open && "is-open")} ref={rootRef}>
			<button
				type="button"
				className="cart-field cart-select__trigger"
				aria-labelledby="cart-named-area-label"
				aria-haspopup="listbox"
				aria-expanded={open}
				onClick={() => setOpen((current) => !current)}
			>
				<span className="cart-select__value">
					{selected ? optionLabel(selected) : t("delivery.pickNamedArea")}
				</span>
				<ChevronDown size={16} className="cart-select__chevron" aria-hidden />
			</button>
			{open ? (
				<ul className="cart-select__list" role="listbox" aria-label={t("delivery.selectAreaAria")}>
					<li role="option" aria-selected={!value}>
						<button
							type="button"
							className={clsx("cart-select__option", !value && "is-active")}
							onClick={() => {
								onPick(null);
								setOpen(false);
							}}
						>
							{t("delivery.pickNamedArea")}
						</button>
					</li>
					{areas.map((area) => (
						<li key={area.id} role="option" aria-selected={value === area.id}>
							<button
								type="button"
								className={clsx("cart-select__option", value === area.id && "is-active")}
								onClick={() => {
									onPick(area.id);
									setOpen(false);
								}}
							>
								{optionLabel(area)}
							</button>
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}
