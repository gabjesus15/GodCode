import { kvStore } from "./kv-store";
import { logger } from "./logger";

/**
 * Contador de último recurso, por instancia.
 *
 * `UpstashRedisStore` ya cae a memoria cuando Redis no responde, así que llegar
 * aquí significa que falló algo inesperado en el propio store. Aun así, este
 * contador existe para que un fallo así nunca deje el rate limiting en nada:
 * degradado por instancia es mucho mejor que ausente.
 */
const lastResortCounters = new Map<string, { count: number; expiresAt: number }>();

function lastResortIncrement(key: string, windowMs: number): number {
	const now = Date.now();
	const existing = lastResortCounters.get(key);

	if (!existing || existing.expiresAt <= now) {
		lastResortCounters.set(key, { count: 1, expiresAt: now + windowMs });
		return 1;
	}

	existing.count += 1;
	return existing.count;
}

// Purga periódica para que el mapa no crezca sin límite si el store sigue caído.
if (typeof setInterval === "function") {
	const timer = setInterval(() => {
		const now = Date.now();
		for (const [key, entry] of lastResortCounters.entries()) {
			if (entry.expiresAt <= now) lastResortCounters.delete(key);
		}
	}, 60_000);
	// No mantener vivo el proceso solo por esta purga.
	(timer as unknown as { unref?: () => void }).unref?.();
}

/**
 * Devuelve `true` si la petición cabe dentro del límite, `false` si lo supera.
 *
 * Fail-safe, no fail-open: si el store de contadores falla, se cuenta contra un
 * mapa en memoria local. Antes este camino devolvía `true`, de modo que una
 * caída del KV desactivaba el rate limiting entero en silencio.
 */
export async function checkRateLimit(
	key: string,
	maxRequests: number,
	windowMs: number
): Promise<boolean> {
	const redisKey = `rate_limit:${key}`;
	const ttlSeconds = Math.max(1, Math.round(windowMs / 1000));

	try {
		const currentCount = await kvStore.incr(redisKey, ttlSeconds);
		return currentCount <= maxRequests;
	} catch (error) {
		const currentCount = lastResortIncrement(redisKey, windowMs);
		logger.error("rate_limit_store_failed", {
			key,
			error: error instanceof Error ? error.message : String(error),
			degraded: "in-memory-per-instance",
			currentCount,
		});
		return currentCount <= maxRequests;
	}
}
