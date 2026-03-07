import { translateIfIdle } from "../components/TranslationBlock";
import { settings } from "../settings";

// State
let active = false;
const listeners = new Set<(active: boolean) => void>();

// Queue with concurrency control
const queue: Array<{ messageId: string; content: string; }> = [];
let inflight = 0;
const MAX_CONCURRENT = 3;

export function isBulkTranslateActive(): boolean {
    return active;
}

export function toggleBulkTranslate(): void {
    active = !active;
    settings.store.autoTranslate = active;
    if (!active) {
        queue.length = 0;
    }
    for (const cb of listeners) cb(active);
}

export function deactivateBulkTranslate(): void {
    if (!active) return;
    active = false;
    settings.store.autoTranslate = false;
    queue.length = 0;
    for (const cb of listeners) cb(false);
}

export function subscribeBulkTranslate(cb: (active: boolean) => void): () => void {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
}

function processQueue() {
    while (inflight < MAX_CONCURRENT && queue.length > 0) {
        const item = queue.shift()!;
        inflight++;
        translateIfIdle(item.messageId, item.content).finally(() => {
            inflight--;
            processQueue();
        });
    }
}

export function enqueueBulkTranslation(messageId: string, content: string): void {
    if (!active) return;
    // Avoid duplicates in queue
    if (queue.some(q => q.messageId === messageId)) return;
    queue.push({ messageId, content });
    processQueue();
}
