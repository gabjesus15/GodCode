"use client";

import { useState } from "react";
import { Crosshair, MapPin, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";

import { parseUnifiedAddressSearch } from "@/lib/delivery/address-search-query";
import type { DeliverySettingsNormalized } from "@/lib/delivery/delivery-settings";
import type { CountryFormStrategy } from "@/lib/geo/country-forms";
import { cleanSavedAddressLine, savedAddressLabel } from "@/lib/menu-account/delivery-options";
import type { MenuAccountAddress } from "../../account/menu-account-types";
import { LazyDeliveryPreviewMap } from "@/lib/tenant/lazy/tenant-dynamic";
import type { DeliveryAddressController } from "../hooks/use-delivery-address";
import { useCart } from "../use-cart";
import { formatCartMoney } from "../utils/format-cart-money";
import { MIN_DRIVER_REFERENCE_LEN } from "../utils/fulfillment-validation";
import type { DeliveryPricingMode, FulfillmentEvaluation } from "../utils/fulfillment-validation";
import { deliveryQuoteErrorMessage } from "./cart-fulfillment-copy";
import { CartMoney } from "./cart-money";
import { CartNamedAreaSelect } from "./cart-named-area-select";

export type CartDeliveryFieldsProps = {
	settings: DeliverySettingsNormalized;
	pricingMode: DeliveryPricingMode;
	address: DeliveryAddressController;
	strategy: CountryFormStrategy;
	evaluation: FulfillmentEvaluation;
	/** Las ayudas de validación solo aparecen después de que el cliente tocó algo. */
	touched: boolean;
	onTouch: () => void;
	/** Direcciones guardadas en "Mi cuenta": un toque rellena los campos. */
	savedAddresses?: MenuAccountAddress[];
};

/**
 * Dónde entregamos. La ubicación es la acción principal: un toque resuelve la
 * dirección y los campos vacíos dan paso a una tarjeta que solo pide confirmar.
 * Escribir a mano sigue disponible, pero como alternativa, no como punto de partida.
 */
export function CartDeliveryFields({
	settings,
	pricingMode,
	address,
	strategy,
	evaluation,
	touched,
	onTouch,
	savedAddresses,
}: CartDeliveryFieldsProps) {
	const t = useTranslations("tenant.cart.modal");
	const {
		currency,
		deliveryCommune,
		setDeliveryCommune,
		deliveryReference,
		setDeliveryReference,
		deliveryNamedAreaId,
		setDeliveryNamedAreaId,
		deliveryLat,
		deliveryLng,
		deliveryFee,
		deliveryWaivedFree,
		deliveryQuoteLoading,
		deliveryQuoteError,
		deliveryNamedAreaLabel,
		isDeliveryOutOfZone,
		deliveryShowNumericFee,
		deliveryExternalHintText,
		quotedRouteKm,
	} = useCart();

	const isNamed = pricingMode === "named";
	const manualZone = isNamed && settings.namedAreaResolution === "manual_select";
	const matchedZone = isNamed && settings.namedAreaResolution === "address_matched";
	const areaLabel = t(`delivery.areaLabel.${strategy.address.areaKind}`);
	const quoteError = deliveryQuoteErrorMessage(deliveryQuoteError, t);

	const streetLine = [address.street.trim(), address.number.trim()].filter(Boolean).join(" ");
	const resolvedAddress = [streetLine, deliveryCommune.trim()].filter(Boolean).join(", ");
	// Con coordenadas y algo escrito ya hay dirección: se confirma, no se rellena.
	const hasResolved = evaluation.mapAddressMode && evaluation.hasCoords && resolvedAddress.length > 0;
	// Quién puso la dirección. Mientras el cliente escribe los campos no pueden
	// desaparecer bajo sus dedos, así que la tarjeta solo aparece tras el GPS
	// (o al volver con una dirección ya guardada).
	const [source, setSource] = useState<"located" | "manual">(hasResolved ? "located" : "manual");
	const showConfirmCard = hasResolved && source === "located";
	const showManualFields = evaluation.requiresAddress && !showConfirmCard;

	const locate = () => {
		onTouch();
		setSource("located");
		address.requestGeolocation();
	};
	const editByHand = () => setSource("manual");

	/**
	 * Una dirección guardada entra por el mismo camino que si la persona la
	 * tecleara: zona, calle y número, comuna y referencia por sus propios setters,
	 * así la cotización de envío se recalcula con el flujo normal.
	 */
	const pickSavedAddress = (saved: MenuAccountAddress) => {
		onTouch();
		const area = saved.namedAreaId ? settings.namedAreas.find((entry) => entry.id === saved.namedAreaId) : undefined;
		if (area) {
			setDeliveryNamedAreaId(area.id);
			if (area.name) setDeliveryCommune(area.name);
		}
		const line = cleanSavedAddressLine(saved.addressLine);
		// Guardada solo con zona, la línea trae el nombre de la zona: no es una calle.
		const zoneOnly = Boolean(area && line && area.name.startsWith(line));
		if (line && !zoneOnly) {
			const parsed = parseUnifiedAddressSearch(line);
			const match = parsed.line1.match(/^(.*?)[\s,]+(\d+[A-Za-z-]*)$/);
			address.onStreetChange(match ? match[1] : parsed.line1);
			address.onNumberChange(match ? match[2] : "");
			if (!area && parsed.commune) address.onAreaChange(parsed.commune);
		}
		if (saved.reference) setDeliveryReference(saved.reference);
		setSource("manual");
	};

	const feeValue = deliveryWaivedFree ? (
		<span className="cart-ship__free">{t("summary.free")}</span>
	) : isDeliveryOutOfZone ? (
		<span className="cart-ship__muted">{t("delivery.outOfZone")}</span>
	) : !deliveryShowNumericFee && deliveryExternalHintText ? (
		<span className="cart-ship__muted">{deliveryExternalHintText}</span>
	) : (
		<CartMoney amount={deliveryFee} />
	);
	// Sin ubicación ni tarifa no hay nada que mostrar: anunciar "$0" sería mentir.
	// Si el local ya cobra una base, se muestra: el total de arriba ya la incluye.
	const quoteSettled =
		evaluation.hasCoords ||
		Boolean(deliveryNamedAreaId) ||
		Boolean(deliveryNamedAreaLabel) ||
		deliveryWaivedFree ||
		deliveryFee > 0;
	const distanceKm =
		pricingMode === "distance" && quotedRouteKm != null && Number(quotedRouteKm) > 0
			? Math.round(Number(quotedRouteKm))
			: null;

	return (
		<div className="cart-delivery">
			{settings.customerNotes ? <p className="cart-hint">{settings.customerNotes}</p> : null}

			{savedAddresses && savedAddresses.length > 0 ? (
				<div className="cart-saved">
					<span className="cart-label">{t("delivery.savedAddresses")}</span>
					<div className="cart-chips cart-chips--start">
						{savedAddresses.map((saved) => (
							<button key={saved.id} type="button" className="cart-chip" onClick={() => pickSavedAddress(saved)}>
								<MapPin size={13} aria-hidden />
								<span>{savedAddressLabel(saved, settings.namedAreas)}</span>
							</button>
						))}
					</div>
				</div>
			) : null}

			{manualZone ? (
				<div className="cart-fields">
					<span className="cart-label" id="cart-named-area-label">
						{t("delivery.zoneLabel")}
					</span>
					<CartNamedAreaSelect
						areas={settings.namedAreas}
						value={deliveryNamedAreaId}
						formatMoney={formatCartMoney}
						currency={currency}
						onPick={(id) => {
							onTouch();
							setDeliveryNamedAreaId(id);
							const area = id ? settings.namedAreas.find((entry) => entry.id === id) : null;
							if (area?.name) setDeliveryCommune(area.name);
						}}
					/>
				</div>
			) : null}

			{matchedZone ? (
				<p className="cart-hint">
					{t("delivery.writeStreetNumberArea", { area: areaLabel.toLowerCase() })}
				</p>
			) : null}

			{showConfirmCard ? (
				<section className="cart-address-card">
					<LazyDeliveryPreviewMap lat={deliveryLat} lng={deliveryLng} />
					<div className="cart-address-card__body">
						<span className="cart-address-card__icon" aria-hidden>
							<MapPin size={16} />
						</span>
						<span className="cart-address-card__text">
							<span className="cart-address-card__label">{t("delivery.detectedAddress")}</span>
							<span className="cart-address-card__value">{resolvedAddress}</span>
						</span>
						<button
							type="button"
							className="cart-address-card__edit"
							onClick={editByHand}
						>
							<Pencil size={14} aria-hidden />
							<span>{t("delivery.editAddress")}</span>
						</button>
					</div>
					{address.precision === "approx" ? (
						<p className="cart-address-card__warn">{t("delivery.approxHint")}</p>
					) : null}
				</section>
			) : null}

			{evaluation.mapAddressMode && !showConfirmCard ? (
				<div className="cart-locate">
					<button type="button" className="cart-locate__btn" onClick={locate}>
						<span className="cart-locate__icon" aria-hidden>
							<Crosshair size={20} strokeWidth={1.9} />
						</span>
						<span className="cart-locate__text">
							<span className="cart-locate__title">{t("delivery.useCurrentLocation")}</span>
							<span className="cart-locate__hint">{t("delivery.preciseShippingHint")}</span>
						</span>
					</button>
					{address.geoHint ? (
						<p className="cart-hint cart-hint--status" role="status">
							{address.geoHint}
						</p>
					) : null}
					<p className="cart-or">
						<span>{t("common.or")}</span>
					</p>
				</div>
			) : null}

			{showManualFields ? (
				<div className="cart-fields">
					{evaluation.mapAddressMode ? (
						<p className="cart-fields__title">{t("delivery.writeAddressInstead")}</p>
					) : null}
					<div className="cart-fields__group">
						<label className="cart-label" htmlFor="cart-delivery-street">
							{t("delivery.street")}
						</label>
						<div className="cart-fields__row">
							<input
								id="cart-delivery-street"
								className="cart-field cart-fields__street"
								value={address.street}
								onChange={(event) => {
									onTouch();
									address.onStreetChange(event.target.value);
								}}
								placeholder={t("delivery.example", { value: strategy.address.streetExample })}
								autoComplete="address-line1"
								enterKeyHint="next"
							/>
							<input
								id="cart-delivery-number"
								className="cart-field cart-fields__number"
								value={address.number}
								onChange={(event) => {
									onTouch();
									address.onNumberChange(event.target.value);
								}}
								placeholder={strategy.address.numberExample}
								aria-label={t("delivery.number")}
								inputMode="numeric"
								enterKeyHint="next"
							/>
						</div>
					</div>
					<div className="cart-fields__group">
						<label className="cart-label" htmlFor="cart-delivery-area">
							{areaLabel}
						</label>
						<input
							id="cart-delivery-area"
							className="cart-field"
							value={deliveryCommune}
							onChange={(event) => {
								onTouch();
								address.onAreaChange(event.target.value);
							}}
							placeholder={t("delivery.example", { value: strategy.address.areaExample })}
							autoComplete="address-level2"
							enterKeyHint="done"
						/>
					</div>
					{evaluation.mapAddressMode && address.geocoding ? (
						<p className="cart-hint cart-hint--status" role="status">
							{t("delivery.updatingLocationFromStreet")}
						</p>
					) : null}
					{evaluation.mapAddressMode && evaluation.hasCoords ? (
						<LazyDeliveryPreviewMap lat={deliveryLat} lng={deliveryLng} />
					) : null}
				</div>
			) : null}

			<div className="cart-fields__group">
				<label className="cart-label" htmlFor="cart-delivery-reference">
					{t("delivery.driverInstructionsRequired")}
				</label>
				<textarea
					id="cart-delivery-reference"
					className="cart-field cart-delivery__reference"
					rows={2}
					value={deliveryReference}
					onChange={(event) => {
						onTouch();
						setDeliveryReference(event.target.value);
					}}
					placeholder={t("delivery.driverInstructionsPlaceholder")}
					aria-invalid={touched && !evaluation.referenceOk ? true : undefined}
				/>
				{touched && !evaluation.referenceOk ? (
					<p className="cart-hint cart-hint--error">
						{t("delivery.driverInstructionsMin", { min: MIN_DRIVER_REFERENCE_LEN })}
					</p>
				) : null}
			</div>

			{quoteError ? <p className="cart-warn">{quoteError}</p> : null}

			<div
				className="cart-ship"
				data-state={deliveryQuoteLoading ? "loading" : quoteSettled ? undefined : "pending"}
			>
				<span className="cart-ship__label">
					<span>
						{t("delivery.shippingCost")}
						{deliveryNamedAreaLabel ? (
							<small>{t("delivery.detectedZone", { zone: deliveryNamedAreaLabel })}</small>
						) : distanceKm != null ? (
							<small>{`~${distanceKm} km`}</small>
						) : null}
					</span>
				</span>
				<span className="cart-ship__value">
					{deliveryQuoteLoading ? (
						<span className="cart-ship__muted">{t("delivery.calculatingShipping")}</span>
					) : quoteSettled ? (
						feeValue
					) : (
						<span className="cart-ship__muted">{t("delivery.shippingPending")}</span>
					)}
				</span>
			</div>

			{!evaluation.meetsMinOrder ? (
				<p className="cart-warn">
					{t("delivery.minOrderForDelivery", {
						amount: formatCartMoney(settings.minOrderSubtotal ?? 0, currency),
					})}
				</p>
			) : null}
			{isDeliveryOutOfZone ? <p className="cart-warn">{t("delivery.locationExceedsMaxKm")}</p> : null}
		</div>
	);
}
