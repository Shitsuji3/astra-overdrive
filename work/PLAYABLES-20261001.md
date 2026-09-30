# YouTube Playables準備 — 2026-10-01

## 用意したもの

- 専用配布ZIP: `dist/ASTRA-OVERDRIVE-playables.zip`。ZIP直下にindex.html。49ファイル、展開後約9.87MiB、ZIP約9.48MiB。画像と音質は既存の軽量配布版と同じ。
- 専用配布フォルダー: `release-playables/`。通常の日本語Web版`release/`とは別。Playables版は英語表示。ゲームの数値・素材・モーションは変更しない。
- 復元用ZIPとハッシュ: `work/CURRENT-SNAPSHOT.json`。これは配信用ZIPではなく、原本・制作資料・検証コードを含む保存版。
- 申請文面の下書き: `work/PLAYABLES-APPLICATION-DRAFT.md`。

## 実装

`platform.js`がSDK連携を担当。Playables配布時だけ公式SDKを全ゲームスクリプトの前に読み込む。通常版はSDKも外部通信も追加しない。

- 起動: 読み込み画面を配置してfirstFrameReadyを通知。クラウド保存の読み込みとタイトル画像のdecodeが終わってからgameReady。ホストがiframeを隠して待つ場合があるので、firstFrameReadyをRAF待ちにしない。
- 音声: YouTube側のisAudioEnabled/onAudioEnabledChangeを反映。ゲームの音量を上げてもホストのミュートを解除しない。Playablesの設定画面はBGM/SE別音量を残し、全体消音をYouTube側に任せる。
- 停止: onPauseでゲームRAF・パッドRAF・時計タイマー・CSSアニメーション・画像加工キュー・BGM/SEを停止。入力も無効化。onResumeのみで再開。手動ポーズや結果画面は元のまま。復帰時の誤射を防ぐため保持入力とチャージを解除する。Playablesではvisibilitychange/blur/pagehide/pageshowによる停止・復帰を登録しない。通常Web版の非表示時停止は維持。
- 保存: SDKのloadDataが成功するまでUI起動とsaveDataを禁止。ボス撃破・記録・設定変更時に保存。失敗した書き込みは保持し、次の保存またはSDK pause/resume時に再試行。書き込みは直列化し、最新データを最後に送る。読み込み失敗は再試行画面にして初期値で上書きしない。
- データ: `{version:1,settings:{...},best:数値}`。旧Web版の設定JSON形式も読み込める。未知バージョンは上書きしない。PlayablesではlocalStorage/sessionStorageを使用しない。通常版の既存キーは維持。記録と設定を保存し、進行中の戦闘そのものはセッション内に保持する。
- Playablesでは結果画像のダウンロードボタンを非表示（公式sandboxでダウンロードが許可されない）。通常版は保持。sendScoreは任意APIのため未実装。コンティニュー/難易度を混ぜたランキングを新設しない。
- 英語: `tools/playables-english.json`をビルド時だけ適用。メニュー・操作・設定・結果・ステージ/ボス紹介・ロードエラーを英語化。Webの言語APIは使わず、Playablesの初版は英語固定。通常版は日本語。

## 再生成と確認

```powershell
npm ci
npm test
npm run build:ci
npm run build:playables
npm run serve:playables
# 別のターミナルで
node qa/playables-check.cjs
```

Playablesローカル確認: http://127.0.0.1:4175/ 。このサーバーは公式資料のContent-Security-Policyを付ける。SDKはYouTube以外で単独実行するとno-opになるので、クラウド保存の確認には公式Test SuiteまたはQAのSDKホストが必要。

QAは同梱物ではない。通常Web配布/Pagesは引き続き`npm run build:ci`→`release/`を使う。Playables ZIPを通常サイトへ誤配信しない。

## 今回の検証

- npm test: Node集計223件（従来213＋SDK10）と既存エンジン/モーション/ステージ/SEチェック成功。
- 通常の圧縮配布版: 起動18、パッド29、マウス11項目成功。ブラウザーエラー0。
- GitHub基準d42ac8eとの描画/状態比較: 273枚のPNGハッシュと8ボス各180ステップが一致。比較スクリプトは後から追加したplatform.jsを旧版比較から除外する。
- Playablesの圧縮配布版＋公式CSP＋SDKモック: 通知順序、クラウド設定読込、書込/再読込、ミュート優先、停止中の画像/時刻/入力/音声の固定、手動ポーズ保持、死亡演出停止/復帰、ロード失敗とキーボード再試行、英語ガイド、ダウンロード非表示、ストレージアクセス0、外部通信はSDKだけ、スマホ縦横の操作ボタンを確認。エラー/404なし。
- 実SDKを使用した単独ローカル起動も確認（SDKがno-opとなる環境）。Android/iOS実機、実YouTubeアプリは未検証。
- ZIPを読み戻し、49ファイル全件を配布フォルダーとバイト照合。ビルド時に参照ファイル・ASCIIファイル名・総量250MiB・単体30MiB・8000ファイル上限も検査。

**公式Test Suiteの合格確認は未完。** Codex内ブラウザーで公式ツールのローカルiframeが起動待ちのままとなり、SDKイベントが表示されなかった。原因は特定できていない。0/5の未評価状態を合格/ゲーム不具合と扱わない。単独起動とモック検証を公式審査合格と混同しない。配信ポータルが使える段階で、YouTube Dev Link/Test Suite Linkと実機を使って再確認する。

## 配信までの手順

1. [公式参加希望フォーム](https://developers.google.com/youtube/gaming/playables/support/contact)から参加希望を申請。公開済みデモURLと下書きを利用できる。本人情報と素材の権利確認は本人が記入・確認する。今回は送信していない。
2. ポータルは招待制。対象チャンネルの参加承認と必要な管理権限が得られたら、ゲーム情報・配布ZIP・サムネイルを登録する。手元の日本語版の既存サムネイルは候補で、ポータルの指定サイズ等に合わせる作業は残る。
3. Create release後に発行されるDev LinkでPC、モバイルWeb、Android/iOS YouTubeアプリを検証。公式Test Suiteで通知・停止・音声・保存を再確認する。
4. 素材・音源の利用権と申請情報を確認してから審査申請する。招待/審査/公開をこの実装だけで保証しない。

現段階では技術準備とローカル保存まで。GitHub push、参加フォーム送信、ポータルアップロード、正式配信は行っていない。

## 公式参照

- [SDK導入](https://developers.google.com/youtube/gaming/playables/reference/getting_started)
- [統合要件](https://developers.google.com/youtube/gaming/playables/certification/requirements_integration)
- [サイズ・性能要件](https://developers.google.com/youtube/gaming/playables/certification/requirements_stability)
- [英語対応要件](https://developers.google.com/youtube/gaming/playables/certification/requirements_i18n_l10n)
- [CSPと公式Test Suite](https://developers.google.com/youtube/gaming/playables/reference/test_suite_guide)
- [ポータルと参加条件](https://developers.google.com/youtube/gaming/playables/developer_portal)
