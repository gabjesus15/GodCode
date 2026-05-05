const rateBuckets = new Map<string, { n: number; reset: number }>();

export function checkRateLimit(
	key: string,
	maxRequests: number,
	windowMs: number
): boolean {
	const now = Date.now();
	const bucket = rateBuckets.get(key);

	// Limpiar entradas expiradas ocasionalmente para evitar memory leaks en long-running processes
	if (Math.random() < 0.05) {
		for (const [k, v] of rateBuckets.entries()) {
			if (now > v.reset) rateBuckets.delete(k);
		}
	}

	if (!bucket || now > bucket.reset) {
		rateBuckets.set(key, { n: 1, reset: now + windowMs });
		return true;
	}

	if (bucket.n >= maxRequests) {
		console.warn(`[RATE_LIMIT_EXCEEDED] Key: ${key} | Max: ${maxRequests} | Window: ${windowMs}ms`);
		return false;
	}

	bucket.n += 1;
	return true;
}
