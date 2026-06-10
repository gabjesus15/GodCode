/**
 * Distribución de persistencia de baja latencia para entornos serverless (Vercel).
 * Soporta Upstash Redis REST API (fetch sin dependencias nativas) y fallback en memoria.
 */

import { logger } from "./logger";

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  incr(key: string, ttlSeconds?: number): Promise<number>;
  delete(key: string): Promise<void>;
}

class InMemoryKeyValueStore implements KeyValueStore {
  private store = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string): Promise<string | null> {
    const now = Date.now();
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && now > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0;
    this.store.set(key, { value, expiresAt });
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const now = Date.now();
    const item = this.store.get(key);
    let currentVal = 0;
    let isNew = false;

    if (!item || (item.expiresAt && now > item.expiresAt)) {
      currentVal = 1;
      isNew = true;
    } else {
      currentVal = parseInt(item.value, 10) || 0;
      currentVal += 1;
    }

    const expiresAt = isNew && ttlSeconds 
      ? now + ttlSeconds * 1000 
      : (item?.expiresAt ?? 0);

    this.store.set(key, { value: String(currentVal), expiresAt });
    return currentVal;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  // Limpieza periódica de expirados para evitar leaks de memoria
  cleanExpired() {
    const now = Date.now();
    for (const [k, v] of this.store.entries()) {
      if (v.expiresAt && now > v.expiresAt) {
        this.store.delete(k);
      }
    }
  }
}

class UpstashRedisStore implements KeyValueStore {
  private url: string;
  private token: string;
  private fallbackStore: InMemoryKeyValueStore;

  constructor(url: string, token: string) {
    // Normalizar URL (asegurar que no termina con /)
    this.url = url.trim().replace(/\/$/, "");
    this.token = token.trim();
    this.fallbackStore = new InMemoryKeyValueStore();
  }

  private async request<T>(command: string[]): Promise<{ result: T } | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 segundos timeout max

    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      return await res.json();
    } catch (err) {
      clearTimeout(timeoutId);
      logger.warn("Upstash Redis error, falling back to Memory", {
        command: command[0],
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  async get(key: string): Promise<string | null> {
    const res = await this.request<string | null>(["GET", key]);
    if (res === null) {
      return this.fallbackStore.get(key);
    }
    return res.result;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const command = ttlSeconds 
      ? ["SET", key, value, "EX", String(ttlSeconds)]
      : ["SET", key, value];

    const res = await this.request<string>(command);
    if (res === null) {
      await this.fallbackStore.set(key, value, ttlSeconds);
    }
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const res = await this.request<number>(["INCR", key]);
    if (res === null) {
      return this.fallbackStore.incr(key, ttlSeconds);
    }

    const currentVal = Number(res.result);
    // Si acaba de crearse (es 1) y tiene TTL, aplicamos expiración
    if (currentVal === 1 && ttlSeconds) {
      await this.request<number>(["EXPIRE", key, String(ttlSeconds)]);
    }

    return currentVal;
  }

  async delete(key: string): Promise<void> {
    const res = await this.request<number>(["DEL", key]);
    if (res === null) {
      await this.fallbackStore.delete(key);
    }
  }
}

// Inicializar el KeyValueStore adecuado según env vars
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

export const kvStore: KeyValueStore = (upstashUrl && upstashToken)
  ? new UpstashRedisStore(upstashUrl, upstashToken)
  : new InMemoryKeyValueStore();

// Si estamos en InMemory, lanzar limpieza periódica
if (!(upstashUrl && upstashToken)) {
  setInterval(() => {
    (kvStore as InMemoryKeyValueStore).cleanExpired();
  }, 60_000);
}
