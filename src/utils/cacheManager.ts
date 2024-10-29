// src/utils/cacheManager.ts

interface CacheEntry {
    data: any;
    expiration: number;
}

const cache = new Map<string, CacheEntry>();

function set(videoId: string, data: any, ttl: number = 600000): void {
    const expiration = Date.now() + ttl;
    cache.set(videoId, { data, expiration });
}

function get(videoId: string): any | null {
    const cached = cache.get(videoId);
    if (!cached) return null;

    if (Date.now() > cached.expiration) {
        cache.delete(videoId);
        return null;
    }

    return cached.data;
}

export { set, get };
