// src/utils/cacheManager.ts
interface CacheEntry<T> {
    data: T;
    expiration: number;
}

class CacheManager<T> {
    private cache = new Map<string, CacheEntry<T>>();

    set(key: string, data: T, ttl: number = 600000): void {
        const expiration = Date.now() + ttl;
        this.cache.set(key, { data, expiration });
    }

    get(key: string): T | null {
        const cached = this.cache.get(key);
        if (!cached) return null;

        if (Date.now() > cached.expiration) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }
}

export default new CacheManager<any>();
