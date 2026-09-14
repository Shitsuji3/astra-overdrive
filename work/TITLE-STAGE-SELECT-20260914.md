# タイトルからSTART MISSIONを削除（2026-09-14）

ユーザー依頼：Astraからの引き継ぎ（`work/HANDOFF-OPUS5-20260914.md`）を渡したうえで「START MISSIONを消して、ステージセレクトのみにします」。

「出撃の入口をステージ選択だけにする」と解釈した。操作ガイドとシステム設定は出撃ではないので残した。

## 作業開始時の状態

引き継ぎのコミット（20:16）の後、21:02に作られた未コミットの変更が作業ツリーにあった。変更されていたのは `index.html`、`ui.js`、`tests/browser-smoke.cjs`、`tests/browser-mouse.cjs`、`tests/browser-gamepad.cjs`。内容はこの依頼そのもので、筋も正しかった。上書きせず、差分をパッチとして退避してから、これを出発点にした。

その時点で `npm test` は134件合格、`tests/browser-smoke.cjs` は「menu skips hidden items」で失敗していた。

## 変更

- `index.html`：START MISSIONのボタンを削除。選択中の表示（`active`）をSTAGE SELECTへ移した（作業開始時の変更）
- `ui.js`：
  - クリック処理から `start` を削除（作業開始時の変更）
  - **起動時のフォーカスを直した。** 起動時に `menu[0].focus()` を呼んでいたが、STARTを消すと `menu[0]` は隠れたCONTINUEボタンになる。隠れたボタンにはフォーカスが移らず、起動直後は何も選ばれていなかった（キーボードのEnterが効かない）。`active(0)` にして、最初の見えている項目（STAGE SELECT）にフォーカスを置く
- テスト3本（作業開始時の変更を、そのまま使った）：
  - 出撃は、STAGE SELECT → ステージ（`launch-stage`）の順で行う
  - 起動テストに「START MISSIONが無い」を追加（18項目）
  - ゲームパッドテストは、STAGE SELECTから出撃する流れに変更（35項目）
- `qa/` のブラウザ系QAスクリプト66本（70か所）：`[data-action=start]` を押していた箇所を、STAGE SELECTを押してから、カーソルのあるステージ（`.stage-node.active`）を押す形にした。以前のSTART MISSIONも、選択中のステージで出撃していたので結果は同じ。66本とも構文チェック合格。37本はgit管理下、29本は `.gitignore` の `qa/*` で対象外（手元のファイルだけ直した）。記録用の `qa/enemy-redesign/changes.diff` は触っていない
- `.claude/launch.json`（gitの対象外）：公開用ビルドを4174番で配る `astra-release` を追加

## 変えなかったこと

- 隠れたCONTINUEボタン：表示される経路が無いので、そのまま残した
- タイトルの「SELECTED // …」の行：最後に選んだステージの表示として残した。ステージ選択を開くと、カーソルはそのステージにある
- クリア後のREPLAY（同じステージをもう一度）と失敗時のRETRY：変更なし
- ABORTでタイトルに戻ると、STAGE SELECTが選ばれた状態になる
- ゲームパッドのStartは、タイトルでは選択中の項目の決定なので、STAGE SELECTが開く

## 確認

- **起動直後のタイトル（実ブラウザ）：**
  - 見えるメニューは STAGE SELECT／操作ガイド／システム設定
  - フォーカスはSTAGE SELECT
  - Enterでステージ選択が開き、もう一度Enterで出撃する
  - ページエラー0
- **テスト：**
  - `npm test` 134件
  - `tests/browser-smoke.cjs` 18項目
  - `tests/browser-mouse.cjs` 11項目
  - `tests/browser-gamepad.cjs` 35項目
- **書き換えたQAの一部を実際に実行：**
  - `qa/rising-sheet.cjs`（弧は変わらず、エラー0）
  - `qa/boss-rush-preview.cjs`（エラー0）
  - `qa/thrust-ingame.cjs`（エラー0）
  - `qa/release-check.cjs`（公開用ビルドを4174番で配信、合格）
- **ビルド：** `npm run build:ci` 成功
