import { kvStore } from "../infra/kv-store";

export async function isRateLimited(key: string, limit: number, windowMs: number): Promise<boolean> {
  const redisKey = `rate_limit:${key}`;
  const ttlSeconds = Math.max(1, Math.round(windowMs / 1000));

  try {
    const currentCount = await kvStore.incr(redisKey, ttlSeconds);
    if (currentCount > limit) {
      return true;
    }
    return false;
  } catch (err) {
    // Graceful degradation: fallback silently if KV store fails
    return false;
  }
}
