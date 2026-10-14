"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Check, Copy, Gift, Percent, Star, UtensilsCrossed, X } from "lucide-react";

import { formatCartMoney } from "@/components/tenant/cart/utils/format-cart-money";
import type { LoyaltyEarnRule } from "@/lib/loyalty/earn-rules-shared";

import { AccountEarnRules } from "./account-earn-rules";
import { AccountBusyLabel } from "./account-fields";
import { errorMessage } from "./menu-account-auth-panel";
import type { MenuAccountRedemption, MenuAccountReward } from "./menu-account-types";
import { useMenuAccount } from "./use-menu-account";

type RewardsData = {
	points: number;
	earnRules?: LoyaltyEarnRule[];
	rewards: MenuAccountReward[];
	redemptions: MenuAccountRedemption[];
	currency: string;
};

type RedeemResult = {
	redemption: { couponCode: string; validUntil: string | null; pointsLeft: number };
	points: number;
};

type MenuAccountRewardsProps = {
	companySlug: string;
	menuPath: string;
	/** Saldo que ya cargó el dashboard: el de la tarjeta se ve sin esperar las recompensas. */
	points: number | null;
	/** Deja al día el saldo de la tarjeta del inicio después de un canje. */
	onPointsChange: (points: number) => void;
};

/**
 * Sección Puntos: el saldo, las recompensas que armó el negocio en su panel y los
 * canjes hechos. Cada canje entrega un cupón de un solo uso para pegar en el carrito.
 */
