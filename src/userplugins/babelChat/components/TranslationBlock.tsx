import { Parser, useEffect, useRef, useState } from "@webpack/common";
import { Message } from "@vencord/discord-types";

import { translateText } from "../api/translate";
import { settings } from "../settings";
import { enqueueBulkTranslation, isBulkTranslateActive, subscribeBulkTranslate } from "../utils/bulkTranslateManager";
import { getCached, initCache, makeCacheKey } from "../utils/cache";
import { cl } from "../utils/constants";

type TranslationState =
    | { type: "idle"; }
    | { type: "loading"; }
    | { type: "error"; message: string; }
    | { type: "success"; text: string; };

const stateSetters = new Map<string, (s: TranslationState) => void>();

const currentStates = new Map<string, TranslationState>();

export function triggerTranslation(messageId: string, content: string) {
    const setter = stateSetters.get(messageId);
    if (!setter) return;

    const current = currentStates.get(messageId);
    if (current?.type === "success" || current?.type === "loading") {
        const idle: TranslationState = { type: "idle" };
        currentStates.set(messageId, idle);
        setter(idle);
        return;
    }

    doTranslate(messageId, content);
}

/** Translate only if the message is in idle state. Returns a promise for queue coordination. */
export function translateIfIdle(messageId: string, content: string): Promise<void> {
    const setter = stateSetters.get(messageId);
    if (!setter) return Promise.resolve();

    const current = currentStates.get(messageId);
    if (current && current.type !== "idle") return Promise.resolve();

    return doTranslate(messageId, content);
}

function doTranslate(messageId: string, content: string): Promise<void> {
    const setter = stateSetters.get(messageId);
    if (!setter) return Promise.resolve();

    const loading: TranslationState = { type: "loading" };
    currentStates.set(messageId, loading);
    setter(loading);

    return translateText(content).then(result => {
        const s = stateSetters.get(messageId);
        if (!s) return;

        if (result.skipped) {
            const idle: TranslationState = { type: "idle" };
            currentStates.set(messageId, idle);
            s(idle);
        } else {
            const success: TranslationState = { type: "success", text: result.text };
            currentStates.set(messageId, success);
            s(success);
        }
    }).catch(err => {
        const s = stateSetters.get(messageId);
        if (!s) return;
        const error: TranslationState = { type: "error", message: err instanceof Error ? err.message : String(err) };
        currentStates.set(messageId, error);
        s(error);
    });
}

export function TranslationBlock({ message }: { message: Message; }) {
    const [state, setState] = useState<TranslationState>({ type: "idle" });
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;
        stateSetters.set(message.id, setState);
        // Restore in-session translation on remount
        const persisted = currentStates.get(message.id);
        if (persisted && persisted.type !== "idle") {
            setState(persisted);
        }

        // Restore from IndexedDB-backed cache (survives app restart)
        if (message.content?.trim()) {
            void initCache().then(() => {
                if (cancelled) return;
                const current = currentStates.get(message.id);
                if (current?.type === "loading" || current?.type === "error") return;

                const cached = getCached(makeCacheKey(message.content, settings.store.targetLanguage));
                if (!cached || cached.skipped) {
                    if (current?.type === "success") {
                        const idle: TranslationState = { type: "idle" };
                        currentStates.set(message.id, idle);
                        setState(idle);
                    }
                    return;
                }

                const success: TranslationState = { type: "success", text: cached.text };
                currentStates.set(message.id, success);
                setState(success);
            });
        }

        return () => {
            cancelled = true;
            stateSetters.delete(message.id);
            currentStates.delete(message.id);
        };
    }, [message.id, message.content]);

    // IntersectionObserver for bulk translate
    useEffect(() => {
        if (!message.content?.trim()) return;

        let observer: IntersectionObserver | null = null;

        function setupObserver(isActive: boolean) {
            if (observer) {
                observer.disconnect();
                observer = null;
            }
            if (!isActive) return;
            const el = sentinelRef.current;
            if (!el) return;

            observer = new IntersectionObserver(entries => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        enqueueBulkTranslation(message.id, message.content);
                    }
                }
            }, { threshold: 0 });
            observer.observe(el);
        }

        // Set up if already active
        setupObserver(isBulkTranslateActive());

        const unsub = subscribeBulkTranslate(setupObserver);

        return () => {
            unsub();
            if (observer) observer.disconnect();
        };
    }, [message.id, message.content]);

    if (state.type === "idle") {
        return <div ref={sentinelRef} className={cl("sentinel")} />;
    }

    if (state.type === "loading") {
        return (
            <>
                <div ref={sentinelRef} className={cl("sentinel")} />
                <div className={cl("loading")}>
                    <div className={cl("spinner")} />
                    Translating...
                </div>
            </>
        );
    }

    if (state.type === "error") {
        return (
            <>
                <div ref={sentinelRef} className={cl("sentinel")} />
                <div className={cl("error")}>
                    <span>{state.message}</span>
                    <div className={cl("error-actions")}>
                        <button
                            className={cl("error-btn")}
                            onClick={() => triggerTranslation(message.id, message.content)}
                        >
                            Retry
                        </button>
                        <button
                            className={cl("error-btn")}
                            onClick={() => setState({ type: "idle" })}
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <div ref={sentinelRef} className={cl("sentinel")} />
            <div className={cl("block")}>
                <div className={cl("content")}>
                    {Parser.parse(state.text)}
                </div>
            </div>
        </>
    );
}
