# sns-sms-sender

一次性 CLI 小工具：透過 AWS SNS 發送**固定文字**簡訊給多位收件人。

---

## 前置需求

- Node.js 18+
- 一組具備 `sns:Publish` 權限的 AWS IAM 憑證
- AWS SNS SMS 已脫離 sandbox（否則只能發給已驗證號碼，可在 AWS Console → SNS → Text messaging (SMS) 申請）
- 固定使用 region：`ap-northeast-1`

---

## 安裝

```bash
npm install
```

---

## 設定憑證

複製範本並填入你的 AWS 憑證：

```bash
cp .env.example .env
```

編輯 `.env`：

```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xxxxxxxx
```

> `.env` 已加入 `.gitignore`，不會被 git 追蹤。

---

## 使用方式

```bash
node send-sms.js --message "<訊息>" --to "<號碼1>,<號碼2>,..."
```

### 參數

| Flag | 必填 | 說明 |
|------|------|------|
| `--message` | ✅ | 簡訊內容（固定文字，所有收件人相同） |
| `--to` | ✅ | 收件人號碼，以逗號 `,` 分隔；需 E.164 格式（含 `+` 與國碼） |

### 範例

**單一收件人：**
```bash
node send-sms.js --message "你好" --to "+886912345678"
```

**多位收件人：**
```bash
node send-sms.js --message "系統維護通知" --to "+886912345678,+886923456789,+886934567890"
```

**多行訊息（zsh / bash）：**
```bash
node send-sms.js --message $'第一行\n第二行' --to "+886912345678"
```

---

## 輸出與退出碼

執行後會印出摘要：

```
成功: 2 / 失敗: 1
失敗清單:
  +886999999999 - invalid E.164 format
```

| Exit code | 意義 |
|-----------|------|
| `0` | 全部成功 |
| `1` | CLI 參數錯誤（缺 `--message` 或 `--to`） |
| `2` | 有任一筆發送失敗 |

---

## 測試

```bash
npm test
```

使用 Node 內建 `node:test`，SNS client 以 mock 注入，不會真的打 AWS。

---

## 限制與注意事項

- **SMS Type**：固定為 `Promotional`（成本較低、優先度較低）。若需交易型訊息請改程式中的 `SMSType`。
- **字數計費**：
  - 含中文 → UCS-2 編碼，單則 **70 字元**，超過每 **67 字** 拆一則
  - 純英數 → GSM-7，單則 **160 字元**，超過每 **153 字** 拆一則
  - 換行字元 `\n` 會計入字數
- **失敗不重試**：單筆失敗會記錄並繼續發送下一筆，不會自動重試。
- **無速率限制**：逐筆序列發送；大量收件人建議自行控制批次。
- **無範本替換**：所有人收到完全相同的訊息。

---

## 檔案

```
send-sms.js        # 主程式
send-sms.test.js   # 測試
package.json
.env.example       # 憑證範本
.gitignore
```
