# Opus5への引き継ぎ — 2026-09-14 夜

## 最初に読むこと

作業フォルダー：`C:\Users\situz\Documents\ChatGPT\Astragemes`

このフォルダーをそのまま使ってください。古いZIPを展開して上書きする必要はありません。`AGENTS.md` → 本書 → `work/CURRENT-SNAPSHOT.json` → `work/CURRENT-STATE.md` 末尾の順で確認します。

**本書は、同日昼の `work/HANDOFF-20260914.md` より新しい引き継ぎです。** 旧資料はゲーム全体の構成・操作・残件を読むために使い、公開コミット・ボスラッシュ回復量・テスト件数は本書を優先してください。

今回の依頼は引き継ぎファイルの作成です。次のゲーム改修はまだ指定されていません。過去の未完計画を理由に、自動で改修・巻き戻しを始めないでください。

## 現在の保存・公開

- リポジトリ：`https://github.com/Shitsuji3/astra-overdrive`
- 公開サイト：`https://shitsuji3.github.io/astra-overdrive/`
- 公開済みゲームコード：`8b59b7ef64d5dba3e18863930f721ec6bb686433`
- ローカルmain：引き継ぎ作成前は `93bf080`。公開確認の記録だけが公開版より先行。ゲーム本体は公開版と同じ。
- Pages：run `34836834661` が成功。公開ファイルの新エフェクト・4回復・出現マーカーを確認済み。公開URLのブラウザー起動テスト17項目も成功、エラー0。
- 最新保存ZIP：`dist/history/ASTRA-OVERDRIVE-boss-rush-recovery-preview-20260914-200703.zip`
- ZIP SHA-256：`905643d1db390ff51d2c84b06c158c597926a60093b421cdf71f2f889bacbb82`
- 224ファイル収録。ハッシュ一覧は自己参照になるCURRENT-SNAPSHOTを除く223ファイル。引き継ぎ時にZIPハッシュ・各ファイルを照合し、差は公開記録を追記したCURRENT-STATEだけ。
- `dist/ASTRA-OVERDRIVE.zip` もこの最新版をコピー済み。過去95個の保存ZIPは残してある。

## 今回Astraが実装した2件（ともに公開済み）

### ボスの攻撃エフェクト — fac3d1b

ユーザー依頼：「ボスの攻撃エフェクトをもっとカッコいいものにしたい」

- `render.js`：8体の固有パレット、弾の発光芯と残光、曲射弾、地面の刃状衝撃波、地雷の導火リング、独立した壁弾、予兆の収束粒子、突進の光跡、跳躍の弧、着地／着弾の衝撃リング。
- 主な関数：`bossColors`、`bossProjectile`、`bossEnergy`、`bossImpact`。既存の予兆 `bossTell` は維持。
- `game.js`：ボスが生成した弾に描画専用 `fxBoss` を付ける。子地雷・破片へ継承。`_bossImpact` は寿命0.38秒の描画粒子のみ。
- ダメージ、判定、弾数・速度、攻撃タイミング、SEは変更していない。乱数の追加呼び出しもしていない。
- 弾幕の安全な穴を装飾で接続しない。演出軽減では粒子・火花を省き、光跡と発光を抑える。
- `work/BOSS-ATTACK-FX-20260914.md`、`qa/boss-attack-fx.cjs`、`qa/boss-attack-fx/verification.json`。
- 確認画像：`qa/boss-attack-fx/preview.png`。実際の描画器でQA用に攻撃・位置を配置した一覧で、通常プレイ録画ではない。

### ボスラッシュ — 8b59b7e

ユーザー依頼：「雑魚を配置しない」「1体倒すごとにライフ4回復」「次の出現位置がわかるように」

- `assets/stages.js` のgauntlet：道中を含め雑魚3体をすべて削除。床・足場・拾得物・ボス8体の順序は維持。ステージ紹介文も4回復へ更新。
- `game.js` の `_bossDown`：gauntletだけHPを4回復。最大HPで打ち止め。最後の8体目も回復する。冒頭の `if(b.down)return` で二重付与を防ぐ。
- `_nextBoss` の旧「出現時に2回復」は削除。通常ステージの回復仕様は変更していない。
- 撃破時に `state.nextBossMarker` を作成。次ボスのid/name、実際の出現中心 `arena.bossX + next.w/2`、床y310、体の幅・高さを保持。
- `render.js` の `nextBossMarker`：既存の撃破演出2.2秒の間、次の出現位置に枠・床リング・名前・残り秒数。画面外なら左右方向矢印。演出軽減に対応。
- `_spawnBoss` でマーカーを消す。最終ボスの撃破には次マーカーを作らない。出現位置や出現待ち時間そのものは変更していない。
- `tests/bosses.test.cjs`：8体通しの回復・マーカー確認、最大値・二重付与防止・通常ステージへの非影響・再開始を検証。
- `qa/boss-rush-preview.cjs` と `qa/boss-rush-preview/verification.json`、確認画像 `qa/boss-rush-preview/preview.png`。

