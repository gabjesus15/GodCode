"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, KeyRound } from "lucide-react";

import { requireAdminRole, roleSets } from "@/utils/admin";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";

type Props = {
	companyId: string;
	initialClientId: string;
	initialCustomerId?: string;
	hasClientSecret: boolean;
	/** Si false, el panel CEO no muestra la estrategia “Consultar / externo” por sucursal. */
	initialAllowTenantExternalDelivery?: boolean;
};

export function CompanyUberCredentialsForm({
	companyId,
	initialClientId,
	initialCustomerId = "",
	hasClientSecret: initialHasSecret,
	initialAllowTenantExternalDelivery = true,
}: Props) {
	const { readOnly } = useAdminRole();
	const [clientId, setClientId] = useState(initialClientId);
	const [customerId, setCustomerId] = useState(initialCustomerId);
	const [clientSecret, setClientSecret] = useState("");
	const [clearSecret, setClearSecret] = useState(false);
	const [hasSecret, setHasSecret] = useState(initialHasSecret);
	const [allowTenantExternalDelivery, setAllowTenantExternalDelivery] = useState(
		initialAllowTenantExternalDelivery,
	);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [savingPolicy, setSavingPolicy] = useState(false);
	/** Credenciales ocultas por defecto; el formulario sensible solo al expandir. */
	const [credentialsVisible, setCredentialsVisible] = useState(false);

	const hasLocalConfig = Boolean(clientId.trim() || customerId.trim() || hasSecret);

	const onSavePolicy = async () => {
		const auth = await requireAdminRole(roleSets.billing);
		if (!auth.ok) {
			setError(auth.error);
			return;
		}
		setError(null);
		setMessage(null);
		setSavingPolicy(true);
		try {
			const res = await fetch("/api/super-admin/company-integration-uber", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					companyId,
					allowTenantExternalDelivery,
				}),
			});
			const data = (await res.json()) as
				| { ok: true; allowTenantExternalDelivery?: boolean }
				| { ok: false; error?: string };
			if (!res.ok || !data.ok) {
				setError(data.ok ? "Error al guardar" : (data.error ?? "Error al guardar"));
				return;
			}
			if (typeof data.allowTenantExternalDelivery === "boolean") {
				setAllowTenantExternalDelivery(data.allowTenantExternalDelivery);
			}
			setMessage("Política del panel negocio actualizada.");
		} catch {
			setError("No se pudo guardar.");
		} finally {
			setSavingPolicy(false);
		}
	};

	const onSave = async () => {
		const auth = await requireAdminRole(roleSets.billing);
		if (!auth.ok) {
			setError(auth.error);
			return;
		}
		setError(null);
		setMessage(null);
		setSaving(true);
		try {
			const res = await fetch("/api/super-admin/company-integration-uber", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					companyId,
					clientId: clientId.trim(),
					customerId: customerId.trim(),
					allowTenantExternalDelivery,
					...(clearSecret ? { clearClientSecret: true } : {}),
					...(clientSecret.trim() ? { clientSecret: clientSecret.trim() } : {}),
				}),
			});
			const data = (await res.json()) as
				| {
						ok: true;
						uberClientId?: string;
						uberCustomerId?: string;
						hasClientSecret?: boolean;
				  }
				| { ok: false; error?: string };
			if (!res.ok || !data.ok) {
				setError(data.ok ? "Error al guardar" : (data.error ?? "Error al guardar"));
				return;
			}
			if (data.uberClientId !== undefined) setClientId(data.uberClientId);
			if (data.uberCustomerId !== undefined) setCustomerId(data.uberCustomerId);
			if (data.hasClientSecret !== undefined) setHasSecret(data.hasClientSecret);
			if (
				"allowTenantExternalDelivery" in data &&
				typeof data.allowTenantExternalDelivery === "boolean"
			) {
				setAllowTenantExternalDelivery(data.allowTenantExternalDelivery);
			}
			setClientSecret("");
			setClearSecret(false);
			setMessage("Integración Uber guardada.");
		} catch {
			setError("No se pudo guardar.");
		} finally {
			setSaving(false);
		}
	};

	const handleHideCredentials = () => {
		setCredentialsVisible(false);
		setClientSecret("");
		setClearSecret(false);
		setError(null);
		setMessage(null);
	};

	return (
		<div className="min-w-0 rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 sm:p-5">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0 flex gap-3">
					<span
						className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
						aria-hidden
					>
						<KeyRound className="h-4 w-4" />
					</span>
					<div className="min-w-0">
						<h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 sm:text-lg">
							Uber Direct (empresa)
						</h3>
						<p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
							Credenciales OAuth por empresa; cada sucursal con Uber usa el mismo par. El store id
							se configura por sucursal.
						</p>
						{!credentialsVisible ? (
							<p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
								<span className="font-medium">Estado en panel:</span>{" "}
								{hasLocalConfig ? (
									<span className="text-emerald-700 dark:text-emerald-400">
										hay datos guardados o en edición
									</span>
								) : (
									<span className="text-zinc-500">sin credenciales en este formulario</span>
								)}
								<span className="text-zinc-400 dark:text-zinc-500">
									{" "}
									(los valores no se muestran hasta que expandes)
								</span>
							</p>
						) : null}
					</div>
				</div>
				<div className="flex shrink-0 flex-wrap justify-end gap-2">
					{credentialsVisible ? (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleHideCredentials}
							className="gap-1.5"
						>
							<ChevronUp className="h-4 w-4" aria-hidden />
							Ocultar
						</Button>
					) : (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setCredentialsVisible(true)}
							className="gap-1.5"
						>
							<ChevronDown className="h-4 w-4" aria-hidden />
							Mostrar credenciales
						</Button>
					)}
				</div>
			</div>

			<div className="mt-4 rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-700/80 dark:bg-zinc-950/40">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-start gap-2">
						<Checkbox
							id="uber-allow-tenant-external"
							checked={allowTenantExternalDelivery}
							onCheckedChange={(v) => setAllowTenantExternalDelivery(v === true)}
						/>
						<div className="min-w-0">
							<label
								htmlFor="uber-allow-tenant-external"
								className="cursor-pointer text-sm font-medium text-zinc-800 dark:text-zinc-200"
							>
								Mostrar en el panel del negocio la opción «Consultar con tienda / externo»
							</label>
							<p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
								Si lo desactivas, en el panel CEO no podrán elegir Uber Direct ni la modalidad
								externa por sucursal (útil para cuentas donde solo GodCode configura envío).
							</p>
						</div>
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="shrink-0 self-start sm:self-center"
						onClick={() => void onSavePolicy()}
						disabled={readOnly || savingPolicy}
					>
						{savingPolicy ? "Guardando…" : "Guardar política"}
					</Button>
				</div>
			</div>

			{credentialsVisible ? (
				<>
					<p className="mt-4 text-xs text-amber-800 dark:text-amber-200/90">
						El Client Secret se guarda cifrado. Requiere{" "}
						<code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
							UBER_SECRETS_ENCRYPTION_KEY
						</code>{" "}
						en el servidor.
					</p>
					<div className="mt-4 space-y-4">
						<div className="min-w-0">
							<label
								htmlFor="uber-co-client-id"
								className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
							>
								Uber Client ID
							</label>
							<Input
								id="uber-co-client-id"
								value={clientId}
								onChange={(e) => setClientId(e.target.value)}
								className="mt-1 w-full min-w-0 font-mono text-sm"
								autoComplete="off"
								placeholder="Opcional si usas solo variables de entorno globales"
							/>
						</div>
						<div className="min-w-0">
							<label
								htmlFor="uber-co-customer-id"
								className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
							>
								Uber Customer ID
							</label>
							<Input
								id="uber-co-customer-id"
								value={customerId}
								onChange={(e) => setCustomerId(e.target.value)}
								className="mt-1 w-full min-w-0 font-mono text-sm"
								autoComplete="off"
								placeholder="ID de empresa entregado por Uber Direct"
							/>
						</div>
						<div className="min-w-0">
							<label
								htmlFor="uber-co-client-secret"
								className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
							>
								Uber Client Secret
							</label>
							<Input
								id="uber-co-client-secret"
								type="password"
								value={clientSecret}
								onChange={(e) => setClientSecret(e.target.value)}
								className="mt-1 w-full min-w-0 font-mono text-sm"
								autoComplete="new-password"
								placeholder={
									hasSecret ? "Dejar vacío para no cambiar" : "Pegar secret de Uber"
								}
							/>
							{hasSecret ? (
								<p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
									Hay un secret guardado (cifrado). Escribe uno nuevo solo si quieres
									reemplazarlo.
								</p>
							) : null}
						</div>
						{hasSecret ? (
							<div className="flex items-center gap-2">
								<Checkbox
									id="uber-co-clear-secret"
									checked={clearSecret}
									onCheckedChange={(v) => setClearSecret(v === true)}
								/>
								<label
									htmlFor="uber-co-clear-secret"
									className="cursor-pointer text-sm text-zinc-700 dark:text-zinc-300"
								>
									Eliminar Client Secret guardado
								</label>
							</div>
						) : null}
						{error ? (
							<div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
								{error}
							</div>
						) : null}
						{message ? (
							<div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-200">
								{message}
							</div>
						) : null}
						<div className="flex flex-wrap justify-end gap-2">
							<Button type="button" variant="outline" onClick={handleHideCredentials}>
								Ocultar sin guardar
							</Button>
							<Button type="button" onClick={onSave} disabled={readOnly || saving}>
								{saving ? "Guardando…" : "Guardar credenciales Uber"}
							</Button>
						</div>
					</div>
				</>
			) : null}
		</div>
	);
}
