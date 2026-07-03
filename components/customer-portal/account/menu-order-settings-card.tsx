"use client";

import { MessageCircle, ShoppingCart, Monitor } from "lucide-react";

import type { OrderChannelMode } from "@/lib/tenant/menu-settings";
import { Alert } from "../ui/Alert";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";

const CHANNEL_OPTIONS: Array<{
	value: OrderChannelMode;
	title: string;
	description: string;
	icon: typeof MessageCircle;
}> = [
	{
		value: "both",
		title: "Panel CEO y WhatsApp",
		description: "El pedido se registra en tu panel y se abre WhatsApp con el resumen (comportamiento actual).",
		icon: Monitor,
	},
	{
		value: "whatsapp_only",
		title: "Solo WhatsApp",
		description: "El cliente usa el carrito normal, pero el pedido no llega al panel CEO. Se envía solo por WhatsApp.",
		icon: MessageCircle,
	},
	{
		value: "panel_only",
		title: "Solo panel CEO",
		description: "El pedido se guarda en tu panel sin abrir WhatsApp al finalizar.",
		icon: ShoppingCart,
	},
];

export type MenuOrderSettingsCardProps = {
	loading: boolean;
	saving: boolean;
	error: string | null;
	ok: string | null;
	cartEnabled: boolean;
	orderChannel: OrderChannelMode;
	planAllowsOnlineOrdering: boolean;
	dirty: boolean;
	onCartEnabledChange: (enabled: boolean) => void;
	onOrderChannelChange: (channel: OrderChannelMode) => void;
	onSave: () => void;
};

export function MenuOrderSettingsCard({
	loading,
	saving,
	error,
	ok,
	cartEnabled,
	orderChannel,
	planAllowsOnlineOrdering,
	dirty,
	onCartEnabledChange,
	onOrderChannelChange,
	onSave,
}: MenuOrderSettingsCardProps) {
	if (loading) {
		return (
			<Card className="space-y-3 p-4 sm:p-5">
				<Skeleton className="h-6 w-48" />
				<Skeleton className="h-4 w-full max-w-md" />
				<Skeleton className="h-24 w-full" />
			</Card>
		);
	}

	return (
		<Card className="space-y-4 p-4 sm:p-5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="space-y-1">
					<h2 className="text-base font-semibold text-[#1d1d1f]">Carrito y pedidos</h2>
					<p className="text-sm text-[#6e6e73]">
						Controla si el menú muestra carrito y cómo llegan los pedidos a tu negocio.
					</p>
				</div>
				{dirty ? <Badge variant="warning">Cambios sin guardar</Badge> : null}
			</div>

			{error ? <Alert variant="danger">{error}</Alert> : null}
			{ok ? <Alert variant="success">{ok}</Alert> : null}

			{!planAllowsOnlineOrdering ? (
				<Alert variant="warning">
					Tu plan actual no incluye pedidos en línea. El carrito permanece desactivado hasta que actualices el plan.
				</Alert>
			) : null}

			<label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e5e5ea] bg-[#fbfbfd] p-3.5">
				<input
					type="checkbox"
					className="mt-1 h-4 w-4 rounded border-[#c7c7cc] accent-[#0071e3]"
					checked={cartEnabled && planAllowsOnlineOrdering}
					disabled={!planAllowsOnlineOrdering || saving}
					onChange={(e) => onCartEnabledChange(e.target.checked)}
				/>
				<span className="space-y-0.5">
					<span className="block text-sm font-medium text-[#1d1d1f]">Mostrar carrito en el menú</span>
					<span className="block text-sm text-[#6e6e73]">
						Si lo desactivas, el menú funciona como catálogo: sin botón de carrito ni agregar productos.
					</span>
				</span>
			</label>

			{cartEnabled && planAllowsOnlineOrdering ? (
				<div className="space-y-2">
					<p className="text-sm font-medium text-[#1d1d1f]">Canal de pedidos</p>
					<div className="grid gap-2">
						{CHANNEL_OPTIONS.map((option) => {
							const Icon = option.icon;
							const selected = orderChannel === option.value;
							return (
								<button
									key={option.value}
									type="button"
									disabled={saving}
									onClick={() => onOrderChannelChange(option.value)}
									className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors ${
										selected
											? "border-[#0071e3] bg-[#f0f7ff]"
											: "border-[#e5e5ea] bg-white hover:border-[#c7c7cc]"
									}`}
								>
									<Icon
										size={18}
										className={`mt-0.5 shrink-0 ${selected ? "text-[#0071e3]" : "text-[#6e6e73]"}`}
									/>
									<span className="space-y-0.5">
										<span className="block text-sm font-medium text-[#1d1d1f]">{option.title}</span>
										<span className="block text-sm text-[#6e6e73]">{option.description}</span>
									</span>
								</button>
							);
						})}
					</div>
					{orderChannel !== "panel_only" ? (
						<p className="text-xs text-[#6e6e73]">
							Asegúrate de tener el teléfono de WhatsApp configurado en Perfil público o en cada sucursal.
						</p>
					) : null}
				</div>
			) : null}

			<div className="flex justify-end">
				<Button
					variant="primary"
					disabled={!dirty || saving || (!planAllowsOnlineOrdering && cartEnabled)}
					onClick={onSave}
				>
					{saving ? "Guardando…" : "Guardar configuración"}
				</Button>
			</div>
		</Card>
	);
}
