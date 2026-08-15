import { PluginNative } from "@utils/types";

import { settings } from "../settings";
import { getCached, initCache, makeCacheKey, setCache, TranslationResult } from "../utils/cache";
import { DEFAULT_SYSTEM_PROMPT } from "../utils/constants";

const Native = VencordNative.pluginHelpers.BabelChat as PluginNative<typeof import("../native")>;

export async function translateText(content: string, targetLang?: string): Promise<TranslationResult> {
    const trimmed = content.trim();
    if (!trimmed) return { text: "", skipped: true };

    const { apiEndpoint, apiKey, model, targetLanguage, systemPrompt } = settings.store;
    const lang = targetLang ?? targetLanguage;
    const cacheKey = makeCacheKey(trimmed, lang);

    await initCache();
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const prompt = (systemPrompt || DEFAULT_SYSTEM_PROMPT)
        .replaceAll("{targetLanguage}", lang);

    const body = JSON.stringify({
        model,
        messages: [
            { role: "system", content: prompt },
            { role: "user", content: trimmed },
        ],
        temperature: 0.1,
    });

    const { status, data } = await Native.translateRequest(apiEndpoint, apiKey, body);

    if (status === -1) {
        throw new Error(`Network error: ${data}`);
    }
    if (status < 200 || status >= 300) {
        throw new Error(`API error ${status}: ${data.slice(0, 200)}`);
    }

    const json = JSON.parse(data);
    const reply: string = json.choices?.[0]?.message?.content?.trim() ?? "";

    if (!reply) throw new Error("Empty response from API");

    const skipped = reply === "[SKIP]";
    const result: TranslationResult = {
        text: skipped ? "" : reply,
        skipped,
    };

    setCache(cacheKey, result);
    return result;
}
