"use client";

import { useCallback, useState } from "react";

import type { MenuAccountView } from "./menu-account-types";

type RequestOptions = {
	method?: "GET" | "POST" | "PATCH";
	body?: Record<string, unknown>;
};

export type MenuAccountRequestResult<T> =
	| { ok: true; data: T }
	| { ok: false; code: string };

/**
 * Cliente de `/api/menu-account/*`.
 *
 * Deliberadamente usa `fetch` y no el cliente Supabase del navegador: la sesión del
 * cliente final vive en una cookie que escribe el servidor, y así el menú público
 * nunca instancia un cliente Supabase con ese scope (que rompería las políticas RLS
 * `TO anon` de las que depende el menú anónimo).
 */
async function requestMenuAccount<T>(
	path: string,
	options: RequestOptions = {},
): Promise<MenuAccountRequestResult<T>> {
	try {
		const response = await fetch(`/api/menu-account/${path}`, {
			method: options.method ?? "POST",
			credentials: "include",
			headers: options.body ? { "Content-Type": "application/json" } : undefined,
			body: options.body ? JSON.stringify(options.body) : undefined,
		});

		const payload = (await response.json().catch(() => null)) as
			| (T & { error?: string; code?: string })
			| null;

		if (!response.ok) {
			return { ok: false, code: payload?.code ?? "internal" };
		}
		return { ok: true, data: (payload ?? {}) as T };
	} catch {
		return { ok: false, code: "network" };
	}
}

export type UseMenuAccountState = {
	view: MenuAccountView;
	setView: (view: MenuAccountView) => void;
	pending: boolean;
	errorCode: string | null;
	setErrorCode: (code: string | null) => void;
	run: <T>(path: string, options?: RequestOptions) => Promise<MenuAccountRequestResult<T>>;
};

export function useMenuAccount(initialView: MenuAccountView): UseMenuAccountState {
	const [view, setView] = useState<MenuAccountView>(initialView);
	const [pending, setPending] = useState(false);
	const [errorCode, setErrorCode] = useState<string | null>(null);

	const run = useCallback(
		async <T,>(path: string, options?: RequestOptions): Promise<MenuAccountRequestResult<T>> => {
			setPending(true);
			setErrorCode(null);
			try {
				const result = await requestMenuAccount<T>(path, options);
				if (!result.ok) setErrorCode(result.code);
				return result;
			} finally {
				setPending(false);
			}
		},
		[],
	);

	return { view, setView, pending, errorCode, setErrorCode, run };
}
