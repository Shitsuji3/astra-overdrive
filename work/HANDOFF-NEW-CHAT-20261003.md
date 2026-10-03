# 新しいチャットへの引き継ぎ — 2026-10-03

## 最初に読むもの

作業場所は **C:\Users\situz\Documents\ChatGPT\Astragemes**。同じフォルダーで続ける。別のゲーム・別のクローンを起動しない。

1. 本メモ、ルートの `AGENTS.md`。
2. `work/CURRENT-STATE.md` の先頭25行と末尾の最新記録。
3. `work/CURRENT-SNAPSHOT.json` の `saved_at` / `backup_path` / `sha256` / `file_count` の概要。
4. `git status --short` と最新のコミット。必要な作業に関連するコード・資料だけを追加で読む。

過去の会話・引き継ぎ全文やsnapshot全ハッシュを最初から読まなくてよい。詳細な古い資料は `work/ARCHIVE-INDEX.json` の移動先を参照する。

**現在の依頼は引き継ぎ準備まで完了。未完の実装はない。** 「再開」と言われたら現在地を把握し、次の依頼に備える。古い計画の「未完」「GitHub未push」を根拠に巻き戻しや追加実装をしない。CURRENT-STATEの先頭と最新の公開確認を優先する。

## 守ること

- サブエージェント禁止。親が直接作業・検証する。Astra・Sol・Lunaのスキルよりユーザーとプロジェクトの委任禁止を優先。ユーザーのモデル/強度設定を勝手に下げない。
- 工場背景、承認済みキャラクター、UI、操作感を維持。依頼の範囲だけ変更。
- 見た目が簡易表示なら、先にサーバーのフォルダー・画像読み込みを調べる。素材を上書きして作り直さない。
- 変更前の復元可能な保存版を確認し、完了後は新しいZIPと現在地記録を更新。過去ZIPを上書き・削除しない。
- 新しいGitHub反映はユーザーの依頼時。今回は下記の変更まで公開済み。

## 最新の保存・公開状態

- ゲーム：ASTRA // OVERDRIVE。8体のボスラッシュが主コンテンツ。
- リポジトリ：https://github.com/Shitsuji3/astra-overdrive 、ブランチ `main`。
- 公開：https://shitsuji3.github.io/astra-overdrive/ （通常の日本語Web版）。
- ゲームコード最終コミット `0c4a63f`、その公開記録 `08e671d` までGitHub保存済み。
- 引き継ぎ作成前にローカルHEADとGitHub mainが `08e671d` で一致することを確認。Pages Actions **37084463270 success**。この引き継ぎ保存で文書のみのローカルコミットが追加される。ゲームコード変更なし。
- 最新ZIPは `work/CURRENT-SNAPSHOT.json` が指すもの。`dist/ASTRA-OVERDRIVE.zip` はそのコピー。新しい引き継ぎメモも保存対象。
- `qa/title-lights.cjs` は以前からの無関係な未追跡ファイル。触らず、無関係なコミットへ含めない。
- 作成時点で4173/4174/4175の待受なし。次のチャットで試遊する際は必要なサーバーを起動する。

## このチャットで完成・公開した変更

**ボス攻撃**：旧31技を保持し、各ボスへ外見に合う2技ずつ、計16技を追加して合計47技。鋏、水壁、羽ばたき針、雷柱、火球、転がり、尾の罠、虚空門、石柱、糸からの落下、吊り鋸、爆撃、重光線など。構え・部位変形・全身移動・予兆・隙・回避ヒント・技練習・被弾元記録へ接続。新技は予兆開始時に狙い/方向を固定。既存HP・旧技の値は維持。

**スマホ操作**：左下の8方向スティック＋右側の4ボタン。現在は **左＝セイバー、右＝ダッシュ、上＝バスター、下＝ジャンプ**。4ボタンは同じ大きさ。右上にポーズ/対応時全画面。設定で85〜125%の大きさを保存。横持ちは半透明の左右配置、縦持ちは画面と操作欄を分離。safe-area、複数タッチ、方向のスライド、短いタップ、長押しに対応。

**入力**：キーボード/マウス/パッドからタッチ入力を分離。指ごとに入力を所有し、別の指の解除で同時押しを解除しない。ポーズ・回転・非表示・OSキャンセル・ホスト停止で入力と未発射の溜めを取り消し、勝手に発射しない。

**現行の武器仕様に注意**：バスターは離すと通常弾1発。現行コードにはバスターのチャージショットはない。昔の依頼から勝手に復活させない。セイバー保持→READYで離すと溜め突き、上＋セイバーで斬り上げ、地上の下＋セイバー保持→離すと扇状弾（0.7/1.4秒で2/3段、各7発）。操作ガイドの現行仕様を基準にする。

