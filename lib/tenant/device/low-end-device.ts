/** Señales disponibles en el navegador (sin user-agent frágil). */
export type LowEndDeviceSignals = {
	hardwareConcurrency?: number;
	deviceMemoryGb?: number;
	saveData?: boolean;
	effectiveConnectionType?: string;
	prefersReducedMotion?: boolean;
	isMobileViewport?: boolean;
};

export const LOW_END_PERFORMANCE_SCORE_THRESHOLD = 70;

/**
 * Puntuación heurística 0–100. Por debajo de 70 tratamos el dispositivo como gama baja
 * (p. ej. Samsung A50: 4 GB RAM → ~65 aunque tenga 8 núcleos).
 */
export function scoreDevicePerformance(signals: LowEndDeviceSignals): number {
	let score = 100;

	const cores = signals.hardwareConcurrency ?? 4;
	if (cores <= 4) score -= 25;
	else if (cores <= 6) score -= 10;

	const memory = signals.deviceMemoryGb;
	if (memory !== undefined) {
		if (memory <= 2) score -= 35;
		else if (memory <= 4) score -= 35;
		else if (memory <= 6) score -= 12;
	}

	if (signals.saveData) score -= 30;

	const network = signals.effectiveConnectionType?.toLowerCase() ?? "";
	if (network === "slow-2g" || network === "2g") score -= 40;
	else if (network === "3g") score -= 20;

	if (signals.prefersReducedMotion) score -= 15;

	if (signals.isMobileViewport && memory !== undefined && memory <= 4) {
		score -= 5;
	}

	return Math.max(0, Math.min(100, score));
}

export function isLowEndDeviceFromSignals(
	signals: LowEndDeviceSignals,
	threshold = LOW_END_PERFORMANCE_SCORE_THRESHOLD,
): boolean {
	return scoreDevicePerformance(signals) < threshold;
}

/** Lectura segura en cliente; en SSR devuelve false. */
export function readLowEndDeviceSignals(): LowEndDeviceSignals | null {
	if (typeof window === "undefined") return null;

	const nav = navigator as Navigator & {
		deviceMemory?: number;
		connection?: {
			saveData?: boolean;
			effectiveType?: string;
		};
	};

	return {
		hardwareConcurrency: nav.hardwareConcurrency,
		deviceMemoryGb: nav.deviceMemory,
		saveData: nav.connection?.saveData,
		effectiveConnectionType: nav.connection?.effectiveType,
		prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
		isMobileViewport: window.matchMedia("(max-width: 768px)").matches,
	};
}

export function detectLowEndDevice(): boolean {
	const signals = readLowEndDeviceSignals();
	if (!signals) return false;
	return isLowEndDeviceFromSignals(signals);
}
