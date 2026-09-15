# Opus5への引き継ぎ — 2026-09-15

## 作業場所と優先事項
ゲーム本体: C:\Users\situz\Documents\ChatGPT\Astragemes
同じPCならこのフォルダーを直接使う。古いZIPを展開して上書きしない。
AGENTS.md → この文書 → work/CURRENT-SNAPSHOT.json → work/CURRENT-STATE.md末尾の順に確認。
サブエージェント禁止。工場背景・青いプレイヤー・UI・操作感・採用済みSEを維持し、次のユーザー依頼だけ変更する。
簡易キャラクターや背景になった場合はサーバー/画像読込の問題を先に確認する。

## 保存と公開
- ゲームコード最新: 2331fab25eb11662b7df2e26373a481a07f2a406 (main)。
- GitHub: https://github.com/Shitsuji3/astra-overdrive
- 公開: https://shitsuji3.github.io/astra-overdrive/
- 上記コミットはpush済み。Actions 34961914196 が success、公開game.jsのchargeMax:1.4と連続発射処理も確認済み。
- CURRENT-STATE内の過去の「push未実施」は当時の記録。2331fabまで公開済み。
- 引き継ぎ作成前の復元点: dist/history/ASTRA-OVERDRIVE-fan-charge-20260915-195138.zip
- SHA256: 57e551a4ce1d4280bbeefa24eb3abd80d69c65332503118ae06ad2deecffbe97（再計算一致）。
- 本書保存後の最新バックアップは CURRENT-SNAPSHOT.json を参照。古い保存版を消さない。
- 本書の追加は資料のみ。ゲームコードの変更はない。

## 最新機能: 扇状弾チャージ
地上で↓/S＋セイバー（K/右クリック、パッド下＋Y）を長押しし、セイバーボタンを離すと発射。
「段」は7発の扇状弾を連続して出す回数。
| 保持時間 | 段数 | 1発の威力 |
|---|---|---|
| 0.7秒未満 | 1段（7発） | 4.5 |
| 0.7秒以上、1.4秒未満 | 2段（14発） | 6.75 |
| 1.4秒以上 | 3段（21発） | 9 |

満タンでも自動発射しない。下方向を離してもセイバー保持中はチャージ継続。ポーズ/フォーカス喪失では保持をキャンセル。
段間0.12秒、上向き150度の扇、速度265、弾半径6、寿命1.8秒。
チャージ中は腕を上げて青白いドームを保持。段数で光輪と大きさが増す。HUDはFAN段数とゲージ、既存チャージSEを使用。
数値はユーザーが細かく指定したものではなく初期バランス。今後の調整は次の指示に従う。

実装:
- game.js: combat.fan / fanLevel / saberChargeShown、_tickの段7処理、_fanBurst、_clearMouse。
- プレイヤーのfanCharge（秒）、fanReleased。段数はfanLevelで算出。各攻撃開始時にリセット。
- saberCombo=7。保持中saberTimeをspan*.55以上に保ち、モーション位相.45でドームを維持。
- 解放後は元の1.02秒アニメーションを続行。発射時刻.72/.84/.96秒。saberHitsを発射済み段数に使用。
- 通常セイバーや溜め突きへ誤移行させない。段7ドームには近接攻撃/敵弾消去判定はない。
- assets/saber-rig.js: 段7ポーズ、drawFanChargeの輪とドーム。
- render.js: fanProjectile、fanLevel/effectTimeをリグへ渡す、FAN HUD。段7では溜め突き用手元放電を描かない。
- ui.js/index.html: 操作ガイドとコマンド表示。
- tests/motion-combo.test.cjs: 閾値直前/到達、最大超過保持、弾数/威力、再チャージ、ポーズ取消。
- qa/fan-charge.cjs: 実ブラウザーの右クリック保持→解放の検証。
- qa/fan-charge/charge.png、release.png、verification.json: ローカル確認結果（Git対象外）。

## 他の変更を維持する
- START MISSIONは削除済み。STAGE SELECTから出撃。
- バスターは補助射撃、離した時1発/威力1。以前のバスターチャージを復活させない。
- 通常セイバー3段・斬り上げは継続。
- 溜め突きの範囲は縦横1.5倍済み。1ヒット6.75、4ヒット計27。
- 死亡時は装甲12片の破壊演出1.15秒後にリトライ画面。
- ボスラッシュは雑魚なし、ボス撃破ごとHP4回復（上限8）、次ボス位置予告あり。
- 右手セイバー/左手バスター。採用済みSEとBGMを勝手に変更しない。
過去の詳細はwork/HANDOFF-20260914.md、work/PLAYER-BREAK-THRUST-20260914.md、work/FAN-BURST-20260915.md。
古い文書の数値より現行コード/本書を優先。

## 起動・検証・保存
npm start（node server.cjs）→ http://127.0.0.1:4173/
既にサーバーが動いていれば二重起動しない。
npm test: 最新実装時146件合格。
npm run build:ci: 成功。
node qa/fan-charge.cjs: 最大チャージ21発、全弾威力9、ページエラー0。画面も目視確認済み。
今回の資料作成だけではテストは再実行していない。
PlaywrightとChromeのパスはqa/fan-charge.cjsに記載。
Python: C:/Users/situz/AppData/Local/Programs/Python/Python313/python.exe
変更前にバックアップを確認。完了時tools/save-backup.py <固有ラベル>を実行しCURRENT-SNAPSHOT更新、必要に応じdist/ASTRA-OVERDRIVE.zipへ新ZIPをコピー。
Gitのコマンド認証は未設定。直近pushはログイン済みGitHub DesktopのPush originを使用。認証情報を抽出しない。

## 残件
現在の依頼は完了。ユーザーが引き継ぎを希望したため本書を作成した。
次に何を直すかはユーザーからの指示待ち。古い未完メモを理由に巻き戻さない。
