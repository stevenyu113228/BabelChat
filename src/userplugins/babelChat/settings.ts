import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { LANGUAGES } from "./utils/constants";

export const settings = definePluginSettings({
    apiEndpoint: {
        type: OptionType.STRING,
        description: "OpenAI-compatible API endpoint",
        default: "https://api.openai.com/v1/chat/completions",
    },
    apiKey: {
        type: OptionType.STRING,
        description: "API key (leave empty if not required)",
        default: "",
    },
    model: {
        type: OptionType.STRING,
        description: "Model name",
        default: "gpt-4o-mini",
    },
    targetLanguage: {
        type: OptionType.SELECT,
        description: "Target language for translation",
        options: LANGUAGES.map(l => ({ label: l.label, value: l.value, default: l.value === "English" })),
    },
    autoTranslate: {
        type: OptionType.BOOLEAN,
        description: "Automatically translate incoming messages",
        default: false,
    },
    composeLanguage: {
        type: OptionType.SELECT,
        description: "Language for composing (translate your input before sending)",
        options: LANGUAGES.map(l => ({ label: l.label, value: l.value, default: l.value === "English" })),
    },
    systemPrompt: {
        type: OptionType.STRING,
        description: "Custom system prompt (leave empty for default). Use {targetLanguage} as placeholder.",
        default: "",
    },
});
