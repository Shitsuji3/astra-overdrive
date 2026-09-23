# Opus5.5 引き継ぎ — 2026-09-23

## 作業場所と最初に読むもの
作業場所: C:/Users/situz/Documents/ChatGPT/Astragemes
AGENTS.md、work/CURRENT-STATE.mdの末尾、work/CURRENT-SNAPSHOT.jsonの概要から始める。現在の完成版を基準に次のユーザー依頼へ進む。未完の実装依頼はない。過去の「未push」は後の公開確認で解消済みの場合がある。
サブエージェントは禁止。背景・キャラクター・操作感を維持し、別ゲームを作り直さない。簡易描画になった場合はサーバーや素材読込失敗を先に確認する。

## 保存・公開状況
- ローカル: http://127.0.0.1:4173/
- 公開: https://shitsuji3.github.io/astra-overdrive/
- リポジトリ: https://github.com/Shitsuji3/astra-overdrive （main）
- 引き継ぎ作成前HEAD: 79af638（公開確認の文書コミット）。公開済み実装: 696ba421c038b3a4679c3cafb3ee9413d3605193。
- 9月21日確認: Pages Actions 35608488260 success、公開起動18項目成功・ブラウザーエラー0。
- 引き継ぎ開始時の保存版: dist/history/ASTRA-OVERDRIVE-published-title-bgm-20260921-225450.zip。SHA256: f7b197825a7fb5bed6138a7e71ba908524f663d5e30dd5d70e571c917dedd91b。
- 最新のバックアップはCURRENT-SNAPSHOT.jsonを参照。今回の引き継ぎも別名保存する。
- 未追跡qa/title-lights.cjsは発光確認スクリプト。削除不要。開始時、ゲーム本体に未コミット変更なし。
- 今回は引き継ぎ資料のみ。GitHubへの追加送信は行っていない。

## 最近確定した仕様
- タイトルは「ボスラッシュ」「設定・操作方法」の2項目。練習する・START MISSIONは表示しない。敗北からの練習機能は残す。
- 胸のオレンジ、バスター先端の青、両目が4.4秒周期で発光。assets/title-core-glow.svgをstyle.cssの.title-art::afterで重ねる。元画像1672×941と同じ座標・cover位置。元画像は加工していない。
- OSの動き軽減では発光を静止。ゲームの「画面の揺れを抑える」設定とは連動させない（連動させて見えなくなった不具合を修正済み）。狭い確認パネルでは胸が画面外なので横幅を広げる。
- タイトルBGM1: assets/title-bgm.mp3（提供bgm1.mp3）。ゲームBGM2: assets/stage1-bgm.mp3（名前は従来通りだが中身は提供BGM2.mp3）。
- audio.jsのstartTitle()/start()/selectTrack()で旧曲停止・切替。ui.jsの初期表示/帰還でstartTitle。初回自動再生拒否時はpointerdown/keydownで再試行。
- BGM出力倍率0.5を追加済み。保存済み設定でも半音量。標準出力はmusic .45 × master .4 × .5 = .09。SEとスライダー設定値は維持。ポーズ/敗北/クリアは曲を止めずさらに半音量。
- 命中SE: assets/saber-hit-sound.js。セイバーで実際に敵/ボスへダメージを与えた時だけ振り音に重ねる。空振り/弾消し/射撃では鳴らさない。75msの連続発音抑制。詳細assets/SABER-AUDIO.md。
- メインは8体ボスラッシュ。雑魚なし、1体撃破ごとHP4回復（上限8）、次の出現位置表示・ボス登場演出あり。

## ファイル案内
- game.js: 戦闘・状態・当たり判定
- mastery.js: ボスラッシュ・練習・記録・反撃等の拡張
- render.js: ゲーム描画
- assets/saber-rig.js / run-rig-v6.js等: プレイヤーモーション
- assets/bosses.js / bosses/: ボス
- audio.js: BGM/SE、ui.js: メニュー/設定/起動、index.html/style.css: 画面
- tools/build-release.cjs: 配信用release生成。発光SVGとBGM2曲は配布一覧登録済み。
- 詳細が必要な場合のみwork/BOSS-RUSH-MASTERY-20260920.md、BOSS-ENTRANCE-20260920.md、RUSH-UX-20260920.mdを読む。

## 起動・検証・保存
- 起動: node server.cjs（4173）。バックグラウンド起動時は非表示ウィンドウを使用。
- npm test / npm run build:ci。9月21日に全テスト成功。今回の資料作成では再実行していない。
- qa/title-game-bgm.cjs: 曲読込/再生、切替、二重再生なし、ポーズ半音量、タイトル復帰、ミュート。
- qa/explosion-sound.cjs: 音声VMテスト。addEventListenerスタブ不足による公開CI失敗を修正済み。
- tests/browser-smoke.cjs: GAME_URLで公開URL指定可。PLAYWRIGHT_PACKAGE / CHROME_EXECUTABLEを設定する。
- Playwright: C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright
- Chrome: C:/Program Files/Google/Chrome/Application/chrome.exe
- Python: C:/Users/situz/AppData/Local/Programs/Python/Python313/python.exe
- 保存: Pythonでtools/save-backup.pyに固有ラベルを渡す。ZIP全ファイルのハッシュを再検証しCURRENT-SNAPSHOTを更新する。生成ZIPをdist/ASTRA-OVERDRIVE.zipへコピー。過去ZIPは削除・上書きしない。
- Git CLIのpushは認証待ちになることがある。既存ログイン済みGitHub Desktopでリポジトリastra-overdrive、worktree Astragemes、mainを確認しPush originが使用できた。認証情報を探さない。
- 公開はPages Actions成功と公開版の動作まで確認する。
- 過去資料はwork/ARCHIVE-INDEX.jsonに移動先。デスクトップの保管資料は必要時だけ読む。
