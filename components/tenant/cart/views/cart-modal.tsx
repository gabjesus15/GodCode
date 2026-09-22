"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import {
	effectiveDeliveryPricingMode,
	isOrderPaymentAllowedForDelivery,
	normalizeDeliverySettings,
	stripStaffOnlyDeliverySettings,
} from "@/lib/delivery/delivery-settings";
import { getFormStrategy, resolveCheckoutCountryCode } from "@/lib/geo/country-forms";
import { MENU_ACCOUNT_ENABLED } from "@/lib/menu-account/feature";
import { buildBusinessClosedCustomerMessage } from "@/lib/tenant/business-closed-message";
import { useTenantMounted } from "@/lib/tenant/hooks/use-tenant-mounted";
import type { OrderChannelMode } from "@/lib/tenant/menu-settings";
import {
	requiresOpenShiftForCheckout,
	shouldOpenWhatsAppOnCheckout,
	shouldPersistOrderToPanel,
} from "@/lib/tenant/menu-settings";
import { useDismissKeyboardOnOutsideTap } from "@/lib/tenant/mobile/use-dismiss-keyboard";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { getTenantScopedPath } from "../../utils/tenant-route";
import type { CartFulfillment } from "../cart-context";
import {
	INITIAL_CHECKOUT_RESULT,
	type BranchInfo,
	type BusinessInfo,
	type CartLineItem,
	type CheckoutResultState,
} from "../cart-modal-types";
import { resolvePaymentMethodLabel } from "../constants";
import { useCartCheckoutFlow } from "../hooks/use-cart-checkout-flow";
import { useCartDialog } from "../hooks/use-cart-dialog";
import { useCheckoutBranchLive } from "../hooks/use-checkout-branch-live";
import { useCheckoutForm } from "../hooks/use-checkout-form";
import { useDeliveryAddress } from "../hooks/use-delivery-address";
import { buildOrderPayload } from "../services/build-order-payload";
import {
	buildWhatsAppHandoffMessage,
	buildWhatsAppUrl,
	resolveWhatsAppCopy,
} from "../services/build-whatsapp-handoff";
import { paymentMethodRequiresReceipt } from "../services/menu-order-payment";
import { parseOrderRpcPayload } from "../services/order-payload";
import { useSubmitOrder } from "../services/order-submission";
import { useCart } from "../use-cart";
import { mergeActiveSessionInfo, resolveCheckoutTimeZone } from "../utils/active-session-info";
import { mergeCartWithBranchPrices } from "../utils/cart-pricing";
import { resolveCheckoutPaymentMethods } from "../utils/checkout-payment-methods";
import { parseEnhancementCatalogs } from "../utils/enhancement-catalogs";
import { evaluateFulfillment } from "../utils/fulfillment-validation";
import { CartDialogShell, type CartNotice, type CartStepDirection } from "./cart-dialog-shell";
import { fulfillmentBlockerMessage } from "./cart-fulfillment-copy";
import { CartFulfillmentBody, CartFulfillmentFoot } from "./cart-fulfillment-step";
import { CartOrderRecap, type CartRecapDetail } from "./cart-order-recap";
import {
	CartPaymentBody,
	CartPaymentFoot,
	isOnlinePaymentMethod,
	resolvePaymentStage,
} from "./cart-payment-step";
import { CartSummaryBody, CartSummaryFoot } from "./cart-summary-step";
import { CartSuccessView } from "./cart-success-view";

import "../../../../app/[subdomain]/styles/Cart.css";

const WHATSAPP_HANDOFF_DELAY_MS = 1500;

/** Orden de los pasos: decide si un cambio se anima "hacia adelante" o "hacia atrás". */
const STEP_ORDER = ["summary", "fulfillment", "payment:pick", "payment:detail", "payment:form", "success"];

