# 設定画面 デザイン修正の適用手順

対象: `app.js` の設定画面（小項目）と `style.css`

## 1. 部署ごとの名簿管理
| ファイル | 用途 |
|---|---|
| `roster-mock.html` | 修正後デザインの静的モック（ブラウザで開ける／CSSの正） |
| `roster-design.png` | スクリーンショット |
| `style-append.css` | `style.css` の末尾に追記 |
| `app-showRosterScreen.js` | `showRosterScreen()` の `renderRow` 〜 `body.innerHTML` を差し替え |

修正の意図
1. 名前・メールアドレス・役職・ログインを**固定幅の列**にして縦を揃える（長い値は省略記号）。
2. 承認者・固定宛先バッジを専用列に分離。「承認」「宛先」ラベル＋フロー名チップの2段。`編集` ボタンは常に右端の固定列。
3. チップから「承認者: 」「固定宛先: 」の接頭辞を削除。承認者＝青の塗り、固定宛先＝グレーの枠、未選択候補＝破線。
4. 追加ボタン: 非ログイン＝青 `#2f6fb0`（既存 `btn-primary`）／ログイン可能＝緑 `#2ba55d`（新規 `btn-roster-add-login`）。
5. 部署見出しに人数カウント。兼務＝「兼」、無効＝「無」の小マーク。
6. 見出し下の説明文は削除（別途、説明書に記載する方針）。

## 2. 通知の宛先設定
| ファイル | 用途 |
|---|---|
| `recipients-mock.html` | 修正後デザインの静的モック（一覧＋詳細） |
| `recipients-design.png` | スクリーンショット |
| `style-append-recipients.css` | `style.css` の末尾に追記 |
| `app-showRecipientsScreens.js` | `showRecipientsListScreen()` と `showRecipientsDetailScreen()` を丸ごと差し替え＋`updateRecipientSelectedCount()` を新規追加 |

修正の意図
1. 一覧: 2列のカードをやめ、**フロー名／固定宛先の人数／自動通知の状態**を固定列のリストに。OFF がある行だけ黄色バッジ（`recip-dyn-off`）で目立たせる。「対象外」は淡いグレー。
2. 詳細: 候補行を「チェック｜名前 86px｜メール」の固定列に。名前・メールが長くても縦が揃う。
3. グループ見出しに「役職から選択／部署から選択」と選択数（`2 / 3`）を表示。兼任で候補に入っている人には「兼務」マーク。
4. 工番担当者の自動通知は ON / OFF バッジ付きの行に。
5. 保存ボタンは本文下部の固定バー（`recip-footer`）に置き、選択中の合計人数を併記（`updateRecipientSelectedCount()` でチェック時に更新）。
6. 説明文（`settings-note`）は削除。

注意
- `saveRecipientDetail()` は変更不要。チェックボックスの `data-recipient-kind` / `data-recipient-id` / `data-dynamic-group` と、label 内 1番目の `<span>` が名前という構造を維持している。
- 詳細画面のデータ取得部分（`db.from('profiles')...`）は従来どおり。部署種別の候補に `department, extra_departments` を追加取得して「兼務」判定にのみ使用。

## 共通の値
- 設定パネル幅 740px 前提。名簿の列幅 `78px 178px 48px 52px minmax(160px,1fr) 52px`、宛先一覧 `minmax(0,1fr) 96px 148px 16px`、宛先詳細 `18px 86px minmax(0,1fr) auto`、いずれも `column-gap: 8〜10px`。
- 文字: 名前 14px/700、メール 13px `#7c8798`、列見出し 12px/700 `#9aa5b6`、チップ 12px。
- 色: 青 `#2f6fb0`／緑 `#2ba55d`／注意 `#fdf6e3` + `#8a6d00`／ON `#e8f6ee` + `#166534`／行の区切り `#f4f6fa`／見出し背景 `#f6f8fb`・`#fbfcfe`。
- チップは `min-height` + `padding` で高さを作る（固定 `height` にすると長い文字がはみ出す）。
- モックの氏名・件数はサンプル。実データで崩れる場合は列幅のみ調整する。
