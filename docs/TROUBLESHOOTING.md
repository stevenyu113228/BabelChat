# Troubleshooting Guide

This guide covers the most common issues encountered when installing and using BabelChat, with error signatures and verified fixes. For installation steps, see the [README](../README.md).

## Contents

- [1. API Endpoint must be the full URL (most common mistake)](#1-api-endpoint-must-be-the-full-url-most-common-mistake)
- [2. My outgoing messages are not translated (compose translation is manual)](#2-my-outgoing-messages-are-not-translated-compose-translation-is-manual)
- [3. Auto Translate only affects received messages](#3-auto-translate-only-affects-received-messages)
- [4. Invalid model name (API error 400)](#4-invalid-model-name-api-error-400)
- [5. Install script hangs/fails at the injection step in non-interactive environments](#5-install-script-hangsfails-at-the-injection-step-in-non-interactive-environments)
- [6. How to verify the injection succeeded](#6-how-to-verify-the-injection-succeeded)
- [7. Settings file location and editing precautions](#7-settings-file-location-and-editing-precautions)
- [8. Quick error reference](#8-quick-error-reference)

---

## 1. API Endpoint must be the full URL (most common mistake)

**The plugin POSTs directly to the URL you enter — it does not append `/chat/completions` for you.**

Entering only the provider's base URL makes every translation request fail with HTTP 404. For example, with DeepSeek:

```
❌ Wrong: https://api.deepseek.com                → API error 404
✅ Right: https://api.deepseek.com/chat/completions
```

Verified correct values per provider:

| Provider | API Endpoint |
|---|---|
| OpenAI | `https://api.openai.com/v1/chat/completions` |
| DeepSeek | `https://api.deepseek.com/chat/completions` |
| OpenRouter | `https://openrouter.ai/api/v1/chat/completions` |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` |
| Ollama (local) | `http://localhost:11434/v1/chat/completions` |

For other OpenAI-compatible providers: **the URL must end with `/chat/completions`** (some providers use `/v1/chat/completions`). Follow your provider's OpenAI-compatible API docs.

## 2. My outgoing messages are not translated (compose translation is manual)

This is by design, not a bug. **The plugin never intercepts or rewrites sent messages** — if you type a message and press Enter, it goes out as-is.

How to use Compose Language correctly:

1. Type your message in the input box, **do not press Enter yet**;
2. Click the **compose translate button** in the chat bar (the translate icon with a blue dot);
3. The plugin calls the API and **replaces the text in your input box** with the translation (it does not send it);
4. Review the translation, then press Enter yourself.

When the button does not appear, check the following:

- It only renders when the input box **has text**;
- It only appears in the **main chat bar** (regular channels and DMs) — not in thread sidebars or other input areas;
- The plugin is enabled (Vencord auto-enables its ChatInputButtonAPI dependency; no manual toggle needed).

Related behaviors:

- If the text is already in the target language, you get the toast `Text is already in the target language` and the input is unchanged (the API's `[SKIP]` mechanism);
- On failure you get a red toast `Translation failed: ...` and the input keeps the original text.

## 3. Auto Translate only affects received messages

The **Auto Translate** setting only auto-translates **incoming** messages (shown below the original) — it has no effect on messages you send. To write in one language and send in another, use the compose translate button described above.

Two ways to manually translate a received message:

- Right-click the message → **BabelChat Translate**;
- Hover the message → click the translate icon in the popover.

## 4. Invalid model name (API error 400)

Signature: `API error 400` with `Model Not Exist` in the response body.

The model must be a real ID from your provider. For example, valid DeepSeek models include `deepseek-chat`, `deepseek-flash` and `deepseek-reasoner`; OpenRouter uses `vendor/model` format (e.g. `google/gemma-3-27b-it:free`). Check your provider's docs, including case and suffixes like `:free`.

## 5. Install script hangs/fails at the injection step in non-interactive environments

Step 6 of `install.ps1` (injecting into Discord) is interactive: it requires keyboard navigation to pick a Discord install. In scheduled scripts, SSH sessions, CI, or any **non-interactive** environment it fails with something like `FATAL ^D`.

Fix: injection can be done entirely from CLI flags, no interaction needed. On Windows (PowerShell):

```powershell
cd $env:USERPROFILE\.vencord-src

# Downloads the official CLI installer (runInstaller.mjs sets the right env vars)
node scripts\runInstaller.mjs -- --install

# Or inject silently (see the note below)
$env:VENCORD_USER_DATA_DIR = (Get-Location).Path
$env:VENCORD_DEV_INSTALL = "1"
.\dist\Installer\VencordInstallerCli.exe -branch stable -install
```

Useful CLI installer flags (see `-help` for all): `-branch [auto|stable|ptb|canary]`, `-install`, `-uninstall`, `-repair`.

> **Important**: if you run `VencordInstallerCli.exe` directly (bypassing `runInstaller.mjs`), you MUST set the two environment variables shown above:
> - `VENCORD_USER_DATA_DIR`: path to the Vencord source directory (default `%USERPROFILE%\.vencord-src`);
> - `VENCORD_DEV_INSTALL=1`: makes the installer bundle **your locally built** `dist\` (which contains BabelChat).
>
> Without them the installer falls back to the official prebuilt release, and **BabelChat will not be included** (the plugin won't appear in the plugin list).

## 6. How to verify the injection succeeded

How injection works on current Discord clients: the original `app.asar` is renamed to `_app.asar` (kept as backup), and a tiny (~200 byte) custom `app.asar` is written as the Vencord loader.

Check this path (`app-<version>` varies with your Discord version):

```
%LOCALAPPDATA%\Discord\app-<version>\resources\
    app.asar     ← ~200 B Vencord loader (present = injected)
    _app.asar    ← original Discord file (backup)
```

To confirm Vencord actually loads: `%APPDATA%\Vencord\settings\settings.json` should exist. Note that Vencord's data directory is `%APPDATA%\Vencord` — **not** inside the `%APPDATA%\discord` folder.

## 7. Settings file location and editing precautions

Plugin settings are stored in:

```
%APPDATA%\Vencord\settings\settings.json
```

Notes:

- **Editing this file while Discord is running gets overwritten by the in-memory settings.** Change settings through Discord's settings UI, or close Discord before editing the file;
- The API key is stored in plaintext in this file — mask it before sharing screenshots or config files;
- If `systemPrompt` is empty, the plugin uses its built-in default prompt; the `{targetLanguage}` placeholder is replaced with your selected language.

## 8. Quick error reference

| Symptom / error | Cause | Fix |
|---|---|---|
| `API error 404` | Endpoint lacks the `/chat/completions` path | See [section 1](#1-api-endpoint-must-be-the-full-url-most-common-mistake) |
| `API error 400` (Model Not Exist) | Model name doesn't exist | See [section 4](#4-invalid-model-name-api-error-400) |
| `API error 401` | API key wrong or expired | Generate a new key on the provider's dashboard |
| Sent messages aren't translated | Compose translation is manual; Enter doesn't auto-translate | See [section 2](#2-my-outgoing-messages-are-not-translated-compose-translation-is-manual) |
| Compose button missing | Input box empty, or unsupported input area | See [section 2](#2-my-outgoing-messages-are-not-translated-compose-translation-is-manual) |
| `Text is already in the target language` | Text already in target language; API returned `[SKIP]` | Normal behavior — just send it |
| BabelChat missing from plugin list | Injected the official build instead of your local build, or Discord not restarted | See [section 5](#5-install-script-hangsfails-at-the-injection-step-in-non-interactive-environments) note |
| Install script ends with `FATAL ^D` | Non-interactive environment can't select a Discord install | See [section 5](#5-install-script-hangsfails-at-the-injection-step-in-non-interactive-environments) |
| Plugin gone after a Discord update | The update overwrote the injection | Re-run `install.ps1` / `install.sh` |
