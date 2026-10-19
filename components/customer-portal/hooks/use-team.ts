"use client";

import { useCallback, useEffect, useState } from "react";

import type { TeamSnapshot } from "@/lib/tenant/company-team";

const TEAM_ENDPOINT = "/api/customer-account/team";
const ROLES_ENDPOINT = "/api/customer-account/team/roles";

export type UseTeamReturn = {
	loading: boolean;
	saving: boolean;
	error: string | null;
	ok: string | null;
	team: TeamSnapshot | null;
	reload: () => Promise<void>;
	/** Guarda en el equipo (`member`) o en los roles (`role`); al salir bien recarga y muestra `okMessage`. */
	send: (target: "member" | "role", method: "POST" | "PUT" | "DELETE", body: Record<string, unknown>, okMessage: string) => Promise<boolean>;
	clearFeedback: () => void;
};

/** Equipo del negocio y sus roles propios (pestaña Equipo). */
export function useTeam(enabled: boolean): UseTeamReturn {
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [ok, setOk] = useState<string | null>(null);
	const [team, setTeam] = useState<TeamSnapshot | null>(null);

	const reload = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch(TEAM_ENDPOINT, { cache: "no-store" });
			const data = (await res.json().catch(() => ({}))) as Partial<TeamSnapshot> & { error?: string };
			if (!res.ok) {
				setError(data.error || "No se pudo cargar tu equipo.");
				return;
			}
			setTeam(data as TeamSnapshot);
		} catch {
			setError("No se pudo cargar tu equipo.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!enabled) return;
		void reload();
	}, [enabled, reload]);

	const send = useCallback<UseTeamReturn["send"]>(
		async (target, method, body, okMessage) => {
			setSaving(true);
			setError(null);
			setOk(null);
			try {
				const res = await fetch(target === "member" ? TEAM_ENDPOINT : ROLES_ENDPOINT, {
					method,
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body),
				});
				const data = (await res.json().catch(() => ({}))) as { error?: string };
				if (!res.ok) {
					setError(data.error || "No se pudo guardar.");
					return false;
				}
				setOk(okMessage);
				await reload();
				return true;
			} catch {
				setError("No se pudo guardar.");
				return false;
			} finally {
				setSaving(false);
			}
		},
		[reload],
	);

	const clearFeedback = useCallback(() => {
		setError(null);
		setOk(null);
	}, []);

	return { loading, saving, error, ok, team, reload, send, clearFeedback };
}
