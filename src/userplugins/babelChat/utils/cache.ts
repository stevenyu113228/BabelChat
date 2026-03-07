export interface TranslationResult {
    text: string;
    skipped: boolean;
}

const MAX_ENTRIES = 500;
const cache = new Map<string, TranslationResult>();

export function getCached(key: string): TranslationResult | undefined {
    return cache.get(key);
}

export function setCache(key: string, value: TranslationResult): void {
    if (cache.size >= MAX_ENTRIES) {
        const firstKey = cache.keys().next().value!;
        cache.delete(firstKey);
    }
    cache.set(key, value);
}