ユーザーはこの2件をGitHubにも保存するよう依頼し、公開まで完了しています。エフェクトの美的な完成度について追加の評価はまだありません。

## 維持するゲーム仕様

- 8ステージ＋BOSS RUSH、ボス8体、地図型ステージ選択とゲームパッドメニュー。
- 工場背景、青・アイボリーの主人公、シアンのスカーフ、機械兵の敵、既存UIを維持。
- 本人の右手＝セイバー／手袋、左腕＝バスター。
- バスターは補助。左クリック／Jを**離した時に通常弾1発**、威力1。チャージショットは廃止済み。
- 右クリック／K：3段斬り。1段0.40秒、威力4.5／4.5／2.8125×4。
- 上＋セイバー：斬り上げ。炎の輪郭が接触した瞬間から0.065秒間隔、最大4回、合計11.25。落下中の構えには判定なし。
- セイバー長押し：溜め突き。全体0.90秒、4.5×4、約27px踏み込み。チャージ音とメーターはこの技専用。
- ユーザー承認済みセイバーSE・提供チャージ音・初期全体音量0.4を維持。

## 残件（この引き継ぎでは着手しない）

旧 `work/HANDOFF-20260914.md` の判断待ち一覧が引き続き有効：斬り上げの合計威力・最大ヒット数・落下中の判定、バスターを押した瞬間に撃つ案、参考GIFに対する炎の形と白色比率、溜め突きの輪と時間配分、実機ゲームパッド確認など。現在の値を勝手に変更しないこと。

古いQAの `qa/check-renderer-regression.cjs`、`qa/combat-review.cjs`、`qa/final-motion-acceptance.cjs` はチャージショット前提が残る。npm testには入っていない。旧期待値だけで現在の実装を巻き戻さない。

不要な旧worktree `.claude/worktrees/gracious-chebyshev-dde976` はマージしない。既に解決済みの別調査。

## 起動と検証

```powershell
Set-Location 'C:\Users\situz\Documents\ChatGPT\Astragemes'
node server.cjs
# http://127.0.0.1:4173/。起動済みなら二重起動不要。
npm test
npm run build:ci
node qa/boss-attack-fx.cjs
node qa/boss-rush-preview.cjs
```

直近の実施結果：npm test 134件成功、build:ci成功。ボスFXは旧ゲームc3f87c1との64攻撃比較一致、256パターン描画で状態変更なし・エラー0。ボスラッシュは実ブラウザーで雑魚0、HP2→6、次ボス遷移時の追加回復なし・マーカー消去、左右画面外案内と演出軽減を確認。

```powershell
$env:PLAYWRIGHT_PACKAGE='C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
$env:CHROME_EXECUTABLE='C:/Program Files/Google/Chrome/Application/chrome.exe'
$env:GAME_URL='https://shitsuji3.github.io/astra-overdrive/'
node tests/browser-smoke.cjs
```

公開URLで17項目成功済み。ボスラッシュ専用QAは現状localhost固定、FXのQAはGAME_URL指定可。本書作成時はゲームコードを変更せず、保存の照合だけを再実行した。

## 保存・公開の注意

- サブエージェント不使用というプロジェクト指定を守る。
- 変更前に保存版を確保、完了後は検証して `tools/save-backup.py <label>` で新しい履歴ZIPとCURRENT-SNAPSHOTを作る。CURRENT-STATEも更新し、古い保存版を残す。
- 主要ソースのCRLFを維持。日本語テキストはUTF-8。
- Gitは1変更につき1コミット。公開pushは、その変更についてユーザーから依頼された時に行う。
- **CLIのgit pushは認証ダイアログで止まる。今回も中断した。GitHub DesktopのPush originを使う。** 認証情報をファイルから探したり貼り付けたりしない。
- GitHub Desktop：現在のリポジトリastra-overdrive／worktree Astragemes／mainを確認してからPush。画面の座標を固定値で再利用しない。
- push後は `git -c credential.helper= fetch origin` でリモート一致を確認、Pages成功と公開ファイル・ブラウザー動作を確認する。
- 簡易図形のゲーム画面になった場合はまず4173と画像配信を確認。正常な素材を別デザインで上書きしない。

## Opus5に渡す文面

このフォルダーの `work/HANDOFF-OPUS5-20260914.md` を起点に引き継いでください。同日昼のHANDOFFよりこちらが新しいです。現在の公開ゲームは8b59b7e、ボスラッシュは雑魚なし・撃破ごと4回復・次の出現位置表示まで実装済み。サブエージェントは使わず、まず現在地を確認して次の依頼を待ってください。
