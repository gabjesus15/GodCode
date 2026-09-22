"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, MapPin, Plus, Trash2, X } from "lucide-react";

import type {
	MenuAccountDeliveryOptions,
	MenuAccountDeliveryZone,
} from "@/lib/menu-account/delivery-options";

import type { MenuAccountAddress } from "./menu-account-types";
import { AccountBusyLabel } from "./account-fields";
import { errorMessage } from "./menu-account-auth-panel";
import { useMenuAccount } from "./use-menu-account";

type MenuAccountAddressesProps = {
	companySlug: string;
	deliveryOptions: MenuAccountDeliveryOptions;
};

/** El RPC guarda `address` tal como llegó, a veces con la calle vacía (", Comuna"). */
function cleanLine(line: string): string {
	return line.replace(/^[\s,]+/, "").trim();
}

/** Zonas agrupadas por sucursal, solo si hay más de una (si no, el grupo sobra). */
function groupZones(zones: MenuAccountDeliveryZone[]) {
	const groups = new Map<string, { branchName: string; zones: MenuAccountDeliveryZone[] }>();
	for (const zone of zones) {
		const group = groups.get(zone.branchId) ?? { branchName: zone.branchName, zones: [] };
		group.zones.push(zone);
		groups.set(zone.branchId, group);
	}
	return [...groups.values()];
}

/**
 * Direcciones de la ficha de la cuenta. Se agregan a mano desde aquí o solas al pedir
 * con delivery, y el carrito las ofrece como atajo al elegir la entrega.
 *
 * El formulario sigue la forma de repartir del negocio: si cobra por zona elegida a
 * mano (p. ej. Oishi) se elige la zona de la lista; si no, se escribe la dirección.
 */
