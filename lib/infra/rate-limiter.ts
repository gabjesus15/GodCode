import { kvStore } from "./kv-store";

export async function checkRateLimit(
	key: string,
	maxRequests: number,
	windowMs: number
): Promise<boolean> {
	const redisKey = `rate_limit:${key}`;
	const ttlSeconds = Math.max(1, Math.round(windowMs / 1000));

	try {
		const currentCount = await kvStore.incr(redisKey, ttlSeconds);
		if (currentCount > maxRequests) {
			console.warn(`[RATE_LIMIT_EXCEEDED] Key: ${key} | Max: ${maxRequests} | Window: ${windowMs}ms`);
			return false;
		}
		return true;
	} catch (err) {
		// Graceful degradation: fallback silently if KV store operations fail
		return true;
	}
}