export function CartModal({
	businessInfo,
	selectedBranch,
	currency: propCurrency = "CLP",
	orderChannel = "both",
	closing = false,
}: {
	businessInfo?: BusinessInfo | null;
	selectedBranch?: BranchInfo | null;
	currency?: string;
	orderChannel?: OrderChannelMode;
	/** El store ya cerró el carrito; el panel sigue montado unos ms para animar la salida. */
	closing?: boolean;
}) {
	const t = useTranslations("tenant.cart.modal");
	const router = useRouter();
	const pathname = usePathname();
	const supabase = useMemo(() => createSupabaseBrowserClient("tenant"), []);
	const mounted = useTenantMounted();
	const cart = useCart();
	const submitOrder = useSubmitOrder();
	const currency = cart.currency || propCurrency;

	// --- Sucursal en vivo y configuración derivada ---------------------------------
	const live = useCheckoutBranchLive({ branch: selectedBranch, isCartOpen: cart.isCartOpen, supabase });
	const branch = live.branch;
	const settings = useMemo(
		() => normalizeDeliverySettings(stripStaffOnlyDeliverySettings(branch?.delivery_settings)),
		[branch?.delivery_settings],
	);
	const pricingMode = useMemo(() => effectiveDeliveryPricingMode(settings), [settings]);
	const paymentMethods = useMemo(
		() => resolveCheckoutPaymentMethods(branch, settings, cart.fulfillment),
		[branch, settings, cart.fulfillment],
	);
	const catalogs = useMemo(() => parseEnhancementCatalogs(branch?.delivery_settings), [branch?.delivery_settings]);
	const countryCode = useMemo(
		() =>
			resolveCheckoutCountryCode({
				branchCountry: branch?.country ?? selectedBranch?.country,
				businessCountry: businessInfo?.country,
				cartCountry: cart.country,
			}),
		[branch?.country, selectedBranch?.country, businessInfo?.country, cart.country],
	);
	const strategy = useMemo(() => getFormStrategy(countryCode), [countryCode]);
	const activeInfo = useMemo(() => mergeActiveSessionInfo(businessInfo, selectedBranch), [businessInfo, selectedBranch]);

	const lines = useMemo(
		() =>
			mergeCartWithBranchPrices(cart.cart, cart.branchPriceRows, {
				omitLinesWithoutPriceWhenBranchHasData: true,
			}) as CartLineItem[],
		[cart.cart, cart.branchPriceRows],
	);
	const omittedLines = cart.cart.length - lines.length;
	const units = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);

	// --- Estado del checkout ---------------------------------------------------------
	const [result, setResult] = useState<CheckoutResultState>(INITIAL_CHECKOUT_RESULT);
	const flow = useCartCheckoutFlow({
		isCartOpen: cart.isCartOpen,
		showSuccess: result.showSuccess,
		hasPaymentDetailStep: isOnlinePaymentMethod,
	});
	const phase: "summary" | "fulfillment" | "payment" = !flow.stepFlags.showPaymentInfo
		? "summary"
		: !flow.stepFlags.showPaymentMethods
			? "fulfillment"
			: "payment";
	const paymentStage = resolvePaymentStage(flow.paymentMethodKey, flow.checkoutSession.showForm);

	// Paso actual y el anterior, para animar el cuerpo según la dirección del cambio.
	const stepKey = result.showSuccess
		? "success"
		: phase === "payment"
			? `payment:${paymentStage}`
			: phase;
	const [stepTrail, setStepTrail] = useState({ previous: stepKey, current: stepKey });
	if (stepTrail.current !== stepKey) {
		setStepTrail({ previous: stepTrail.current, current: stepKey });
	}
	const stepDirection: CartStepDirection =
		stepTrail.previous === stepTrail.current
			? "none"
			: STEP_ORDER.indexOf(stepTrail.current) >= STEP_ORDER.indexOf(stepTrail.previous)
				? "forward"
				: "back";

	// El aviso de error va atado al contenido del carrito: cambiar algo lo retira solo.
	const errorKey = `${branch?.id ?? ""}|${lines.map((line) => `${line.lineId}:${line.quantity}`).join(",")}`;
	const [errorState, setErrorState] = useState<{ key: string; message: string } | null>(null);
	const error = errorState?.key === errorKey ? errorState.message : null;
	const showError = useCallback((message: string) => setErrorState({ key: errorKey, message }), [errorKey]);
	const clearError = useCallback(() => setErrorState(null), []);

	const [showFieldErrors, setShowFieldErrors] = useState(false);
	const [fulfillmentVisit, setFulfillmentVisit] = useState(0);
	const [touchedVisit, setTouchedVisit] = useState(-1);
	const fulfillmentTouched = touchedVisit === fulfillmentVisit;
	const touchFulfillment = useCallback(() => setTouchedVisit(fulfillmentVisit), [fulfillmentVisit]);

	const [orderRequestId, setOrderRequestId] = useState(() => crypto.randomUUID());
	const submitLockRef = useRef(false);

	const isPaused = branch?.order_intake_paused === true;
	const pausedMessage = branch?.order_intake_pause_message || t("intake.pausedFallback");
	const canCheckout = (requiresOpenShiftForCheckout(orderChannel) ? live.shiftOpen : true) && !isPaused;
	const closedMessage = useMemo(
		() =>
			buildBusinessClosedCustomerMessage({
				businessName: businessInfo?.name,
				branchName: selectedBranch?.name,
				schedule: selectedBranch?.schedule ?? businessInfo?.schedule ?? null,
				timeZone: resolveCheckoutTimeZone(selectedBranch?.country),
			}),
		[businessInfo?.name, businessInfo?.schedule, selectedBranch?.country, selectedBranch?.name, selectedBranch?.schedule],
	);

	// --- Formulario, dirección y validación ----------------------------------------
	const requiresReceipt = paymentMethodRequiresReceipt(flow.paymentMethodKey, live.receiptRequiredMethods);
	const patchClientDraft = useCallback(
		(draft: { name: string; phone: string; rut: string }) => flow.patchCheckoutSession({ clientDraft: draft }),
		[flow],
	);
	const form = useCheckoutForm({
		t,
		strategy,
		countryCode,
		fulfillment: cart.fulfillment,
		requiresReceipt,
		isCartOpen: cart.isCartOpen,
		clientDraft: flow.checkoutSession.clientDraft,
		patchClientDraft,
		delivery: {
			line1: cart.deliveryLine1,
			area: cart.deliveryCommune,
			reference: cart.deliveryReference,
			lat: cart.deliveryLat,
			lng: cart.deliveryLng,
			namedAreaId: cart.deliveryNamedAreaId,
		},
		onError: showError,
	});

	const evaluation = useMemo(
		() =>
			evaluateFulfillment({
				fulfillment: cart.fulfillment,
				deliveryEnabled: settings.enabled,
				pricingMode,
				namedAreaResolution: settings.namedAreaResolution,
				minOrderSubtotal: settings.minOrderSubtotal,
				cartSubtotal: cart.cartSubtotal,
				line1: cart.deliveryLine1,
				area: cart.deliveryCommune,
				reference: cart.deliveryReference,
				lat: cart.deliveryLat,
				lng: cart.deliveryLng,
				namedAreaId: cart.deliveryNamedAreaId,
				namedAreaLabel: cart.deliveryNamedAreaLabel,
				kmManual: cart.deliveryKmManual,
				quoteLoading: cart.deliveryQuoteLoading,
				quoteError: cart.deliveryQuoteError,
				outOfZone: cart.isDeliveryOutOfZone,
			}),
		[cart, settings, pricingMode],
	);
	const blockerMessage = fulfillmentBlockerMessage(evaluation.blocker, t, currency);

	const address = useDeliveryAddress({
		active: cart.isCartOpen && phase === "fulfillment" && cart.fulfillment === "delivery" && evaluation.mapAddressMode,
		branch: selectedBranch,
		line1: cart.deliveryLine1,
		area: cart.deliveryCommune,
		setLine1: cart.setDeliveryLine1,
		setArea: cart.setDeliveryCommune,
		setCoords: cart.setDeliveryCoords,
		t,
	});

	const panelRef = useRef<HTMLDivElement>(null);
	useCartDialog(panelRef, cart.isCartOpen);
	useDismissKeyboardOnOutsideTap(panelRef);

	// Si el admin quita el método elegido, el checkout vuelve a la lista.
	const { paymentMethodKey, setPaymentMethodKey } = flow;
	useEffect(() => {
		if (paymentMethodKey && !paymentMethods.includes(paymentMethodKey)) setPaymentMethodKey(null);
	}, [paymentMethodKey, paymentMethods, setPaymentMethodKey]);

	// --- Acciones -------------------------------------------------------------------
	const goToFulfillment = () => {
		flow.setActiveEnhancePanel("none");
		setFulfillmentVisit((visit) => visit + 1);
		flow.patchCheckoutSession({ showPaymentInfo: true, showPaymentMethods: false, showForm: false });
	};

	const continueToPayment = () => {
		if (!evaluation.canProceed) {
			touchFulfillment();
			return;
		}
		flow.patchCheckoutSession({ showPaymentMethods: true });
	};

	const changeFulfillment = (next: CartFulfillment) => {
		if (cart.fulfillment !== next) cart.setFulfillment(next);
	};

	/** Volver a elegir entrega o método desde "Tus datos", sin perder lo ya escrito. */
	const backToSummaryStep = () =>
		flow.patchCheckoutSession({
			showPaymentInfo: false,
			showPaymentMethods: false,
			showForm: false,
			paymentMethodKey: null,
			activeEnhancePanel: "none",
		});
	const backToFulfillment = () =>
		flow.patchCheckoutSession({ showPaymentMethods: false, showForm: false, paymentMethodKey: null });
	const backToPaymentMethods = () =>
		flow.patchCheckoutSession({ showForm: false, paymentMethodKey: null });
	const backFromPaymentForm = () =>
		flow.skipPaymentDetail ? backToPaymentMethods() : flow.patchCheckoutSession({ showForm: false });

	const openAccount = () => {
		flow.dismissCart();
		router.push(getTenantScopedPath(pathname ?? "/", "/mi-cuenta"));
	};

	const resetFlow = () => {
		setResult(INITIAL_CHECKOUT_RESULT);
		flow.resetCheckoutSession();
		form.resetClientFields();
		setShowFieldErrors(false);
		clearError();
	};

	const submit = form.form.handleSubmit(async (data) => {
		if (!canCheckout) {
			showError(
				isPaused
					? pausedMessage
					: !live.shiftOpen
						? closedMessage
						: businessInfo?.schedule
							? t("errors.scheduleIs", { schedule: businessInfo.schedule })
							: t("errors.noOrdersNow"),
			);
			return;
		}
		if (submitLockRef.current || result.isSaving) return;
		submitLockRef.current = true;
		try {
			if (!selectedBranch?.id) {
				showError(t("errors.noBranchSelected"));
				return;
			}
			const isDelivery = cart.fulfillment === "delivery" && settings.enabled;
			if (isDelivery && !evaluation.canProceed) {
				showError(blockerMessage ?? t("errors.completeDeliveryOrMin"));
				return;
			}
			if (isDelivery && paymentMethodKey && !isOrderPaymentAllowedForDelivery(paymentMethodKey, settings)) {
				showError(t("errors.paymentNotAllowedForDelivery"));
				return;
			}
			if (omittedLines > 0) {
				showError(
					omittedLines === 1
						? t("errors.oneProductUnavailableInBranch")
						: t("errors.productsUnavailableInBranch", { count: omittedLines }),
				);
				return;
			}

			setResult((current) => ({ ...current, isSaving: true }));
			clearError();

			const payload = buildOrderPayload({
				clientRequestId: orderRequestId,
				client: { name: data.name, phone: data.phone ?? "", rut: data.rut ?? "" },
				paymentMethodKey,
				requiresReceipt,
				cart: lines,
				globalExtras: cart.globalExtras,
				globalExtraCopy: {
					fallbackName: t("catalog.globalExtra"),
					description: t("catalog.globalExtraDescription"),
				},
				fulfillment: cart.fulfillment,
				deliveryEnabled: settings.enabled,
				delivery: {
					isDelivery,
					pricingMode,
					line1: cart.deliveryLine1,
					area: cart.deliveryCommune,
					reference: cart.deliveryReference,
					lat: cart.deliveryLat,
					lng: cart.deliveryLng,
					namedAreaId: cart.deliveryNamedAreaId,
					namedAreaLabel: cart.deliveryNamedAreaLabel,
					quotedRouteKm: cart.quotedRouteKm,
					kmManual: cart.deliveryKmManual,
				},
				totals: { grandTotal: cart.grandTotal, deliveryFee: cart.deliveryFee },
				branch: selectedBranch,
				branchNameFallback: t("common.unknown"),
				currency,
				uberQuoteId: cart.uberQuoteId,
				couponCode: cart.appliedCouponCode,
			});

			let parsed: ReturnType<typeof parseOrderRpcPayload> = null;
			let receiptUploadFailed = false;
			let paymentStatus: string | null = null;
			let evidenceStatus: string | null = null;
			if (shouldPersistOrderToPanel(orderChannel)) {
				const response = await submitOrder.mutateAsync({
					orderData: payload,
					receiptFile: data.receiptFile ?? null,
				});
				parsed = parseOrderRpcPayload(response.order);
				receiptUploadFailed = response.receiptUploadFailed ?? false;
				paymentStatus = response.paymentStatus ?? null;
				evidenceStatus = response.evidenceStatus ?? null;
				setOrderRequestId(crypto.randomUUID());
			}

			const snapshot = {
				fulfillment: cart.fulfillment,
				subtotal: cart.cartSubtotal,
				deliveryFee: isDelivery ? cart.deliveryFee : 0,
				grandTotal: cart.grandTotal,
			};
			setResult({
				showSuccess: true,
				isSaving: false,
				receiptUploadFailed,
				lastOrderSuccess: {
					id: parsed?.id ?? 0,
					order_number: parsed?.order_number ?? null,
					handoff_code: parsed?.handoff_code ?? null,
					fulfillment: snapshot.fulfillment,
					paymentStatus,
					evidenceStatus,
				},
			});
			setShowFieldErrors(false);

			const finalize = () => {
				if (shouldOpenWhatsAppOnCheckout(orderChannel)) {
					const message = buildWhatsAppHandoffMessage({
						client: { name: data.name, rut: data.rut ?? "", phone: data.phone ?? "" },
						cart: lines,
						paymentMethodKey,
						paymentMethodLabel: resolvePaymentMethodLabel(paymentMethodKey, t),
						paymentData: paymentMethodKey ? (activeInfo as Record<string, unknown>)[paymentMethodKey] : undefined,
						businessName: activeInfo.name,
						meta: {
							fulfillment: snapshot.fulfillment,
							cartSubtotal: snapshot.subtotal,
							deliveryFee: snapshot.deliveryFee,
							grandTotal: snapshot.grandTotal,
							deliverySummary:
								isDelivery && payload.delivery_address
									? `${t("delivery.addressLabel")}: ${String(payload.delivery_address.address ?? "")}`
									: undefined,
							orderId: parsed?.id ?? null,
							orderNumber: parsed?.order_number ?? null,
							handoffCode: parsed?.handoff_code ?? null,
							couponCode: payload.coupon_code ?? null,
							couponDiscount: cart.appliedCouponDiscount > 0 ? cart.appliedCouponDiscount : undefined,
							taxTotal: cart.taxTotal,
							taxRate: settings.taxRate,
							taxIncluded: settings.taxIncluded,
							currency,
							localCurrency: currency === "USD" ? "VES" : "USD",
							localTotal: cart.localTotal,
							country: countryCode,
							exchangeRate: cart.exchangeRate,
							paymentMethodKey,
						},
						copy: resolveWhatsAppCopy(t, strategy.idName),
					});
					const url = buildWhatsAppUrl(activeInfo.phone, message);
					if (!url) {
						showError(t("errors.whatsappNotConfigured"));
						return;
					}
					window.open(url, "_blank");
				}
				cart.clearCart();
			};
			if (shouldOpenWhatsAppOnCheckout(orderChannel)) {
				window.setTimeout(finalize, WHATSAPP_HANDOFF_DELAY_MS);
			} else {
				finalize();
			}
		} catch (caught: unknown) {
			const message = (caught as { message?: unknown } | null)?.message;
			showError(typeof message === "string" && message ? message : t("errors.processOrderTryAgain"));
			setResult((current) => ({ ...current, isSaving: false }));
		} finally {
			submitLockRef.current = false;
		}
	});

	// --- Render ---------------------------------------------------------------------
	if (!mounted || (!cart.isCartOpen && !closing)) return null;

	const notice: CartNotice = error
		? { tone: "error", message: error }
		: isPaused
			? { tone: "warning", message: pausedMessage }
			: null;

	if (result.showSuccess) {
		return (
			<CartDialogShell
				panelRef={panelRef}
				phase="success"
				bodyKey={stepKey}
				direction={stepDirection}
				closing={closing}
				ariaLabel={t("success.sentAria")}
				title={t("success.sentTitle")}
				itemCount={0}
				notice={error ? { tone: "error", message: error } : null}
				onClose={flow.dismissCart}
			>
				<CartSuccessView
					onNewOrder={resetFlow}
					onGoHome={flow.dismissCart}
					receiptUploadFailed={result.receiptUploadFailed}
					activeInfo={activeInfo}
					lastOrder={result.lastOrderSuccess}
				/>
			</CartDialogShell>
		);
	}

	const showBeverages = cart.beveragesUpsellEnabledByBranch && catalogs.beverages.length > 0;
	const showExtras = cart.extrasEnabledByBranch && catalogs.globalExtras.length > 0;
	const branchId = selectedBranch?.id ?? null;
	const hasLines = lines.length > 0;

	const pickupInfo = {
		branchName: branch?.name ?? selectedBranch?.name ?? businessInfo?.name ?? null,
		address: branch?.address ?? selectedBranch?.address ?? businessInfo?.address ?? null,
		schedule: branch?.schedule ?? selectedBranch?.schedule ?? businessInfo?.schedule ?? null,
	};

	// Recap: acompaña al cliente desde que sale del resumen. En "Tus datos" suma
	// entrega y método de pago para que nadie confirme un pedido que no ve.
	const deliveryRecapValue =
		cart.fulfillment === "delivery" && settings.enabled
			? [cart.deliveryLine1.trim(), cart.deliveryCommune.trim()].filter(Boolean).join(", ") ||
				t("delivery.delivery")
			: t("fulfillment.pickupValue");
	const recapDetails: CartRecapDetail[] =
		phase === "payment" && paymentStage === "form"
			? [
					{
						key: "fulfillment",
						label: t("fulfillment.deliveryRecapLabel"),
						value: deliveryRecapValue,
						onEdit: backToFulfillment,
					},
					{
						key: "payment",
						label: t("fulfillment.paymentRecapLabel"),
						value: resolvePaymentMethodLabel(paymentMethodKey, t),
						onEdit: backToPaymentMethods,
					},
				]
			: [];
	const aside =
		phase === "summary" || !hasLines ? null : (
			<CartOrderRecap
				units={units}
				total={cart.grandTotal}
				onEditItems={backToSummaryStep}
				details={recapDetails}
			/>
		);

	const summaryCta = live.shiftLoading
		? ({ kind: "loading" } as const)
		: isPaused
			? ({ kind: "paused" } as const)
			: requiresOpenShiftForCheckout(orderChannel) && !live.shiftOpen
				? ({ kind: "closed", message: closedMessage } as const)
				: ({ kind: "ready", onContinue: goToFulfillment } as const);

	const body =
		phase === "summary" ? (
			<CartSummaryBody lines={lines} onBackToMenu={flow.dismissCart} />
		) : phase === "fulfillment" ? (
			<CartFulfillmentBody
				settings={settings}
				pricingMode={pricingMode}
				address={address}
				strategy={strategy}
				evaluation={evaluation}
				touched={fulfillmentTouched}
				onTouch={touchFulfillment}
				onFulfillmentChange={changeFulfillment}
				pickup={pickupInfo}
			/>
		) : (
			<CartPaymentBody
				methods={paymentMethods}
				paymentMethodKey={paymentMethodKey}
				receiptRequiredMethods={live.receiptRequiredMethods}
				stage={paymentStage}
				onPickMethod={flow.pickPaymentMethod}
				activeInfo={activeInfo}
				strategy={strategy}
				cartTotal={cart.grandTotal}
				form={{
					values: form.values,
					validation: form.validation,
					showFieldErrors,
					onInputChange: form.handleInputChange,
					onFileChange: form.handleFileChange,
					onSubmit: submit,
				}}
			/>
		);

	const footer = !hasLines ? null : phase === "summary" ? (
		<CartSummaryFoot
			settings={settings}
			catalogs={catalogs}
			showBeverages={showBeverages}
			showExtras={showExtras}
			showCoupon={Boolean(branchId)}
			activePanel={flow.activeEnhancePanel}
			onTogglePanel={flow.setActiveEnhancePanel}
			branchId={branchId}
			clientPhone={form.values.phone}
			cta={summaryCta}
		/>
	) : phase === "fulfillment" ? (
		<CartFulfillmentFoot
			blockerMessage={blockerMessage}
			showBlocker={fulfillmentTouched}
			onContinue={continueToPayment}
			onBack={flow.goBackCheckoutStep}
		/>
	) : (
		<CartPaymentFoot
			stage={paymentStage}
			isOnline={isOnlinePaymentMethod(paymentMethodKey)}
			skipDetail={flow.skipPaymentDetail}
			isSaving={result.isSaving}
			isPaused={isPaused}
			formReady={form.validation.isReady}
			onContinueToForm={() => flow.patchCheckoutSession({ showForm: true })}
			onChooseAnother={() => setPaymentMethodKey(null)}
			onBackFromForm={backFromPaymentForm}
			onCancel={flow.goBackCheckoutStep}
			onSubmitAttempt={(event) => {
				if (!form.validation.isReady) {
					event.preventDefault();
					setShowFieldErrors(true);
				}
			}}
		/>
	);

	return (
		<CartDialogShell
			panelRef={panelRef}
			phase={phase}
			bodyKey={stepKey}
			direction={stepDirection}
			closing={closing}
			ariaLabel={t("dialog.currentOrderAria")}
			title={t("header.title")}
			itemCount={units}
			branchName={selectedBranch?.name}
			notice={notice}
			aside={aside}
			onClose={flow.dismissCart}
			onOpenAccount={MENU_ACCOUNT_ENABLED ? openAccount : undefined}
			footer={footer}
		>
			{body}
		</CartDialogShell>
	);
}
