# 部署ごとの名簿管理 — デザイン修正の適用手順

対象: `app.js` の `showRosterScreen()`（設定 → 部署ごとの名簿管理）と `style.css`

## 添付ファイル
| ファイル | 用途 |
|---|---|
| `roster-mock.html` | 修正後デザインの静的モック。ブラウザで開けば完成形が見られる。CSSはこの中の「style.css に追記する内容」ブロックが正 |
| `roster-design.png` | 完成形のスクリーンショット |
| `style-append.css` | `style.css` の末尾にそのまま追記する CSS |
| `app-showRosterScreen.js` | `app.js` の `showRosterScreen()` 内、`renderRow` 〜 `body.innerHTML` を差し替えるコード |

## 修正の意図
1. 名前・メールアドレス・役職・ログインを**固定幅の列**にして縦を揃える（長い値は `text-overflow: ellipsis` で省略）。
2. 承認者・固定宛先バッジを氏名行から切り離し、**専用列**に「承認」「宛先」ラベル＋フロー名チップの2段で表示。バッジが増えても `編集` ボタンが折り返さない。
3. 「承認者: 」「固定宛先: 」の接頭辞をチップ本文から削除し、フロー名のみ表示。承認者＝青の塗り、固定宛先＝グレーの枠、未選択候補＝破線。
4. 追加ボタン: 非ログイン＝青 `#2f6fb0`（`btn-primary`）／ログイン可能＝緑 `#2ba55d`（新規 `btn-roster-add-login`）。従来のグレーをやめた。
5. 部署見出しに人数カウントを追加。兼務＝「兼」、無効＝「無」の小マーク。
6. 見出し下の説明文は削除（別途、説明書側に記載する方針）。

## 適用手順
1. `style-append.css` の内容を `style.css` の末尾に追記。
2. `app.js` の `showRosterScreen()` を開き、`const renderRow = ...` から関数末尾の `body.innerHTML = \`...\`;` までを `app-showRosterScreen.js` の内容で置換。関数前半（`db.from('profiles')...mergeRosterRows`、`departments` の算出）は変更しない。
3. `getApproverBadges()` / `getFixedRecipientBadges()` は変更不要。返り値の文字列から接頭辞と「（未選択）」を正規表現で外して使う。
4. `editRosterMember()` 以降の編集画面は今回対象外（未変更）。

## 主要な値
- 列幅: `78px 178px 48px 52px minmax(160px,1fr) 52px` / `column-gap: 8px`（設定パネル幅 740px 前提）
- 文字: 名前 14px/700、メール 13px `#7c8798`、役職 13px `#5b6b80`、列見出し 12px/700 `#9aa5b6`、チップ 12px
- 色: 承認チップ `#2f6fb0`（文字 #fff）／固定宛先チップ `#f6f8fb` + 枠 `#e5e9f1`（文字 #5b6b80）／行の区切り `#f4f6fa`／列見出し背景 `#fbfcfe`
- チップは `min-height:22px; padding:1px 8px; white-space:nowrap; flex-shrink:0`（固定 height にすると長い文字がはみ出す）
