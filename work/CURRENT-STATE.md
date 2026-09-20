# 現在地 — 2026-09-20（通常はこの短縮版だけ読む）

## 現在の基準
- 本体: C:\Users\situz\Documents\ChatGPT\Astragemes。サブエージェント禁止。
- 公開済みゲームコード: f43569a（ボス部位モーション）。最新ローカルは下記ボスラッシュ改善。未push。
- 公開: https://shitsuji3.github.io/astra-overdrive/
- 最新保存版とSHA: work/CURRENT-SNAPSHOT.jsonのsaved_at、backup_path、sha256を確認。files_sha256全件は照合が必要な時だけ読む。
- 工場背景、プレイヤー、UI、操作感を維持。簡易表示ならまず4173のサーバーと画像読込を確認。
- 起動: npm start。検証: npm test、npm run build:ci。保存: tools/save-backup.py 固有ラベル。

## 必要な時に読む資料
- 全体の詳しい引き継ぎ: work/HANDOFF-20260919.md。
- ボス: work/BOSS-MOVES-20260917.md、COILHEAD-FLIGHT-20260916.md、BOSS-SIGNATURE-20260915.md。
- 扇状弾: work/FAN-BURST-20260915.mdとgame.jsのcombat.fan。地上↓＋セイバー保持→離す。0.7秒/1.4秒で2段/3段、各7発、威力4.5/6.75/9。
- 溜め突き/死亡: work/PLAYER-BREAK-THRUST-20260914.md。突きは1ヒット6.75×4。START MISSION削除済み。
- ゲームパッドの失敗画面テストは演出終了を待つよう修正済み。39項目合格。
- ボスの難易度は人のプレイ確認待ち。以前の判断待ちはHANDOFF-20260919.mdとHANDOFF-20260914.mdに保持。勝手に解決扱いしない。
- 前担当の検証: npm test169件、起動18項目、マウス11項目成功。今回は資料整理のみでこの結果を再実行済みとはしない。
- 公開は依頼時にGitHub Desktopからpush。今の整理は未push。

## 2026-09-19の整理
- デスクトップ保管先: C:\Users\situz\Desktop\ASTRA_過去資料保管\整理-20260919-215917
- 古い計画・引き継ぎ・ログ等49ファイルを移動。削除なし。移動前後のハッシュ一致確認済み。
- 以前のCURRENT-STATE.md全文も同保管先のwork/CURRENT-STATE.mdに保持。
- 保管資料の目録: work/ARCHIVE-INDEX.json。必要なファイルだけ取り出す。
- ゲーム本体・素材・テスト・QAスクリプト・参考画像・依存環境・Git履歴・過去ZIPは元の場所に維持。

## 最新変更：ボス部位モーション（2026-09-19）
8体31技に爪・鎌・尾・角・頭・砲身などの局所変形モーションを追加。構え→攻撃→戻り。既存の全身姿勢に合成。ゲーム判定/威力/時刻は維持。詳細work/BOSS-ART-MOTION-20260919.md。全技QAと9,516形状確認、build:ci成功。見た目はユーザー確認待ち、GitHub未push。

公開（2026-09-19）：ボス部位モーションf43569aまでGitHub Desktopからpush済み（整理・引き継ぎの記録も含む）。Actions 35445085410 success、公開render.jsのbossArtDraw配信を確認。公開URLで起動テスト18項目合格、ブラウザーエラー0。ゲームコードはboss-art-motion保存版と同じ。

## 最新変更：ボスラッシュ改善（2026-09-20）
5項目実装：31技の回避ヒント・予兆バー、弾消しから1.5秒以内の次の近接命中1.5倍、隙への突き/対空斬り上げ1.25倍、8ボス31技練習と即リトライ、難易度別記録と結果PNG保存。BOSS RUSHは直接闘技場へ。旧セーブ保持。詳細work/BOSS-RUSH-MASTERY-20260920.md。npm test180件＋既存チェック、build:ci、起動18、パッド39、練習/記録/画像保存QA成功。人によるバランス評価は未完。GitHub未push。

公開確認（2026-09-20）：19ddeb8をmainへpush済み。Actions 35491865364 success。公開mastery.jsのstartPractice配信、公開サイト起動18項目・ブラウザーエラー0を確認。今回の5項目は公開済み。
