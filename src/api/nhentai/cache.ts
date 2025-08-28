import { LRUCache } from 'lru-cache';

export interface CacheOptions {
    max?: number;
    ttl?: number; // ms
}

export class SimpleCache {
    private cache: LRUCache<string, any>;
    private inflight: Map<string, Promise<any>> = new Map();

    constructor(opts: CacheOptions = {}) {
        this.cache = new LRUCache<string, any>({
            max: opts.max ?? 500,
            ttl: opts.ttl ?? 60 * 1000,
        });
    }

    get<T>(key: string): T | undefined {
        return this.cache.get(key) as T | undefined;
    }

    set<T>(key: string, value: T, ttl?: number) {
        this.cache.set(key, value, { ttl });
    }

    async getOrSet<T>(key: string, cb: () => Promise<T>, ttl?: number): Promise<T> {
        const existing = this.get<T>(key);
        if (existing !== undefined) return existing;

        // dedupe inflight requests
        const pending = this.inflight.get(key) as Promise<T> | undefined;
        if (pending) return pending;

        const p = (async () => {
            try {
                const v = await cb();
                this.set(key, v, ttl);
                return v;
            } finally {
                this.inflight.delete(key);
            }
        })();

        this.inflight.set(key, p);
        return p;
    }
}
