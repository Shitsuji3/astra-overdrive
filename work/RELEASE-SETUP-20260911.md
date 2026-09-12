# ブラウザゲームとしてのリリース準備（2026-09-11）

ユーザー依頼：「ブラウザーゲームとしてリリースを目指します。設定お願い」
選択：公開先は **YouTubeのゲームルーム（YouTube Playables）**、容量は **画像をWebP化**。

## 1. 公開先について先に確認した事実

YouTube Playables は YouTube 内で遊べるミニゲームの枠組みで、HTML5ゲームを受け付けている。
ただし **誰でもすぐ出せる場所ではない**。2026年時点で公開は選ばれたパートナー・パブリッシャー・
開発者に限られていて、Interest Form から申請してレビューを受ける形になる。申請自体は無料。

技術要件で今回の作りに効くのは次の4点。

| 要件 | 今の状態 |
|---|---|
| ZIP 1個に全部入った自己完結のHTML5ビルド | 満たす。27ファイル、ZIP 7.85MB |
| 外部への通信ゼロ | 満たす。ビルド時に自動検査している |
| 初回ロード 30MB 以内 | 満たす。8.10MB（音楽を除けば3.36MB） |
| モバイル対応 | 満たす。画面上のパッドで全操作できる |

Playables SDK（`https://www.youtube.com/...` のスクリプト）は **今は入れていない**。
入れると外部通信が発生して、単体ホスティングでは動かなくなるため。申請が通った時点で
index.html の先頭に1行足せばよい。手順は下の「申請が通ったら」に書いた。

この一式は itch.io や GitHub Pages にもそのまま置ける。審査待ちの間に別の場所で公開できる。

出典：
- https://developers.google.com/youtube/gaming/playables/reference/sdk
- https://playables.in/youtube-playables-interest-form/
- https://playgama.com/publish-your-game-on-youtube-playables/

## 2. 容量

### 変更前
実測で、タイトルが出るまでに 4.8MB、ボス戦まで遊ぶと画像だけで 18.2MB。BGM 4.9MB を足して約23MB。

### やったこと
`tools/make-webp.py` で、出荷する画像を **ピクセル寸法を一切変えずに** WebP へ再エンコードし、
`assets/web/` へ書き出す。寸法を変えないので、リグのマスク座標・スケール・アトラスの升目計算は
すべてそのまま動く。元の PNG / SVG には一切触れていない。

| 素材 | 変更前 | 変更後 |
|---|---|---|
| title-art | 2515K | 383K |
| stage-city | 2446K | 414K |
| boss-warden | 2366K | 444K |
| enemy-atlas-v2 | 2295K | 444K |
| player-sheet | 1827K | 335K |
| player-saber-v2 | 1743K | 171K |
| saber-turn-atlas | 1414K | 173K |
| player-run-v4.svg | 2165K | 330K |
| player-idle-v2 | 546K | 133K |
| **合計** | **17321K** | **2831K（-84%）** |

`player-run-v4.svg` は中身が base64 の PNG で、それを WebP に差し替えている。
SVG の寸法とクロマキーのフィルタはそのまま。

あわせて、`run-rig-v6.js` が読み込み時に無条件で `player-idle-v2.png`（547KB）を取得していたのを
やめた。この絵はフラグ経由でしか描画されず、ゲーム中は誰も要求しないのに毎回落としていた。

### 結果（実機計測）

| | 変更前 | 変更後 |
|---|---|---|
| タイトルが出るまで | 4.8MB | 0.6MB |
| ボス撃破まで遊んで | 18.2MB | 3.1MB |
| バンドル全体（音楽込み） | 約23MB | 8.10MB |

### 画質
同じ場面を PNG 版と WebP 版で描いて突き合わせた（`qa/webp-compare.cjs`、図は `qa/webp-compare.png`）。
チャンネルあたりの平均差 **1.6/255（0.63%）**、差が24を超える画素は 230400 中 **85個**。見分けはつかない。

## 3. ビルド

```
npm run build          release/ を作り、dist/ASTRA-OVERDRIVE-web.zip に固める
npm run serve:release  そのビルドを http://127.0.0.1:4174 で配信する
```

`tools/build-release.cjs` がやること。

- ゲームに必要なファイルだけを `release/` へ集める。テスト・QA・作業メモは入れない
- 画像参照を WebP に差し替える（本体のソースは書き換えない）
- WebP が元画像より古ければ止まる。作り直しのコマンドを表示する
- 出荷物が参照しているのに同梱されていないファイルがあれば止まる
- 外部サイトを参照している箇所があれば止まる（Playables の「外部通信ゼロ」がこれで守られる）
- 書き出したファイルのサイズが元と一致しなければ止まる

