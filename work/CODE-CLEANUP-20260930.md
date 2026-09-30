# コード軽量化 — 2026-09-30

## 基準
GitHub mainのd42ac8e58df4c78204aaed5361f4694b261d8d00をfetchし、手元へfast-forwardしてから実施。Pages Actions 35990302428はsuccess。前担当の描画・素材軽量化、続きから、ジャストダッシュ、非表示時消音を維持。サブエージェント不使用。
同期前と最新基準の両方を別名ZIPで検証保存済み。作業前の未追跡qa/title-lights.cjsは保持。

## 調査・除去
実行時JS11ファイルにスコープ解析（ESLint no-unused-vars）を適用し、未使用7か所を除去した。変更後は同じ解析で指摘0。
- assets/run-rig-v6.js: EXTENT、ARM、FOREARM、smooth。
- assets/saber-rig.js: FORE。
- render.js: combatMuzzle（現在の発射位置はAstraCombat.muzzleを使用）。
- ui.js: タッチ入力の未使用pressカウンター。

加えて時計DOMを一度取得し、表示秒が変わった時だけtextContentを更新する。表示内容と更新周期は変えない。
prototypeメソッドの参照も確認した。画像未読込時の代替描画、旧セーブ互換、ステージ/練習/記録、QAから利用するspriteIdleとリグ公開APIは用途があるため残した。非表示・未実行という理由だけで削除していない。旧原本素材・過去資料は今回削除していない。

## 配布の軽量化
Terser 5.44.0をビルド用devDependencyとして固定しpackage-lock.jsonを追加。配布JSのみ空白・コメントを省略する。compress:false、mangle:falseなので制御フローの最適化・関数名変更・公開API変更は行わない。ソースは読みやすい形で保持。CDNや新たなゲーム実行時依存は追加しない。
Pagesにnpm ciを追加し、READMEへインストール手順を記載。通常のローカルゲーム起動にはビルドツール不要。

| 対象 | 前 | 後 | 減少 |
| --- | ---: | ---: | ---: |
| 配布JavaScript | 813,327 bytes | 618,955 bytes | 194,372 bytes / 23.9% |
| JSをファイルごとにgzip比較 | 388,405 bytes | 345,459 bytes | 42,946 bytes / 11.1% |
| 配布全体（ビルド表示） | 10.06 MiB | 9.86 MiB | 約0.20 MiB |
| BGM以外 | 3.18 MiB | 2.98 MiB | 約0.20 MiB |

gzipは同条件のローカル比較で、公開ホストの実転送量を計測した値ではない。素材とBGMの画質・音質は変更していない。

## 検証
- 最新基準と変更後でnpm test成功（Node集計213件＋既存のエンジン/モーション/ステージ/SEチェック）。
- build:ci成功、48ファイルの参照・配布サイズ整合チェック成功。
- 圧縮済みreleaseを4174で配信して起動18・パッド29・マウス11項目成功、ブラウザーエラー0。
- qa/cleanup-equivalence.cjs: 同じ素材・固定乱数・状態でGitHub基準JSと圧縮済みJSを比較。273描画のPNGハッシュ一致、8ボスそれぞれ180ステップの入力付きシミュレーション状態一致。再実行には4174配布サーバーが必要。BASELINE_REF既定d42ac8e。
- git diff --check成功。

今回の軽量化はローカル保存・コミットのみ。GitHubへのpush/公開更新は行っていない。
