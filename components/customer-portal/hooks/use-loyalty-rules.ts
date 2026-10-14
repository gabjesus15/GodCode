"use client";

import { useCallback, useEffect, useState } from "react";

import type { LoyaltyEarnRule, LoyaltyEarnRuleInput } from "@/lib/loyalty/earn-rules-shared";

export type LoyaltyCatalogProduct = { id: string; name: string; categoryId: string | null };
export type LoyaltyCatalogCategory = { id: string; name: string };

export type UseLoyaltyRulesReturn = {
	loading: boolean;
	saving: boolean;
	error: string | null;
	rules: LoyaltyEarnRule[];
	products: LoyaltyCatalogProduct[];
	categories: LoyaltyCatalogCategory[];
	/** Crea (sin id) o edita una regla. Devuelve si se guardó. */
	saveRule: (input: LoyaltyEarnRuleInput, id?: string) => Promise<boolean>;
	deleteRule: (id: string) => Promise<boolean>;
	clearError: () => void;
};

const ENDPOINT = "/api/customer-account/loyalty-rules";

/** Reglas de puntos del negocio (/cuenta › Mi menú). Solo carga cuando `enabled`. */
export function useLoyaltyRules(enabled: boolean): UseLoyaltyRulesReturn {
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [rules, setRules] = useState<LoyaltyEarnRule[]>([]);
	const [products, setProducts] = useState<LoyaltyCatalogProduct[]>([]);
	const [categories, setCategories] = useState<LoyaltyCatalogCategory[]>([]);

	const reload = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(ENDPOINT, { cache: "no-store" });
			const data = (await res.json().catch(() => ({}))) as {
				rules?: LoyaltyEarnRule[];
				products?: LoyaltyCatalogProduct[];
				categories?: LoyaltyCatalogCategory[];
				error?: string;
			};
			if (!res.ok) {
				setError(data.error || "No se pudieron cargar las reglas de puntos.");
				return;
			}
			setRules(data.rules ?? []);
			setProducts(data.products ?? []);
			setCategories(data.categories ?? []);
		} catch {
			setError("No se pudieron cargar las reglas de puntos.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!enabled) return;
		void reload();
	}, [enabled, reload]);

	const saveRule = useCallback(async (input: LoyaltyEarnRuleInput, id?: string) => {
		setSaving(true);
		setError(null);
		try {
			const res = await fetch(id ? `${ENDPOINT}?id=${encodeURIComponent(id)}` : ENDPOINT, {
				method: id ? "PATCH" : "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			const data = (await res.json().catch(() => ({}))) as { rule?: LoyaltyEarnRule; error?: string };
			if (!res.ok || !data.rule) {
				setError(data.error || "No se pudo guardar la regla.");
				return false;
			}
			const saved = data.rule;
			setRules((prev) => (id ? prev.map((rule) => (rule.id === id ? saved : rule)) : [...prev, saved]));
			return true;
		} catch {
			setError("No se pudo guardar la regla.");
			return false;
		} finally {
			setSaving(false);
		}
	}, []);

	const deleteRule = useCallback(async (id: string) => {
		setSaving(true);
		setError(null);
		try {
			const res = await fetch(`${ENDPOINT}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
			const data = (await res.json().catch(() => ({}))) as { error?: string };
			if (!res.ok) {
				setError(data.error || "No se pudo borrar la regla.");
				return false;
			}
			setRules((prev) => prev.filter((rule) => rule.id !== id));
			return true;
		} catch {
			setError("No se pudo borrar la regla.");
			return false;
		} finally {
			setSaving(false);
		}
	}, []);

	return {
		loading,
		saving,
		error,
		rules,
		products,
		categories,
		saveRule,
		deleteRule,
		clearError: () => setError(null),
	};
}