最後の検査は実際に効いた。最初の実装でバイナリをテキストとして書いてしまい、画像が70バイトの
文字列になっていたのをこれが検出した。

`release/` は `.gitignore` に入れた。ビルド成果物なので追跡しない。

## 4. 公開用の体裁

- `<meta name="description">`、OGP、Twitter カードを追加。リンクを貼ったときに中身が伝わる
- リンク用のカード画像 `assets/brand/social-card.jpg`（1200x630）。タイトル画面の実物を撮ったもの
- タブアイコン 32 / 180 / 192 / 512。タイトルと同じイタリックの A
- `manifest.webmanifest`。ホーム画面に追加したときフルスクリーン・横向きで起動する
- 生成は `node tools/make-icons.cjs`

`server.cjs` は配信フォルダとポートを引数で受けられるようにし、`.webp` `.jpg` `.webmanifest`
`.wav` `.json` の Content-Type を追加した。追加前は manifest が octet-stream で配信されて解釈されない。

## 5. 途中で見つけて直した不具合

1. **タイトル画面の文字重なり**：横1100px未満、または高さ620px未満で、左上の飾り表示
   「ASTRA DEFENSE NETWORK / LINK // STABLE」が「A-07 // FRONTLINE SIGNAL」に重なっていた。
   700px未満では既に隠す指定があったが、その間の幅が抜けていた。飾りなので、場所が足りないときは
   出さないようにした。ノートPC・タブレット・横向きスマホで直る。
2. **短いタップが無視される**：画面上のパッドは pointerdown で押下、pointerup で解除していたので、
   1フレームより短いタップがゲームループに届かないことがあった。マウス側には同じ問題への対策が
   既にあったが、タッチ側には無かった。解除を2フレーム遅らせ、その間に次の押下が来たら
   解除を取り消すようにした。実機エミュレーションで、タップだけでジャンプできることを確認済み。

## 6. 検証

`qa/release-check.cjs` を新規追加。ビルドしたものを実際に遊んで次を確かめる。

- 404 もリクエスト失敗も無い
- **外部サイトへの通信が1件も無い**
- JS例外もコンソールエラーも無い
- 雑魚を倒すと回復セルが落ちる
- ボスの6パターンがすべて出る
- ボスを倒すと2.2秒の演出を経て勝利画面へ行く
- 初回ロードが30MBに遠く及ばない
- スマホ幅でパッドが出る／短いタップでジャンプする／押しっぱなしで歩く

`qa/release-viewports.cjs` は、デスクトップ・ノート・小窓・横向きスマホ・縦向きスマホの5サイズで
タイトルとプレイ中を撮る（図は `qa/release-viewports.png`）。

`npm test` 全73項目合格。ブラウザ検証 browser-smoke 16項目・browser-mouse 12項目合格。

## 7. 置くだけで公開できる場所（審査待ちの間）

`release/` の中身をそのまま上げるか、`dist/ASTRA-OVERDRIVE-web.zip` を上げる。

- **itch.io**：新規プロジェクトの Kind を HTML にして ZIP をアップロード。
  「This file will be played in the browser」にチェック。ビューポートは 1280x720、
  「Mobile friendly」を有効に。index.html が ZIP 直下にあるので追加設定は要らない
- **GitHub Pages**：`release/` の中身をリポジトリの `docs/` か `gh-pages` ブランチへ置く
- **自前サーバー**：`release/` を丸ごと配置するだけ。サーバー側の要件は無い

## 8. 申請が通ったら（YouTube Playables）

index.html の他のスクリプトより前に SDK を1行足す。

```html
<script src="https://www.youtube.com/game_api/v1"></script>
```

これを入れると外部通信が1件発生するので、`tools/build-release.cjs` の外部参照チェックに
引っかかる。Playables 専用ビルドを作るときは、そのチェックにこのURLだけ例外を足すこと。
単体ホスティング用のビルドには入れないほうがよい。

## 9. まだやっていない

- **読み込み中の表示**：素材は遅延読み込みなので、回線が遅いと最初の数秒だけ簡易表示の絵が出る。
  今の容量なら一瞬だが、進捗バー付きの読み込み画面を入れる余地はある
- **BGMの再圧縮**：4.9MB のまま。バンドルの6割を占めている。今回はユーザー選択で見送り
- **オフライン対応**：Service Worker は入れていない
