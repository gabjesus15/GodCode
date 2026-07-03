"use client";

import { useEffect, useRef } from "react";
import { registerOverlayHistoryHandler } from "@/lib/tenant/mobile/overlay-history";

export type MenuOverlayConfig = {
	id: string;
	priority: number;
	isOpen: boolean;
	onClose: () => void;
};

export function useMenuOverlayHistory(overlays: MenuOverlayConfig[]) {
	const overlaysRef = useRef(overlays);
	overlaysRef.current = overlays;

	useEffect(() => {
		const disposers = overlaysRef.current.map((overlay) =>
			registerOverlayHistoryHandler({
				id: overlay.id,
				priority: overlay.priority,
				isActive: () => {
					const current = overlaysRef.current.find((item) => item.id === overlay.id);
					return Boolean(current?.isOpen);
				},
				onPop: () => {
					const current = overlaysRef.current.find((item) => item.id === overlay.id);
					if (!current?.isOpen) return false;
					current.onClose();
					return true;
				},
			}),
		);
		return () => {
			for (const dispose of disposers) dispose();
		};
	}, [overlays.map((overlay) => `${overlay.id}:${overlay.priority}`).join("|")]);
}