export function MenuAccountRewards({ companySlug, menuPath, points, onPointsChange }: MenuAccountRewardsProps) {
	const t = useTranslations("tenant.account.rewards");
	const tAccount = useTranslations("tenant.account");
	const format = useFormatter();
	const load = useMenuAccount("login");
	const redeem = useMenuAccount("login");
	const [data, setData] = useState<RewardsData | null>(null);
	const [confirmId, setConfirmId] = useState<string | null>(null);
	const [redeemingId, setRedeemingId] = useState<string | null>(null);
	const [lastCoupon, setLastCoupon] = useState<RedeemResult["redemption"] | null>(null);
	/** Qué código se acaba de copiar: "last" (el recién canjeado) o el id del canje. */
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const loadRun = load.run;

	useEffect(() => {
		let cancelled = false;
		void loadRun<RewardsData>(`rewards?companySlug=${encodeURIComponent(companySlug)}`, { method: "GET" }).then(
			(result) => {
				if (cancelled || !result.ok) return;
				setData(result.data);
				onPointsChange(result.data.points);
			},
		);
		return () => {
			cancelled = true;
		};
		// onPointsChange es el setState del dashboard: estable.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [companySlug, loadRun]);

	const balance = data?.points ?? points;
	const money = (amount: number) => formatCartMoney(amount, data?.currency);
	const formatDate = (iso: string) => format.dateTime(new Date(iso), { day: "numeric", month: "short", year: "numeric" });

	const handleRedeem = async (reward: MenuAccountReward) => {
		setRedeemingId(reward.id);
		const result = await redeem.run<RedeemResult>("rewards/redeem", {
			body: { companySlug, rewardId: reward.id },
		});
		setRedeemingId(null);
		setConfirmId(null);
		if (!result.ok) return;
		setLastCoupon(result.data.redemption);
		setCopiedId(null);
		onPointsChange(result.data.points);
		window.scrollTo({ top: 0, behavior: "smooth" });
		// Recarga el saldo y "Mis canjes" con lo que quedó guardado.
		const fresh = await loadRun<RewardsData>(`rewards?companySlug=${encodeURIComponent(companySlug)}`, {
			method: "GET",
		});
		if (fresh.ok) setData(fresh.data);
		else setData((prev) => (prev ? { ...prev, points: result.data.points } : prev));
	};

	const handleCopy = async (code: string, id: string) => {
		try {
			await navigator.clipboard.writeText(code);
			setCopiedId(id);
		} catch {
			setCopiedId(null);
		}
	};

	const benefit = (reward: MenuAccountReward) => {
		if (reward.kind === "product" && reward.productName) {
			return t("benefitProduct", { amount: money(reward.discountValue), product: reward.productName });
		}
		return reward.discountType === "percent"
			? t("benefitPercent", { value: format.number(reward.discountValue) })
			: t("benefitAmount", { amount: money(reward.discountValue) });
	};

	return (
		<div className="account-panel account-rewards">
			{load.errorCode ? <p className="account-error">{errorMessage(tAccount, load.errorCode)}</p> : null}
			{/* El saldo se ve desde el primer momento (lo trae el dashboard) y debajo una
			   tarjeta "Cargando…" del mismo estilo que el vacío: nada parpadea al llegar. */}
			{data || !load.errorCode ? (
				<section className="account-card-block account-points" aria-label={t("balanceTitle")}>
					<span className="account-points-icon" aria-hidden>
						<Star size={22} fill="currentColor" />
					</span>
					<span className="account-points-body">
						<span className="account-points-title">{t("balanceTitle")}</span>
						<span className="account-points-value">
							{balance === null ? (
								<strong aria-busy="true">…</strong>
							) : (
								<>
									<strong>{format.number(balance)}</strong> {tAccount("home.points.unit", { count: balance })}
								</>
							)}
						</span>
					</span>
				</section>
			) : null}

			{!data && !load.errorCode ? (
				<p className="account-empty" aria-busy="true">
					{t("loading")}
				</p>
			) : null}

			{lastCoupon ? (
				<section className="account-card-block account-coupon" aria-live="polite">
					<span className="account-coupon-title">{t("doneTitle")}</span>
					<div className="account-coupon-code">
						<code>{lastCoupon.couponCode}</code>
						<button
							type="button"
							className="account-button account-button--ghost"
							onClick={() => handleCopy(lastCoupon.couponCode, "last")}
						>
							{copiedId === "last" ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
							{copiedId === "last" ? t("copied") : t("copy")}
						</button>
					</div>
					<p className="account-coupon-hint">
						{t("doneHint")}
						{lastCoupon.validUntil ? ` ${t("validUntil", { date: formatDate(lastCoupon.validUntil) })}` : ""}
					</p>
					<Link href={menuPath} className="account-button account-button--primary account-button--block">
						<UtensilsCrossed size={16} aria-hidden />
						{t("goToMenu")}
					</Link>
				</section>
			) : null}

			{data && data.redemptions.length > 0 ? (
				<section className="account-home-recent">
					<h3 className="account-home-heading">{t("historyTitle")}</h3>
					<ul className="account-reward-list">
						{data.redemptions.map((item) => {
							const usable = item.status === "available";
							return (
								<li key={item.id} className={`account-redemption ${usable ? "" : "is-closed"}`}>
									<div className="account-redemption-text">
										<span className="account-reward-title">{item.rewardTitle}</span>
										<span className="account-reward-meta">
											{t("redeemedOn", { date: formatDate(item.createdAt) })}
											{usable && item.validUntil ? ` · ${t("validUntil", { date: formatDate(item.validUntil) })}` : ""}
										</span>
										{item.couponCode ? (
											<span className="account-redemption-code-row">
												{/* Usado, vencido o anulado: el código queda a la vista pero tachado. */}
												{usable ? (
													<code className="account-redemption-code">{item.couponCode}</code>
												) : (
													<del className="account-redemption-code">{item.couponCode}</del>
												)}
												{usable ? (
													<button
														type="button"
														className="account-text-button account-redemption-copy"
														onClick={() => handleCopy(item.couponCode ?? "", item.id)}
													>
														{copiedId === item.id ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
														{copiedId === item.id ? t("copied") : t("copy")}
													</button>
												) : null}
											</span>
										) : null}
									</div>
									<span className={`account-redemption-status is-${item.status}`}>{t(`status.${item.status}`)}</span>
								</li>
							);
						})}
					</ul>
				</section>
			) : null}

			{redeem.errorCode ? <p className="account-error" role="alert">{errorMessage(tAccount, redeem.errorCode)}</p> : null}

			{data ? (
				<section className="account-home-recent">
					<h3 className="account-home-heading">{t("title")}</h3>
					{data.rewards.length === 0 ? (
						<div className="account-empty">
							<p>{t("empty")}</p>
						</div>
					) : (
						<ul className="account-reward-list">
							{data.rewards.map((reward) => {
								const missing = reward.pointsCost - data.points;
								const busy = redeemingId === reward.id;
								return (
									<li key={reward.id} className="account-reward">
										<div className="account-reward-top">
											{reward.productImageUrl ? (
												<Image
													src={reward.productImageUrl}
													alt=""
													width={56}
													height={56}
													unoptimized
													className="account-reward-image"
												/>
											) : (
												<span className="account-reward-icon" aria-hidden>
													{reward.kind === "discount" && reward.discountType === "percent" ? (
														<Percent size={22} />
													) : (
														<Gift size={22} />
													)}
												</span>
											)}
											<div className="account-reward-text">
												<span className="account-reward-title">{reward.title}</span>
												<span className="account-reward-benefit">{benefit(reward)}</span>
												{reward.description ? (
													<span className="account-reward-description">{reward.description}</span>
												) : null}
												<span className="account-reward-meta">
													{reward.minOrderSubtotal
														? `${t("minOrder", { amount: money(reward.minOrderSubtotal) })} · `
														: ""}
													{reward.validDays ? t("validDays", { count: reward.validDays }) : t("noExpiry")}
												</span>
											</div>
										</div>
										<div className="account-reward-foot">
											<span className="account-reward-cost">
												<Star size={14} fill="currentColor" aria-hidden />
												{t("cost", { count: reward.pointsCost })}
											</span>
											{confirmId === reward.id ? (
												<span className="account-confirm" role="group" aria-label={t("redeem")}>
													<span className="account-confirm__text">{t("confirm")}</span>
													<button
														type="button"
														className="account-button account-button--primary"
														onClick={() => handleRedeem(reward)}
														disabled={busy}
													>
														<AccountBusyLabel busy={busy} idle={t("confirmYes")} working={t("redeeming")} />
													</button>
													<button
														type="button"
														className="account-icon-button"
														onClick={() => setConfirmId(null)}
														disabled={busy}
														aria-label={t("cancel")}
													>
														<X size={16} aria-hidden />
													</button>
												</span>
											) : missing > 0 ? (
												<span className="account-reward-missing">{t("missing", { count: missing })}</span>
											) : (
												<button
													type="button"
													className="account-button account-button--primary"
													onClick={() => {
														redeem.setErrorCode(null);
														setConfirmId(reward.id);
													}}
													disabled={redeemingId !== null}
												>
													{t("redeem")}
												</button>
											)}
										</div>
									</li>
								);
							})}
						</ul>
					)}
				</section>
			) : null}

			{data ? <AccountEarnRules rules={data.earnRules ?? []} /> : null}

		</div>
	);
}
