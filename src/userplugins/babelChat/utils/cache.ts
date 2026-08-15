import * as DataStore from "@api/DataStore";

export interface TranslationResult {
    text: string;
    skipped: boolean;
}

const MAX_ENTRIES = 5000;
const PERSIST_KEY = "BabelChat_translationCache";
const PERSIST_DEBOUNCE_MS = 250;

const cache = new Map<string, TranslationResult>();

let loadPromise: Promise<void> | null = null;
let loaded = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let persistChain: Promise<void> = Promise.resolve();
let visibilityListenerAttached = false;

export function makeCacheKey(content: string, lang: string): string {
    return content.trim() + "\0" + lang;
}

export function getCached(key: string): TranslationResult | undefined {
    return cache.get(key);
}

export function setCache(key: string, value: TranslationResult): void {
    if (cache.size >= MAX_ENTRIES) {
        const firstKey = cache.keys().next().value!;
        cache.delete(firstKey);
    }
    cache.set(key, value);
    if (loaded) schedulePersist();
}

export function initCache(): Promise<void> {
    if (!loadPromise) loadPromise = loadFromIdb();
    return loadPromise;
}

export function flushCache(): Promise<void> {
    if (!loaded) return Promise.resolve();
    if (persistTimer != null) {
        clearTimeout(persistTimer);
        persistTimer = null;
    }
    persistChain = persistChain.then(persistToIdb, persistToIdb);
    return persistChain;
}

function schedulePersist() {
    if (persistTimer != null) return;
    persistTimer = setTimeout(() => {
        persistTimer = null;
        void flushCache();
    }, PERSIST_DEBOUNCE_MS);
}

function isTranslationResult(value: unknown): value is TranslationResult {
    return typeof value === "object" && value !== null
        && typeof (value as TranslationResult).text === "string"
        && typeof (value as TranslationResult).skipped === "boolean";
}

function attachVisibilityFlush() {
    if (visibilityListenerAttached) return;
    visibilityListenerAttached = true;
    const flush = () => void flushCache();
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") flush();
    });
    window.addEventListener("pagehide", flush);
}

async function persistToIdb() {
    try {
        await DataStore.set(PERSIST_KEY, [...cache.entries()]);
    } catch (e) {
        console.error("[BabelChat] Failed to persist translation cache", e);
    }
}

async function loadFromIdb() {
    attachVisibilityFlush();
    const pending = [...cache.entries()];
    let didLoad = false;
    try {
        const stored = await DataStore.get<unknown>(PERSIST_KEY);
        cache.clear();
        if (Array.isArray(stored)) {
            for (const entry of stored) {
                if (!Array.isArray(entry) || entry.length !== 2) continue;
                const [key, value] = entry;
                if (typeof key !== "string" || !isTranslationResult(value)) continue;
                cache.set(key, value);
            }
        }
        for (const [key, value] of pending) {
            if (cache.size >= MAX_ENTRIES) {
                const firstKey = cache.keys().next().value!;
                cache.delete(firstKey);
            }
            cache.set(key, value);
        }
        while (cache.size > MAX_ENTRIES) {
            cache.delete(cache.keys().next().value!);
        }
        didLoad = true;
    } catch (e) {
        console.error("[BabelChat] Failed to load translation cache", e);
        for (const [key, value] of pending) {
            if (!cache.has(key)) cache.set(key, value);
        }
    } finally {
        loaded = true;
        if (didLoad && pending.length) schedulePersist();
    }
}
