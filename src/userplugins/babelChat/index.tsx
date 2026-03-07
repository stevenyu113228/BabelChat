import "./style.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import definePlugin from "@utils/types";
import { Message } from "@vencord/discord-types";
import { ChannelStore, createRoot, FluxDispatcher, Menu } from "@webpack/common";

import { ComposeTranslateButton, TranslateIcon } from "./components/ChatBarToggle";
import { FloatingTranslateButton } from "./components/FloatingButton";
import { TranslationBlock, triggerTranslation } from "./components/TranslationBlock";
import { settings } from "./settings";
import { deactivateBulkTranslate } from "./utils/bulkTranslateManager";

const messageCtxPatch: NavContextMenuPatchCallback = (children, { message }: { message: Message; }) => {
    if (!message.content) return;

    const group = findGroupChildrenByChildId("copy-text", children);
    if (!group) return;

    group.splice(group.findIndex(c => c?.props?.id === "copy-text") + 1, 0,
        <Menu.MenuItem
            id="vc-babelchat-translate"
            label="BabelChat Translate"
            action={() => triggerTranslation(message.id, message.content)}
        />
    );
};

function handleMessageCreate({ message, optimistic }: { message: Message; optimistic: boolean; }) {
    if (optimistic) return;
    if (!settings.store.autoTranslate) return;
    if (!message.content?.trim()) return;

    setTimeout(() => {
        triggerTranslation(message.id, message.content);
    }, 100);
}

let fabContainer: HTMLElement | null = null;
let fabRoot: ReturnType<typeof createRoot> | null = null;

function mountFab() {
    fabContainer = document.createElement("div");
    fabContainer.id = "vc-babelchat-fab-container";
    document.body.appendChild(fabContainer);
    fabRoot = createRoot(fabContainer);
    fabRoot.render(<FloatingTranslateButton />);
}

function unmountFab() {
    if (fabRoot) {
        fabRoot.unmount();
        fabRoot = null;
    }
    if (fabContainer) {
        fabContainer.remove();
        fabContainer = null;
    }
}

export default definePlugin({
    name: "BabelChat",
    description: "Bilingual translation for Discord messages, powered by any OpenAI-compatible LLM API. Shows translations below original messages.",
    authors: [{ name: "BabelChat", id: 0n }],
    settings,

    contextMenus: {
        "message": messageCtxPatch,
    },

    chatBarButton: {
        icon: TranslateIcon,
        render: ComposeTranslateButton,
    },

    renderMessageAccessory: props => <TranslationBlock message={props.message} />,

    messagePopoverButton: {
        icon: TranslateIcon,
        render(message: Message) {
            if (!message.content) return null;

            return {
                label: "Translate",
                icon: TranslateIcon,
                message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: () => triggerTranslation(message.id, message.content),
            };
        },
    },

    start() {
        FluxDispatcher.subscribe("MESSAGE_CREATE", handleMessageCreate);
        mountFab();
    },

    stop() {
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", handleMessageCreate);
        unmountFab();
        deactivateBulkTranslate();
    },
});
