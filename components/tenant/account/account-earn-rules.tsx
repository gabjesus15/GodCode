"use client";

import { useFormatter, useTranslations } from "next-intl";

import { isPromoRule, type LoyaltyEarnRule } from "@/lib/loyalty/earn-rules-shared";

/** Solo las reglas que dan algo: una promo en 0 sirve para quitar puntos, no para mostrarse. */
export function visibleEarnRules(rules: readonly LoyaltyEarnRule[]): LoyaltyEarnRule[] {
	return rules.filter((rule) => rule.points > 0);
}

/** Texto de una regla en el idioma de la persona; los nombres de producto y categoría van tal cual. */
export function useDescribeEarnRule() {
	const t = useTranslations("tenant.account.rewards.earn");
	const format = useFormatter();
	return (rule: LoyaltyEarnRule): string => {
		const points = rule.points;
		if (rule.scope === "global") {
			return rule.mode === "per_order"
				? t("perOrder", { points })
				: t("perAmount", { points, amount: format.number(rule.perAmount ?? 0) });
		}
		if (rule.scope === "product") return t("product", { points, name: rule.productName ?? "" });
		return t("category", { points, name: rule.categoryName ?? "" });
	};
}

/** "Cómo sumar puntos": las reglas activas del negocio, con las promociones marcadas. */
export function AccountEarnRules({ rules }: { rules: readonly LoyaltyEarnRule[] }) {
	const t = useTranslations("tenant.account.rewards.earn");
	const format = useFormatter();
	const describe = useDescribeEarnRule();
	const visible = visibleEarnRules(rules);
	const date = (iso: string) => format.dateTime(new Date(iso), { day: "numeric", month: "short" });

	return (
		<section className="account-card-block account-earn" aria-label={t("title")}>
			<h3 className="account-block-title">{t("title")}</h3>
			{visible.length === 0 ? (
				<p className="account-note">{t("none")}</p>
			) : (
				<ul className="account-earn-list">
					{visible.map((rule) => (
						<li key={rule.id} className="account-earn-item">
							<span>{describe(rule)}</span>
							{isPromoRule(rule) ? (
								<span className="account-earn-promo">
									{rule.endsAt ? t("until", { date: date(rule.endsAt) }) : t("from", { date: date(rule.startsAt ?? "") })}
								</span>
							) : null}
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
