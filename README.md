# 刷題小站

[開啟線上刷題網站](https://bagle102.github.io/quiz-practice-site/)

多題庫、整頁捲動的個人刷題平台。作答進度、錯題、收藏與測驗紀錄保存在瀏覽器本機，不需登入。

## 題庫

| 題庫 | 題數 |
|---|---:|
| 第1章 總則 | 135 |
| 第2章 | 132 |
| 第3章 公開發行公司發行人與內部人之義務 | 82 |
| 合計 | **349** |

**文字版示範：總則前 10 題**已逐題對照原圖轉錄，直接顯示題幹、完整選項與解析，原圖收在「查看原圖」。其餘 339 題仍使用掃描裁圖。答案依原書印刷標記，原始 PDF 保留在私人來源專案。

體驗方式：選第1章總則 → 開始新測驗 → 題數設為 10 → 不打亂題序。舊試卷仍保留開始時的原圖快照，不會自動覆寫。

部分掃描有傾斜、陰影或頁邊截字；未自行補寫缺少內容，也未另核對現行法規。手機可使用「放大原圖」後捲動檢視。掃描版題面不能全文搜尋或複製成文字；前10題文字版可選取、複製，並可用瀏覽器頁面搜尋。

## 使用方式

1. 首頁選擇題庫。
2. 選擇即時練習或模擬測驗、題數及是否打亂題序。
3. 閱讀題面中的四個選項，點選下方 1～4 作答。
4. 即時模式選答後顯示解析；模擬模式交卷後才顯示。
5. 交卷後可重練答錯與未答題；可隨時收藏題目。

計時包含離開或關閉頁面的時間。得分是答對比例乘以 100 並四捨五入，不是官方及格判定。已交卷的答案不能修改；開始新測驗會取代目前試卷，保留歷史成績與收藏。

## 本機保存與備份

- 同一網站來源、同一瀏覽器才共用紀錄，無法自動跨裝置同步。
- 首頁可匯出／匯入 JSON 備份。備份包含最近試卷、收藏、最近 100 次成績與本機匯入的題庫。
- 匯入備份會先驗證，再詢問是否取代目前資料；單檔上限 20 MiB。
- 清除瀏覽器資料或使用無痕模式可能造成紀錄遺失，換裝置前請先備份。
- 備份中的掃描圖片使用相對路徑，圖片不包含在備份內；還原時需使用有相同圖片的網站。
- 原有資料損壞時可先匯出原始備份，避免直接清除資料。

## 本機預覽與測試

網站不需安裝 npm 套件。於專案根目錄執行：

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

開啟 http://127.0.0.1:8000 。不要直接雙擊 HTML，需透過 HTTP 載入 JSON 與 JavaScript modules。

有 Node.js 18 以上即可執行：

```powershell
npm test
npm run check
```

## 檔案結構

```text
index.html                 網站入口
assets/app.js              頁面、作答與本機保存
assets/core.js             計分、題庫與備份驗證
assets/styles.css          響應式介面
assets/questions/          題面與解析裁圖
data/catalog.json          題庫目錄與來源名稱
data/questions/            三章 JSON 題庫
tests/core.test.js         核心與題庫完整性測試
scripts/build_site.py      網站發布包產生工具
.github/workflows/         手動 Pages 部署流程
```

## 新增 JSON 題庫

將題庫存到 `data/questions/`，並在 `data/catalog.json` 的 `banks` 加入 `{"path":"questions/檔名.json"}`。也可以從首頁匯入 JSON，僅保存到目前瀏覽器。

基本格式（僅示範結構，不是原書題目）：

```json
{
  "id": "example",
  "title": "範例題庫",
  "questions": [{
    "id": "q001",
    "number": "1",
    "stem": "已核對的題幹",
    "options": ["選項一", "選項二", "選項三", "選項四"],
    "answer": 0,
    "explanation": "來源解析",
    "source": {"file": "", "page": 1}
  }]
}
```

`answer` 為 0 起算，0～3 對應 (1)～(4)。題庫 ID 及題目 ID 必須固定且不重複；題意或答案實質變更時請使用新 ID。

`textVerified: true` 表示題目已逐題對照原圖轉錄，介面以文字優先呈現，來源圖片收合保存。答案與題目 ID 不因格式轉換而改變。

掃描題另使用 `questionImages`、`explanationImages` 陣列，每張圖片包含 `src`、`width`、`height`。`src` 必須指向本站 `assets/questions/` 中的 JPG、PNG 或 WebP；不接受外部圖片網址。

## GitHub Pages 部署

網站以 **GitHub Actions** 發布：

1. Settings → Pages → Source 選 GitHub Actions。
2. Actions → Deploy quiz website to Pages → Run workflow。
3. 等待成功後開啟網站。

部署流程先跑測試，再產生 `_site/` 發布包，只放入口、assets 與可用題庫 JSON。未設定每次 push 自動發布，更新後需再手動執行。

網站公開可讀；答案也包含在前端 JSON，適合個人練習，不用於需要保密答案的正式考試。

