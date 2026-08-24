# 暮光塔羅（Mucha Tarot）

「暮光塔羅」是一個可部署至 ChatGPT Sites 的繁體中文每日塔羅網站。訪客可以從完整 78 張牌中抽取一張牌，系統會隨機決定正位或逆位，再由管理員設定的 OpenAI 相容模型產生今日解讀。

正式網站：[https://muguang-tarot.tony1221526808.chatgpt.site](https://muguang-tarot.tony1221526808.chatgpt.site)

## 目前功能

- 完整 78 張塔羅牌：22 張大牌、56 張小牌。
- 伺服器端使用 Web Crypto 隨機抽牌，正位與逆位各 50%。
- AI 產生五段繁體中文解讀：今日主題、感情人際、工作財運、行動建議、今日提醒。
- 每一段解讀都可單獨請 AI 延伸說明。
- 可透過系統分享或複製文字分享完整占卜結果，不建立公開分享紀錄。
- 點擊抽出的牌可放大欣賞正位牌面。
- 依台北日期、牌卡、方向、模型設定版本與 Prompt 版本共用解讀快取。
- GSAP 洗牌、抽牌、翻牌與解讀進場動畫。
- 支援手機、桌面及 `prefers-reduced-motion` 減少動態模式。
- 訪客可匿名使用，也可選擇透過 ChatGPT 登入。
- 管理後台使用獨立帳號與密碼，不依賴日常 ChatGPT 登入。
- 管理員可設定 OpenAI 相容 API Base URL、模型名稱與 API Key。

目前版本不包含會員歷史、付費、分享紀錄或多牌陣。

## 系統架構

```mermaid
flowchart LR
    Visitor[訪客] --> Frontend[Next.js 前台]
    Frontend --> Draw[POST /api/draw]
    Draw --> D1[(Cloudflare D1)]
    Draw --> Provider[OpenAI 相容 AI API]
    Admin[管理員] --> AdminUI[/admin]
    AdminUI --> Config[管理設定 API]
    Config --> D1
```

抽牌結果由伺服器決定，瀏覽器不能指定首次抽牌內容。若 AI 暫時失敗，已抽出的牌會保留，使用者可為同一張牌重新解讀。

## 技術組成

- Next.js 16、React 19、TypeScript
- Vinext、Vite、Cloudflare Workers
- ChatGPT Sites
- Cloudflare D1、Drizzle ORM
- GSAP 3
- Vitest、ESLint
- Web Crypto API

## 主要路由

| 路由 | 用途 |
| --- | --- |
| `/` | 公開抽牌與每日運勢解讀 |
| `/admin/login` | 管理員帳密登入 |
| `/admin/setup` | 網站擁有者初始化或重設管理員帳密 |
| `/admin` | AI 模型與 API Key 設定 |
| `POST /api/draw` | 抽牌或重新解讀同一張牌 |
| `POST /api/extend-reading` | 延伸指定解讀段落 |
| `/api/admin/auth/*` | 管理員登入、登出與初始化 |
| `/api/admin/config` | 讀取、測試及儲存 AI 設定 |

## 專案結構

```text
app/                    頁面、前端元件與 API Routes
  admin/                後台登入、初始化與 AI 設定
  api/                  抽牌及後台 API
db/                     Drizzle schema 與環境型別
drizzle/                D1 migration
lib/                    抽牌、AI、加密、登入與資料存取邏輯
public/assets/tarot/     牌背及網站用塔羅牌圖檔
tests/                   抽牌、AI、加密與管理登入測試
.openai/hosting.json    ChatGPT Sites 的 D1 綁定設定
```

## 本機開發

需求：Node.js 22.13.0 以上版本與 npm。

```bash
npm install
```

複製環境變數範例：

```powershell
Copy-Item .env.example .env
```

環境變數：

| 名稱 | 說明 |
| --- | --- |
| `ADMIN_BOOTSTRAP_EMAIL` | 可進入 `/admin/setup` 的網站擁有者 ChatGPT 信箱 |
| `ADMIN_SESSION_SECRET` | 簽署管理員登入工作階段，至少 32 個字元 |
| `CONFIG_ENCRYPTION_KEY` | 加密 AI API Key，至少 32 個字元 |
| `SITE_ORIGIN` | 網站完整來源網址；本機通常為 `http://localhost:3000` |

可使用 Node.js 產生隨機密鑰：

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

啟動開發環境：

```bash
npm run dev
```

預設網址為 [http://localhost:3000](http://localhost:3000)。

## 管理後台設定

1. 網站擁有者先進入 `/admin/setup`，透過 ChatGPT 驗證身分。
2. 建立至少 12 個字元的管理員密碼。
3. 日後從 `/admin/login` 使用獨立帳密登入。
4. 在 `/admin` 填入 HTTPS API Base URL、模型名稱與 API Key。
5. 系統會要求模型成功回傳五段結構化解讀後才保存設定。

API Key 不會回傳瀏覽器。欄位留白時會保留既有 Key。

## AI 供應商

後台支援 OpenAI Chat Completions 相容 API，例如：

```text
Base URL: https://api.openai.com/v1
Model:    gpt-4.1-mini
```

系統會呼叫 `{Base URL}/chat/completions`。針對 LongCat 供應商，程式會關閉 thinking 輸出，避免推理內容占用額度而截斷 JSON。

## D1 資料表

| 資料表 | 用途 |
| --- | --- |
| `ai_config` | 加密後的 AI 設定與版本 |
| `daily_readings` | 每日解讀快取與生成鎖 |
| `admin_credentials` | 管理員帳號與密碼雜湊 |
| `admin_login_attempts` | 登入失敗次數與暫時鎖定 |

每日解讀保留 30 天；模型設定變更後會遞增版本，新抽牌不會沿用舊模型的快取。

## 安全設計

- 管理員密碼以 PBKDF2-SHA256、隨機鹽值及 100,000 次迭代保存。
- 管理員工作階段使用 HMAC-SHA256 簽章的 HttpOnly Cookie，有效期 8 小時。
- 同一來源連續登入失敗 5 次後暫停 15 分鐘。
- AI API Key 使用 AES-GCM 加密後才寫入 D1。
- API Base URL 僅接受 HTTPS，拒絕 localhost 與私人網路位址。
- AI 金鑰只在伺服器端使用，不會進入前端回應或日誌。
- Prompt 禁止宿命式保證、恐嚇及取代醫療、法律或投資專業建議。

## 測試與建置

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

目前測試涵蓋：

- 78 張牌完整性與安全隨機抽牌。
- API Base URL 驗證與 AES-GCM 加解密。
- AI 五段 JSON 解析、格式修復及 LongCat 相容性。
- AI 單一面向延伸解讀。
- 管理員密碼雜湊、帳號格式與工作階段防竄改。

資料表異動後可產生 migration：

```bash
npm run db:generate
```

## 部署至 ChatGPT Sites

`.openai/hosting.json` 已宣告 D1 綁定名稱 `DB`。正式環境變數應設定在 Sites 的環境變數管理介面，不要提交 `.env`、API Key 或任何正式密鑰。

目前正式站的存取模式為公開：訪客可匿名抽牌，ChatGPT 登入為選用功能，後台仍受獨立管理員帳密保護。

## 內容聲明與資產

網站內容僅供自我探索與娛樂，不替代醫療、法律、投資或其他專業建議。

公開部署或再散布前，請自行確認 `public/assets/tarot/` 內牌面圖案的使用與散布權。除非另有明確授權文件，本儲存庫不額外授予第三方圖像資產的使用權。
