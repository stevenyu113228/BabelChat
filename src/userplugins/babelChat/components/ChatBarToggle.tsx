import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { insertTextIntoChatInputBox } from "@utils/discord";
import { IconComponent } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ComponentDispatch, DraftStore, DraftType, SelectedChannelStore, Toasts, useState } from "@webpack/common";

import { translateText } from "../api/translate";
import { settings } from "../settings";
import { cl } from "../utils/constants";

const DraftManager: any = findByPropsLazy("clearDraft", "saveDraft");

export const TranslateIcon: IconComponent = ({ height = 24, width = 24, className }) => (
    <svg
        viewBox="0 0 24 24"
        height={height}
        width={width}
        className={className}
        fill="currentColor"
    >
        <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" />
    </svg>
);

const ComposeIcon: IconComponent = ({ height = 24, width = 24, className }) => (
    <svg
        viewBox="0 0 24 24"
        height={height}
        width={width}
        className={className}
        fill="currentColor"
    >
        <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" />
        <circle cx="20" cy="4" r="3" fill="var(--brand-500)" />
    </svg>
);

export const ComposeTranslateButton: ChatBarButtonFactory = ({ isEmpty, isMainChat }) => {
    if (!isMainChat || isEmpty) return null;

    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        if (loading) return;

        const channelId = SelectedChannelStore.getChannelId();
        const draft = DraftStore.getDraft(channelId, DraftType.ChannelMessage);
        const text = typeof draft === "string" ? draft : (draft as any)?.content ?? "";

        if (!text.trim()) return;

        setLoading(true);
        try {
            const result = await translateText(text.trim(), settings.store.composeLanguage);

            if (result.skipped) {
                Toasts.show({
                    id: Toasts.genId(),
                    message: "Text is already in the target language",
                    type: Toasts.Type.MESSAGE,
                });
                return;
            }

            // Clear draft and replace with translated text
            DraftManager.clearDraft(channelId, DraftType.ChannelMessage);
            ComponentDispatch.dispatchToLastSubscribed("CLEAR_TEXT");
            setTimeout(() => {
                insertTextIntoChatInputBox(result.text);
            }, 50);
        } catch (e: any) {
            Toasts.show({
                id: Toasts.genId(),
                message: `Translation failed: ${e.message?.slice(0, 100) ?? "Unknown error"}`,
                type: Toasts.Type.FAILURE,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <ChatBarButton
            tooltip={loading ? "Translating..." : `Translate to ${settings.store.composeLanguage}`}
            onClick={handleClick}
            buttonProps={{
                disabled: loading,
                className: cl("compose"),
            }}
        >
            {loading
                ? <div className={cl("compose-spinner")} />
                : <ComposeIcon />
            }
        </ChatBarButton>
    );
};