export function MenuAccountAddresses({ companySlug, deliveryOptions }: MenuAccountAddressesProps) {
	const t = useTranslations("tenant.account.addresses");
	const tAccount = useTranslations("tenant.account");
	const list = useMenuAccount("login");
	const mutation = useMenuAccount("login");
	const [addresses, setAddresses] = useState<MenuAccountAddress[] | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	/* Borrar pide un segundo toque: el primero convierte la papelera en "¿Eliminar?"
	   con confirmar y cancelar. Sin diálogo modal, y sin borrar por un roce. */
	const [confirmId, setConfirmId] = useState<string | null>(null);

	const [formOpen, setFormOpen] = useState(false);
	const [namedAreaId, setNamedAreaId] = useState("");
	const [addressLine, setAddressLine] = useState("");
	const [reference, setReference] = useState("");

	const zones = useMemo(
		() => (deliveryOptions.mode === "zones" ? deliveryOptions.zones : []),
		[deliveryOptions],
	);
	const zoneGroups = useMemo(() => groupZones(zones), [zones]);
	const zoneById = useMemo(() => new Map(zones.map((zone) => [zone.id, zone])), [zones]);
	const usesZones = deliveryOptions.mode === "zones";
	const canAdd = deliveryOptions.mode !== "none";

	const { run: runList } = list;
	useEffect(() => {
		let cancelled = false;
		void runList<{ addresses: MenuAccountAddress[] }>(
			`addresses?companySlug=${encodeURIComponent(companySlug)}`,
			{ method: "GET" },
		).then((result) => {
			if (!cancelled && result.ok) setAddresses(result.data.addresses);
		});
		return () => {
			cancelled = true;
		};
	}, [companySlug, runList]);

	const closeForm = () => {
		setFormOpen(false);
		setNamedAreaId("");
		setAddressLine("");
		setReference("");
		mutation.setErrorCode(null);
	};

	const handleCreate = async (event: React.FormEvent) => {
		event.preventDefault();
		const result = await mutation.run<{ address: MenuAccountAddress }>("addresses", {
			body: {
				companySlug,
				addressLine: usesZones ? "" : addressLine,
				reference,
				namedAreaId: usesZones ? namedAreaId || null : null,
			},
		});
		if (result.ok) {
			setAddresses((current) => [result.data.address, ...(current ?? [])]);
			closeForm();
		}
	};

	const handleDelete = async (address: MenuAccountAddress) => {
		setConfirmId(null);
		setDeletingId(address.id);
		const result = await mutation.run(
			`addresses?companySlug=${encodeURIComponent(companySlug)}&id=${encodeURIComponent(address.id)}`,
			{ method: "DELETE" },
		);
		setDeletingId(null);
		if (result.ok) {
			setAddresses((current) => current?.filter((item) => item.id !== address.id) ?? null);
		}
	};

	const shownError = list.errorCode ?? (formOpen ? null : mutation.errorCode);

	return (
		<div className="account-panel">
			{shownError ? <p className="account-error">{errorMessage(tAccount, shownError)}</p> : null}

			{addresses === null && list.pending ? <p className="account-note">{t("loading")}</p> : null}

			{addresses !== null && addresses.length === 0 && !formOpen ? (
				<p className="account-empty">{t(canAdd ? "empty" : "noDelivery")}</p>
			) : null}

			{addresses && addresses.length > 0 ? (
				<ul className="account-list">
					{addresses.map((address) => {
						const zone = address.namedAreaId ? zoneById.get(address.namedAreaId) : undefined;
						const line = cleanLine(address.addressLine);
						// En zonas la línea suele ser el mismo nombre de la zona: no repetirlo.
						const street = zone && line.startsWith(zone.name) ? "" : line;
						return (
							<li key={address.id} className="account-address">
								<span className="account-address-icon" aria-hidden>
									<MapPin size={16} />
								</span>
								<div className="account-address-text">
									<span className="account-address-line">
										{zone ? zone.name : street || t("noStreet")}
									</span>
									{zone && street ? (
										<span className="account-address-reference">{street}</span>
									) : null}
									{address.reference ? (
										<span className="account-address-reference">{address.reference}</span>
									) : null}
								</div>
								{confirmId === address.id ? (
									<span className="account-confirm" role="group" aria-label={t("delete")}>
										<span className="account-confirm__text">{t("confirmDelete")}</span>
										<button
											type="button"
											className="account-icon-button account-icon-button--danger"
											onClick={() => handleDelete(address)}
											disabled={deletingId !== null}
											aria-label={t("delete")}
										>
											<Check size={16} aria-hidden />
										</button>
										<button
											type="button"
											className="account-icon-button"
											onClick={() => setConfirmId(null)}
											aria-label={t("cancel")}
										>
											<X size={16} aria-hidden />
										</button>
									</span>
								) : (
									<button
										type="button"
										className="account-icon-button"
										onClick={() => setConfirmId(address.id)}
										disabled={deletingId !== null}
										aria-label={t("delete")}
										aria-busy={deletingId === address.id || undefined}
									>
										{deletingId === address.id ? <AccountBusyLabel busy idle={null} working={null} /> : <Trash2 size={16} aria-hidden />}
									</button>
								)}
							</li>
						);
					})}
				</ul>
			) : null}

			{formOpen ? (
				<form onSubmit={handleCreate}>
					<section className="account-group">
						<h3 className="account-group-title">{t("newTitle")}</h3>
						<div className="account-rows">
							{usesZones ? (
								<div className="account-row">
									<label className="account-row-label" htmlFor="account-address-zone">
										{t("zoneLabel")}
									</label>
									<div className="account-row-control">
										<select
											id="account-address-zone"
											className="account-input"
											value={namedAreaId}
											onChange={(event) => setNamedAreaId(event.target.value)}
											required
											autoFocus
										>
											<option value="" disabled>
												{t("zonePlaceholder")}
											</option>
											{zoneGroups.length > 1
												? zoneGroups.map((group) => (
														<optgroup key={group.branchName} label={group.branchName}>
															{group.zones.map((zone) => (
																<option key={zone.id} value={zone.id}>
																	{zone.name}
																</option>
															))}
														</optgroup>
													))
												: zones.map((zone) => (
														<option key={zone.id} value={zone.id}>
															{zone.name}
														</option>
													))}
										</select>
									</div>
								</div>
							) : null}
							{usesZones ? null : (
								<div className="account-row">
									<label className="account-row-label" htmlFor="account-address-line">
										{t("addressLabel")}
									</label>
									<div className="account-row-control">
										<input
											id="account-address-line"
											className="account-input"
											value={addressLine}
											onChange={(event) => setAddressLine(event.target.value)}
											placeholder={t("addressPlaceholder")}
											autoComplete="street-address"
											minLength={5}
											maxLength={160}
											required
											autoFocus
										/>
									</div>
								</div>
							)}
							<div className="account-row">
								{/* Por zona no hay campo de calle: la dirección se escribe aquí y es obligatoria. */}
								<label className="account-row-label" htmlFor="account-address-reference">
									{t(usesZones ? "addressLabel" : "referenceLabel")}
								</label>
								<div className="account-row-control">
									<input
										id="account-address-reference"
										className="account-input"
										value={reference}
										onChange={(event) => setReference(event.target.value)}
										placeholder={t(usesZones ? "zoneAddressPlaceholder" : "referencePlaceholder")}
										autoComplete={usesZones ? "street-address" : undefined}
										minLength={usesZones ? 3 : undefined}
										maxLength={160}
										required={usesZones}
									/>
								</div>
							</div>
						</div>
					</section>
					<div className="account-actions">
						{mutation.errorCode ? (
							<p className="account-error">{errorMessage(tAccount, mutation.errorCode)}</p>
						) : null}
						<button
							type="button"
							className="account-button account-button--ghost"
							onClick={closeForm}
							disabled={mutation.pending}
						>
							{t("cancel")}
						</button>
						<button type="submit" className="account-button" disabled={mutation.pending}>
							<AccountBusyLabel busy={mutation.pending} idle={t("save")} working={t("saving")} />
						</button>
					</div>
				</form>
			) : canAdd ? (
				<div className="account-actions account-actions--between">
					<p className="account-note">{t(usesZones ? "zoneHint" : "hint")}</p>
					{addresses !== null ? (
						<button
							type="button"
							className="account-button"
							onClick={() => {
								mutation.setErrorCode(null);
								setFormOpen(true);
							}}
						>
							<Plus size={15} aria-hidden />
							{t("add")}
						</button>
					) : null}
				</div>
			) : addresses !== null && addresses.length > 0 ? (
				<p className="account-note">{t("noDelivery")}</p>
			) : null}
		</div>
	);
}
