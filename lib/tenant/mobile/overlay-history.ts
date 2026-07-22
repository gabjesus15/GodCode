"use client";

import { useEffect, useRef } from "react";

export type OverlayHistoryHandler = {
	id: string;
	priority: number;
	isActive: () => boolean;
	onPop: () => boolean;
};

const handlers: OverlayHistoryHandler[] = [];
const depthBySource = new Map<string, number>();
let listenerInstalled = false;
let programmaticNav = false;
let pushedDepth = 0;

function installPopstateListener() {
	if (listenerInstalled || typeof window === "undefined") return;
	listenerInstalled = true;
	window.addEventListener("popstate", () => {
		if (programmaticNav) return;
		const sorted = [...handlers].sort((a, b) => b.priority - a.priority);
		for (const handler of sorted) {
			if (!handler.isActive()) continue;
			if (handler.onPop()) return;
		}
	});
}

export function registerOverlayHistoryHandler(handler: OverlayHistoryHandler): () => void {
	installPopstateListener();
	handlers.push(handler);
	return () => {
		const index = handlers.findIndex((entry) => entry.id === handler.id);
		if (index >= 0) handlers.splice(index, 1);
	};
}

export function pushOverlayHistoryState(label?: string) {
	if (typeof window === "undefined") return;
	window.history.pushState({ gcOverlay: label ?? true }, "");
	pushedDepth += 1;
}

export function navigateOverlayHistoryBack(steps: number) {
	if (typeof window === "undefined" || steps <= 0) return;
	programmaticNav = true;
	pushedDepth = Math.max(0, pushedDepth - steps);
	window.history.go(-steps);
	window.setTimeout(() => {
		programmaticNav = false;
	}, 0);
}

function syncGlobalHistoryDepth(targetDepth: number) {
	if (typeof window === "undefined") return;
	if (targetDepth > pushedDepth) {
		for (let i = 0; i < targetDepth - pushedDepth; i += 1) {
			pushOverlayHistoryState("overlay");
		}
		return;
	}
	if (targetDepth < pushedDepth) {
		// Cierre programático (elegir sucursal, confirmar, etc.): solo ajustar contador.
		// history.go(-n) aquí compite con router.push/replace y puede mandar al home.
		// El gesto atrás del usuario ya consumió la entrada vía popstate + onPop.
		pushedDepth = targetDepth;
	}
}

export function useOverlayHistoryDepthSync(depth: number, sourceId: string) {
	const prevDepthRef = useRef(0);

	useEffect(() => {
		depthBySource.set(sourceId, depth);
		const totalDepth = [...depthBySource.values()].reduce((sum, value) => sum + value, 0);
		syncGlobalHistoryDepth(totalDepth);
		prevDepthRef.current = depth;

		return () => {
			depthBySource.delete(sourceId);
			const nextTotal = [...depthBySource.values()].reduce((sum, value) => sum + value, 0);
			syncGlobalHistoryDepth(nextTotal);
		};
	}, [depth, sourceId]);

	return prevDepthRef;
}

export function useOverlayHistoryHandler(handler: OverlayHistoryHandler) {
	const handlerRef = useRef(handler);

	useEffect(() => {
		handlerRef.current = handler;
	}, [handler]);

	useEffect(() => {
		return registerOverlayHistoryHandler({
			id: handler.id,
			priority: handler.priority,
			isActive: () => handlerRef.current.isActive(),
			onPop: () => handlerRef.current.onPop(),
		});
	}, [handler.id, handler.priority]);
}

export function getOverlayHistoryDepth(sourceId: string): number {
	return depthBySource.get(sourceId) ?? 0;
}

export function clearOverlayHistoryDepth(sourceId: string) {
	depthBySource.delete(sourceId);
	const nextTotal = [...depthBySource.values()].reduce((sum, value) => sum + value, 0);
	syncGlobalHistoryDepth(nextTotal);
}
