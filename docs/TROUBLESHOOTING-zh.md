# 疑難排解指南（Troubleshooting）

本文整理了實際安裝與使用 BabelChat 時最常遇到的問題、錯誤訊息的特徵，以及經過驗證的解決方式。安裝步驟請先參閱 [README-zh](../README-zh.md)。

## 目錄

- [1. API Endpoint 必須是完整網址（最常見的錯誤）](#1-api-endpoint-必須是完整網址最常見的錯誤)
- [2. 我發出的訊息沒有被翻譯（撰寫翻譯是手動流程）](#2-我發出的訊息沒有被翻譯撰寫翻譯是手動流程)
- [3. Auto Translate 只影響「收到」的訊息](#3-auto-translate-只影響收到的訊息)
- [4. 模型名稱無效（API error 400）](#4-模型名稱無效api-error-400)
- [5. 非互動環境下安裝腳本卡在注入步驟](#5-非互動環境下安裝腳本卡在注入步驟)
- [6. 如何確認注入是否成功](#6-如何確認注入是否成功)
- [7. 設定檔的位置與修改注意事項](#7-設定檔的位置與修改注意事項)
- [8. 錯誤速查表](#8-錯誤速查表)

---

## 1. API Endpoint 必須是完整網址（最常見的錯誤）

**插件會把你填寫的 Endpoint 當作完整的請求網址直接 POST，不會自動補上 `/chat/completions` 路徑。**

只填服務商的根網址會導致所有翻譯請求回傳 HTTP 404。例如搭配 DeepSeek 時：

```
❌ 錯誤：https://api.deepseek.com                → API error 404
✅ 正確：https://api.deepseek.com/chat/completions
```

各服務商的正確寫法（皆已驗證）：

| 服務商 | API Endpoint |
|---|---|
| OpenAI | `https://api.openai.com/v1/chat/completions` |
| DeepSeek | `https://api.deepseek.com/chat/completions` |
| OpenRouter | `https://openrouter.ai/api/v1/chat/completions` |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` |
| Ollama（本機） | `http://localhost:11434/v1/chat/completions` |

其他相容服務的判斷方式：**網址結尾必須是 `/chat/completions`**（部分服務商為 `/v1/chat/completions`），以服務商的 OpenAI 相容文件為準。

## 2. 我發出的訊息沒有被翻譯（撰寫翻譯是手動流程）

這是插件的設計行為，不是故障。**插件不會攔截或修改送出的訊息**——直接打完字按 Enter，訊息會以原文送出。

撰寫翻譯（Compose Language）的正確用法：

1. 在輸入框輸入文字，**先不要按 Enter**；
2. 點擊聊天輸入框右側的**撰寫翻譯按鈕**（帶藍色圓點的翻譯圖示）；
3. 插件呼叫 API，把輸入框中的文字**替換**為目標語言譯文（不會自動送出）；
4. 確認譯文後，自己按 Enter 送出。

翻譯按鈕的顯示條件（不顯示時請逐項檢查）：

- 輸入框**有文字**時才會出現，空輸入框時按鈕不渲染；
- 只出現在**主聊天輸入欄**（一般頻道與私訊）；執行緒（thread）側邊欄等其他輸入區域不會出現；
- 插件已啟用（Vencord 會自動啟用其依賴的 ChatInputButtonAPI，無需手動開啟）。

其他相關提示：

- 若文字已經是目標語言，會彈出提示 `Text is already in the target language`，輸入框內容不變（對應 API 的 `[SKIP]` 機制）；
- 翻譯失敗時會彈出紅色 Toast：`Translation failed: ...`，此時輸入框保持原文。

## 3. Auto Translate 只影響「收到」的訊息

設定中的 **Auto Translate** 只會自動翻譯**收到的新訊息**（顯示在原訊息下方），**與你送出的訊息無關**。若想讓自己發出的訊息變成其他語言，請使用上一節的撰寫翻譯按鈕。

單則收到訊息的手動翻譯有兩種方式：

- 右鍵點擊訊息 → **BabelChat Translate**；
- 滑鼠懸停訊息 → 點擊彈出面板中的翻譯圖示。

## 4. 模型名稱無效（API error 400）

錯誤特徵：`API error 400`，回應內容含 `Model Not Exist`。

模型名稱必須使用服務商真實存在的 ID。例如 DeepSeek 常見的有效模型為 `deepseek-chat`、`deepseek-flash`、`deepseek-reasoner`；OpenRouter 則為 `廠商/模型` 格式（如 `google/gemma-3-27b-it:free`）。請以服務商文件為準，並留意大小寫與冒號後綴（如 `:free`）。

## 5. 非互動環境下安裝腳本卡在注入步驟

`install.ps1` 的第 6 步（注入 Discord）是互動式的：需要鍵盤選擇 Discord 版本。在腳本排程、SSH、CI 等**沒有終端機互動能力**的環境下執行，會出現類似 `FATAL ^D` 的錯誤後中止。

解決方式：注入可以完全用命令列參數完成，不需要互動。在 Windows PowerShell 中：

```powershell
cd $env:USERPROFILE\.vencord-src

# 下載官方 CLI 安裝器（runInstaller.mjs 會附帶正確的環境變數）
node scripts\runInstaller.mjs -- --install

# 或者直接靜默注入（請見下方注意事項）
$env:VENCORD_USER_DATA_DIR = (Get-Location).Path
$env:VENCORD_DEV_INSTALL = "1"
.\dist\Installer\VencordInstallerCli.exe -branch stable -install
```

CLI 安裝器可用參數（`-help` 查看全部）：`-branch [auto|stable|ptb|canary]`、`-install`、`-uninstall`、`-repair`。

> **重要**：若直接執行 `VencordInstallerCli.exe`（不經過 `runInstaller.mjs`），必須設定上面兩個環境變數：
> - `VENCORD_USER_DATA_DIR`：指向 Vencord 原始碼目錄（預設為 `%USERPROFILE%\.vencord-src`）；
> - `VENCORD_DEV_INSTALL=1`：讓安裝器打包**你本地編譯的** `dist\`（包含 BabelChat）。
>
> 缺少這兩個變數時，安裝器會改用官方預編譯版本注入，**BabelChat 不會被包含在內**（插件列表中找不到）。

## 6. 如何確認注入是否成功

新版 Discord 用戶端的注入方式：原版 `app.asar` 被改名為 `_app.asar` 保留，並寫入一個很小的（約 200 位元組）自訂 `app.asar` 作為 Vencord 載入器。

檢查路徑（`app-<版本號>` 依實際版本而定）：

```
%LOCALAPPDATA%\Discord\app-<版本號>\resources\
    app.asar     ← 約 200 B 的 Vencord 載入器（存在即為已注入）
    _app.asar    ← Discord 原版檔案（備份）
```

確認 Vencord 已成功載入：`%APPDATA%\Vencord\settings\settings.json` 存在。注意 Vencord 的資料目錄位於 `%APPDATA%\Vencord`，**不在** `%APPDATA%\discord` 資料夾裡面。

## 7. 設定檔的位置與修改注意事項

插件設定儲存在：

```
%APPDATA%\Vencord\settings\settings.json
```

注意事項：

- **Discord 執行中時，直接編輯該檔案會被記憶體中的設定覆蓋**。請透過 Discord 設定介面修改，或關閉 Discord 後再改檔案；
- API Key 以明文儲存於此檔案，請注意不要外流（截圖、分享設定檔時務必遮蔽）；
- `systemPrompt` 留空時，插件使用內建的預設提示詞，佔位符 `{targetLanguage}` 會被替換為你選的語言。

## 8. 錯誤速查表

| 現象 / 錯誤 | 原因 | 解決方式 |
|---|---|---|
| `API error 404` | Endpoint 只填了根網址，缺少 `/chat/completions` 路徑 | 見[第 1 節](#1-api-endpoint-必須是完整網址最常見的錯誤) |
| `API error 400`（Model Not Exist） | 模型名稱不存在 | 見[第 4 節](#4-模型名稱無效api-error-400) |
| `API error 401` | API Key 錯誤或過期 | 到服務商後台重新產生 Key |
| 發出的訊息沒被翻譯 | 撰寫翻譯是手動流程，按 Enter 不會自動翻譯 | 見[第 2 節](#2-我發出的訊息沒有被翻譯撰寫翻譯是手動流程) |
| 看不到撰寫翻譯按鈕 | 輸入框為空，或所處輸入欄不支援 | 見[第 2 節](#2-我發出的訊息沒有被翻譯撰寫翻譯是手動流程) |
| `Text is already in the target language` | 文字已是目標語言，API 回傳 `[SKIP]` | 正常行為，直接送出即可 |
| 插件列表找不到 BabelChat | 注入用了官方版而非本地編譯版，或未重啟 Discord | 見[第 5 節](#5-非互動環境下安裝腳本卡在注入步驟)注意事項 |
| 安裝腳本最後一步 `FATAL ^D` | 非互動環境無法進行版本選擇 | 見[第 5 節](#5-非互動環境下安裝腳本卡在注入步驟) |
| Discord 更新後插件消失 | Discord 更新覆蓋了注入 | 重新執行 `install.ps1` / `install.sh` |
