# 画面を閉じても音が鳴る件の修正 — 2026-09-24（Opus 5.5）

ユーザー報告「画面閉じてもずっと音が鳴る」。サブエージェント不使用。

原因：BGMは<audio>要素、効果音はAudioContextで鳴らしており、ページが見えなくなった時（タブ切替・最小化・アプリ切替・スマホの画面オフ）に止める処理がなかった。ゲームはウィンドウのblurでポーズするが、ポーズはBGMを半分の音量にするだけで、スマホではblurが来ないこともある。

修正：
- audio.js：visibilitychangeで隠れたらBGMを一時停止・AudioContextをsuspend・溜め音を停止。見えたら再生中だった曲を再開しcontextをresume。pagehide/pageshowも同様（戻る/進むキャッシュ）。隠れている間は効果音やplayMediaでcontext・曲を再開しない。止めた曲は戻っても止めたまま。
- game.js：プレイ中に隠れたらpause()（ポーズ画面を出す）。戻ってもポーズのまま。destroyでリスナーを外す。

検証：npm test成功（Node集計213件＝207件＋tests/hidden-page.test.cjs 6件。修正前のコードでは6件中5件が失敗することを確認）。Chrome（Playwright）でタイトル：隠す→BGM停止、戻す→再開。戦闘中（セイバー溜め中）：隠す→BGM停止・効果音context suspended・ポーズ画面、戻す→BGM再開・ポーズのまま。ヘッドレスではタブを切り替えても表示状態が変わらないため、visibilityStateを隠れた状態にしてイベントを送って確認。qa/title-game-bgm.cjs（曲の再生・重複なし・ポーズ半音量・タイトル復帰・ミュート）合格。起動18・パッド29・マウス11成功、エラー0。実機スマホでの画面オフは未確認。
