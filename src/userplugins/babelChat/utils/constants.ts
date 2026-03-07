import { classNameFactory } from "@api/Styles";

export const cl = classNameFactory("vc-babelchat-");

export const DEFAULT_SYSTEM_PROMPT =
    `You are a translation assistant. Detect the source language of the following message and translate it into {targetLanguage}.

Rules:
- If the message is already in {targetLanguage}, reply with exactly: [SKIP]
- Preserve all Discord markdown formatting (bold, italic, code blocks, etc.)
- Preserve all emoji (both Unicode and custom Discord emoji like <:name:id>)
- Preserve all mentions (<@id>, <#id>, <@&id>) exactly as-is
- Do not add any explanation, just output the translated text
- Preserve line breaks`;

export const LANGUAGES = [
    { label: "English", value: "English" },
    { label: "\u7E41\u9AD4\u4E2D\u6587", value: "\u7E41\u9AD4\u4E2D\u6587" },
    { label: "\u7B80\u4F53\u4E2D\u6587", value: "\u7B80\u4F53\u4E2D\u6587" },
    { label: "\u65E5\u672C\u8A9E", value: "\u65E5\u672C\u8A9E" },
    { label: "\uD55C\uAD6D\uC5B4", value: "\uD55C\uAD6D\uC5B4" },
    { label: "Espa\u00F1ol", value: "Espa\u00F1ol" },
    { label: "Fran\u00E7ais", value: "Fran\u00E7ais" },
    { label: "Deutsch", value: "Deutsch" },
    { label: "Portugu\u00EAs", value: "Portugu\u00EAs" },
    { label: "Italiano", value: "Italiano" },
    { label: "Русский", value: "Русский" },
    { label: "العربية", value: "العربية" },
    { label: "हिन्दी", value: "हिन्दी" },
    { label: "Tiếng Việt", value: "Tiếng Việt" },
    { label: "ไทย", value: "ไทย" },
    { label: "Bahasa Indonesia", value: "Bahasa Indonesia" },
] as const;
