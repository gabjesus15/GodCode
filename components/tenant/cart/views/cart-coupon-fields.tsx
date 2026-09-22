"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { useTenantCartStore } from "../cart-store";
import { useCart } from "../use-cart";
import { formatCartMoney } from "../utils/format-cart-money";

type CouponPreviewPayload = {
	ok?: boolean;
	discountAmount?: number;
	normalizedCode?: string;
	error?: string;
	minSubtotal?: number;
};

async function previewCoupon(
	body: { branchId: string; code: string; subtotal: number; clientPhone?: string },
	signal?: AbortSignal,
): Promise<{ ok: boolean; payload: CouponPreviewPayload }> {
	const response = await fetch("/api/geo/discount-coupon-preview", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
		signal,
	});
	const payload = (await response.json()) as CouponPreviewPayload;
	return { ok: response.ok && Boolean(payload.ok), payload };
}

export function CartCouponFields({
	branchId,
	cartSubtotal,
	clientPhone,
	currency,
}: {
	branchId: string | null;
	cartSubtotal: number;
	clientPhone?: string | null;
	currency: string;
}) {
	const t = useTranslations("tenant.cart.modal");
	const { appliedCouponCode, appliedCouponDiscount, setAppliedCoupon, clearAppliedCoupon } =
		useCart();

	const [draft, setDraft] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const phone = clientPhone?.trim() || undefined;

	// El descuento depende del subtotal: se revalida en silencio cuando el carrito cambia.
	useEffect(() => {
		if (!appliedCouponCode || !branchId) return;
		const controller = new AbortController();
		const timer = window.setTimeout(() => {
			previewCoupon(
				{ branchId, code: appliedCouponCode, subtotal: Math.round(cartSubtotal), clientPhone: phone },
				controller.signal,
			)
				.then(({ ok, payload }) => {
					if (!ok) {
						clearAppliedCoupon();
						return;
					}
					const discount = Math.round(Number(payload.discountAmount) || 0);
					const code = String(payload.normalizedCode ?? appliedCouponCode).trim().toUpperCase();
					const state = useTenantCartStore.getState();
					if (state.appliedCouponDiscount !== discount || state.appliedCouponCode !== code) {
						setAppliedCoupon(code, discount);
					}
				})
				.catch(() => {
					if (!controller.signal.aborted) clearAppliedCoupon();
				});
		}, 480);
		return () => {
			controller.abort();
			window.clearTimeout(timer);
		};
	}, [branchId, cartSubtotal, appliedCouponCode, phone, clearAppliedCoupon, setAppliedCoupon]);

	const errorMessage = (key: string | undefined, minSubtotal?: number): string => {
		if (key === "coupon_min_subtotal" && typeof minSubtotal === "number") {
			return t("coupon.errors.coupon_min_subtotal", { amount: formatCartMoney(minSubtotal, currency) });
		}
		const known = [
			"invalid_coupon",
			"coupon_expired",
			"coupon_phone_required",
			"coupon_wrong_client",
			"coupon_usage_exhausted",
			"coupon_usage_exhausted_client",
			"branch_not_found",
			"bad_request",
		];
		return t(`coupon.errors.${key && known.includes(key) ? key : "server"}`);
	};

	const apply = async () => {
		if (!branchId) return;
		const code = draft.trim();
		if (!code) {
			setError(t("coupon.errors.empty"));
			return;
		}
		setBusy(true);
		setError(null);
		try {
			const { ok, payload } = await previewCoupon({
				branchId,
				code,
				subtotal: Math.round(cartSubtotal),
				clientPhone: phone,
			});
			if (!ok) {
				setError(errorMessage(payload.error, payload.minSubtotal));
				return;
			}
			setAppliedCoupon(
				String(payload.normalizedCode ?? code).trim().toUpperCase(),
				Math.round(Number(payload.discountAmount) || 0),
			);
			setDraft("");
		} catch {
			setError(t("coupon.errors.server"));
		} finally {
			setBusy(false);
		}
	};

	if (!branchId) return null;

	return (
		<div className="cart-coupon">
			{appliedCouponCode && appliedCouponDiscount > 0 ? (
				<div className="cart-coupon__applied">
					<span>{t("coupon.applied", { code: appliedCouponCode })}</span>
					<button
						type="button"
						className="cart-link-btn"
						onClick={() => {
							clearAppliedCoupon();
							setError(null);
						}}
					>
						{t("coupon.remove")}
					</button>
				</div>
			) : (
				<div className="cart-coupon__row">
					<input
						type="text"
						className="cart-field cart-coupon__input"
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						placeholder={t("coupon.placeholder")}
						autoCapitalize="characters"
						autoCorrect="off"
						spellCheck={false}
						aria-label={t("coupon.inputAria")}
						disabled={busy}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.preventDefault();
								void apply();
							}
						}}
					/>
					<button type="button" className="cart-secondary-btn" disabled={busy} onClick={() => void apply()}>
						{busy ? <Loader2 className="cart-spin" size={16} aria-hidden /> : null}
						<span>{t("coupon.apply")}</span>
					</button>
				</div>
			)}
			{error ? (
				<p className="cart-hint cart-hint--error" role="alert">
					{error}
				</p>
			) : null}
		</div>
	);
}