## ファイルの担当と必要時の資料

| 対象 | ファイル |
|---|---|
| ボスの定義・追加技メタデータ | `assets/bosses.js` の `extraMoves` |
| 戦闘・入力・技の実行 | `game.js`、`BOSS_MOVES`、`setTouchInput` / `cancelTouchInput` |
| ボスモーション・予兆・攻撃描画 | `render.js` |
| 練習・回避ヒント・記録 | `mastery.js` |
| 指の所有・スティック・タッチ | `touch-controls.js` |
| ボタン配置・サイズ | `style.css` の `.touch-actions`、共通 `--touch-unit` |
| マークアップ・設定・メニュー | `index.html` / `ui.js` |
| 配布・英語版 | `tools/build-release.cjs` / `tools/playables-english.json` / `platform.js` |

詳しい追加技表・判定契約：`work/BOSS-EXTRA-MOVES-20261002.md`。
スマホ仕様・検証：`work/MOBILE-CONTROLS-20261002.md`。
軽量化：`work/CODE-CLEANUP-20260930.md`。
Playables準備・残件：`work/PLAYABLES-20261001.md`、`work/PLAYABLES-APPLICATION-DRAFT.md`。

## 起動・配布

PowerShellでプロジェクトを作業ディレクトリにする。

```powershell
npm start                    # 日本語のソース版 http://127.0.0.1:4173/
npm run build:ci              # 日本語の配布フォルダー release/ を再生成
npm run serve:release         # 配布版 http://127.0.0.1:4174/
npm run build:playables       # 英語版 release-playables/ と配布ZIPを再生成
npm run serve:playables       # 英語試遊 http://127.0.0.1:4175/、公式CSPあり
```

最新配布は50ファイル・展開約9.89MiB、Playables ZIP約9.49MiB。通常の公開サイトは日本語版。Playablesは技術準備済みの別ビルドで、YouTubeで正式配信した状態ではない。サーバーは新しいチャット/PC再起動で止まることがある。古い4173のプロセスを残したまま別フォルダーを配信しない。

## 検証の現在地

以下は前の実装・公開時の実施結果。引き継ぎ作成だけのために全テストを再実行してはいない。

- `npm test`：Node242件＋既存エンジン/モーション/SEチェック合格。
- 通常版/Playablesの両ビルド成功。
- 公開サイト：起動18項目、タッチQA10項目、ブラウザーエラー0。公開7ファイルをローカル配布版と照合済み。
- 配布版：ゲームパッド29項目、マウス11項目、SDKモック8項目成功。
- ボス：47技の通常/演出軽減QA、13,420部位形状、追加16技の左右/軽減、通常/低HP計16ループを確認。実際のジャンプ入力で水壁・炎獣の転がりを越える検証も実施。
- スマホ：320×568、390×844、667×375、844×390、1024×768で表示・重なり・44px以上の領域、サイズ保存、複数タッチ、キャンセルを確認。

必要な変更に合わせて検証する。変更がない開始時に全QA・履歴を読み直す必要はない。
関連QA：`qa/mobile-controls.cjs`、`qa/boss-moves.cjs`、`qa/boss-art-motion.cjs`、`qa/boss-extra-review.cjs`、`qa/playables-check.cjs`。
確認画像：`qa/mobile-controls/landscape.png` / `portrait.png`、`qa/boss-expansion/overview.png`。画像/ログはGit対象外、再現用スクリプトは保存済み。

ブラウザーQAで必要な実行環境（既存、再インストール不要）：
- Playwright：`C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright`
- Chrome：`C:/Program Files/Google/Chrome/Application/chrome.exe`
- 一部の `tests/browser-*.cjs` は `PLAYWRIGHT_PACKAGE` / `CHROME_EXECUTABLE` / `GAME_URL` の環境変数で指定する。
- バックアップ用Python：`C:/Users/situz/AppData/Local/Programs/Python/Python313/python.exe`。`tools/save-backup.py 固有ラベル` は全件照合しsnapshotを更新する。生成した新ZIPを通常のZIP別名へコピーしSHAを確認する。

## 残っている確認（自動的に実装を始めない）

1. Android/iOS実機での操作感・音声・表示は未確認。今回はChromeのスマホ相当環境で確認した。
2. 追加攻撃を含むボスの人による難易度・好みの調整は未完。
3. Playables公式Test Suiteの合格、参加申請、ポータル登録、YouTubeアプリでの実機検証・正式審査/配信は未実施。SDKモック成功を正式審査合格と言わない。

次に何を進めるかはユーザーの新しい指示に従う。
