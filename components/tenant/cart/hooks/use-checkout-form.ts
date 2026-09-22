"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import type { CountryFormStrategy } from "@/lib/geo/country-forms";
import { validateImageFile } from "@/lib/storage/upload-image-client";
import type { CartFulfillment } from "../cart-context";
import { buildCartClientSchema } from "../services/cart-validation";

export type CheckoutClientDraft = { name: string; phone: string; rut: string };

export type CheckoutFormValues = {
	name: string;
	phone: string;
	rut: string;
	receiptFile: File | null;
	receiptPreview: string | null;
};

export type CheckoutFieldValidation = {
	name: boolean;
	phone: boolean;
	rut: boolean;
	receipt: boolean;
	isReady: boolean;
};

const LEGACY_PHONE_DEFAULTS = new Set(["", "+56 9", "+56 9 ", "+58", "+58 "]);

function isUnsetPhone(value: string | undefined): boolean {
	return LEGACY_PHONE_DEFAULTS.has((value ?? "").trim()) || LEGACY_PHONE_DEFAULTS.has(value ?? "");
}

export type UseCheckoutFormParams = {
	t: (key: string) => string;
	strategy: CountryFormStrategy;
	countryCode: string;
	fulfillment: CartFulfillment;
	requiresReceipt: boolean;
	isCartOpen: boolean;
	clientDraft: CheckoutClientDraft;
	patchClientDraft: (draft: CheckoutClientDraft) => void;
	delivery: {
		line1: string;
		area: string;
		reference: string;
		lat: number | null;
		lng: number | null;
		namedAreaId: string | null;
	};
	onError: (message: string) => void;
};

/**
 * Formulario de datos del cliente: esquema por país, prellenado desde el
 * dispositivo, borrador de sesión y sincronización con la dirección del store.
 */
export function useCheckoutForm(params: UseCheckoutFormParams) {
	const {
		t,
		strategy,
		countryCode,
		fulfillment,
		requiresReceipt,
		isCartOpen,
		clientDraft,
		patchClientDraft,
		delivery,
		onError,
	} = params;

	const schema = useMemo(
		() =>
			buildCartClientSchema(
				{
					nameShort: t("validation.nameShort"),
					nameInvalid: t("validation.nameInvalid"),
					phoneShort: t("validation.phoneShort"),
					phoneLong: t("validation.phoneLong"),
					phoneInvalid: t("validation.phoneInvalid"),
				},
				{
					fulfillment,
					requiresReceipt,
					validateRut: strategy.validateId,
				},
			),
		[t, fulfillment, requiresReceipt, strategy],
	);

	const form = useForm({
		resolver: zodResolver(schema),
		defaultValues: {
			name: "",
			phone: strategy.phonePrefix,
			rut: "",
			receiptFile: null,
			receiptPreview: undefined,
			fulfillment,
			delivery_address: {
				address: delivery.line1,
				formatted_address: [delivery.line1, delivery.area].filter(Boolean).join(", "),
				reference: delivery.reference,
				lat: delivery.lat,
				lng: delivery.lng,
				namedAreaId: delivery.namedAreaId,
			},
		},
	});
	const { setValue, getValues, control } = form;

	// Datos recordados del último pedido en este dispositivo.
	useEffect(() => {
		if (typeof window === "undefined") return;
		const phone = window.localStorage.getItem("tenant_client_phone");
		const rut = window.localStorage.getItem("tenant_client_rut");
		if (phone) setValue("phone", phone);
		if (rut) setValue("rut", rut);
	}, [setValue]);

	// Al cambiar de país, el prefijo sigue al país salvo que ya haya un número escrito.
	useEffect(() => {
		if (isUnsetPhone(getValues("phone"))) setValue("phone", strategy.phonePrefix);
	}, [countryCode, getValues, setValue, strategy.phonePrefix]);

	// Borrador de la sesión de checkout: se restaura solo al abrir el carrito.
	const wasOpenRef = useRef(false);
	useEffect(() => {
		const justOpened = isCartOpen && !wasOpenRef.current;
		wasOpenRef.current = isCartOpen;
		if (!justOpened) return;
		if (clientDraft.name.trim()) setValue("name", clientDraft.name);
		if (clientDraft.rut.trim()) setValue("rut", clientDraft.rut);
		if (!isUnsetPhone(clientDraft.phone)) setValue("phone", clientDraft.phone.trim());
	}, [clientDraft, isCartOpen, setValue]);

	useEffect(() => {
		setValue("fulfillment", fulfillment);
	}, [fulfillment, setValue]);

	useEffect(() => {
		setValue("delivery_address", {
			address: delivery.line1,
			formatted_address: [delivery.line1, delivery.area].filter(Boolean).join(", "),
			reference: delivery.reference,
			lat: delivery.lat,
			lng: delivery.lng,
			namedAreaId: delivery.namedAreaId,
		});
	}, [
		delivery.line1,
		delivery.area,
		delivery.reference,
		delivery.lat,
		delivery.lng,
		delivery.namedAreaId,
		setValue,
	]);

	useEffect(() => {
		return () => {
			const preview = getValues("receiptPreview");
			if (preview) URL.revokeObjectURL(preview);
		};
	}, [getValues]);

	const watched = useWatch({ control });
	const values = useMemo<CheckoutFormValues>(
		() => ({
			name: watched.name ?? "",
			phone: watched.phone ?? "",
			rut: watched.rut ?? "",
			receiptFile: (watched.receiptFile as File | null | undefined) ?? null,
			receiptPreview: watched.receiptPreview ?? null,
		}),
		[watched.name, watched.phone, watched.rut, watched.receiptFile, watched.receiptPreview],
	);

	const validation = useMemo<CheckoutFieldValidation>(() => {
		const name = values.name.trim();
		const nameOk = name.length > 2 && /^[\p{L} .'-]+$/u.test(name);
		const phoneOk = strategy.validatePhone(values.phone);
		const rutOk = strategy.validateId(values.rut);
		const receiptOk = requiresReceipt ? Boolean(values.receiptFile) : true;
		return {
			name: nameOk,
			phone: phoneOk,
			rut: rutOk,
			receipt: receiptOk,
			isReady: nameOk && phoneOk && rutOk && receiptOk,
		};
	}, [values, requiresReceipt, strategy]);

	const handleInputChange = useCallback(
		(field: "name" | "phone" | "rut", raw: string) => {
			let value = raw;
			if (field === "rut" && strategy.formatId) value = strategy.formatId(value);
			if (field === "phone") value = strategy.normalizePhone(value);
			setValue(field, value);
			patchClientDraft({ ...clientDraft, [field]: value });
		},
		[clientDraft, patchClientDraft, setValue, strategy],
	);

	const handleFileChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (!file) return;
			const { valid, error } = validateImageFile(file);
			if (!valid) {
				onError(error || t("validation.invalidFile"));
				return;
			}
			const previous = getValues("receiptPreview");
			if (previous) URL.revokeObjectURL(previous);
			setValue("receiptFile", file);
			setValue("receiptPreview", URL.createObjectURL(file));
		},
		[getValues, onError, setValue, t],
	);

	const resetClientFields = useCallback(() => {
		const previous = getValues("receiptPreview");
		if (previous) URL.revokeObjectURL(previous);
		setValue("name", "");
		setValue("phone", strategy.phonePrefix);
		setValue("rut", "");
		setValue("receiptFile", null);
		setValue("receiptPreview", undefined);
	}, [getValues, setValue, strategy.phonePrefix]);

	return {
		form,
		values,
		validation,
		handleInputChange,
		handleFileChange,
		resetClientFields,
	};
}
