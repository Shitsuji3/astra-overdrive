# ASTRA // OVERDRIVE

**遊ぶ → https://Shitsuji3.github.io/astra-overdrive/**

オリジナルのブラウザ横スクロールアクション。ステージ9種とボス8体、チェックポイント、リザルトとランクを収録します。タイトルの STAGE SELECT から、都市の地図をボスの顔が囲む盤面でステージを選べます。記録はステージごとに保存されます。

外部のサービスやCDNには一切つなぎません。ZIPひとつで完結します。

## ステージ

| | 全長 | 敵 | ボス装甲 | 性格 |
|---|---|---|---|---|
| 1. SIGNAL YARD | 9600px | 28 | 72 | 工廠の谷を抜けてゲートへ |
| 2. TIDAL REFINERY | 8800px | 35 | 84 | 上へ登らされる。ドローンが多い |
| 3. MAGNET SPINE | 10400px | 45 | 96 | 砲座が並ぶ尾根。守りが最も厚い |
| 4. CINDER FLATS | 9200px | 29 | 88 | 見通しのいい平地。曲射と地雷が降る |
| 5. ANVIL DEPTH | 9800px | 36 | 116 | 砲座が並ぶ坑道。最重量の機体が待つ |
| 6. VOID CHOIR | 9000px | 29 | 76 | 高く組まれた聖堂。ドローンが群れる |
| 7. FILAMENT RUN | 10200px | 38 | 80 | 細い足場が続く。止まると追いつかれる |
| 8. CROWN VAULT | 11200px | 41 | 132 | 最長にして最厚。八手すべてが来る |
| 9. BOSS RUSH | 1950px | 3 | 8体連戦 | 道中は無し。倒すたび装甲が2戻る |

## ボス

WARDEN / TIDEBREAKER / COILHEAD / ASHMAW / NULLPRIEST / GRAVELOCK / SPARKWIDOW / OBSIDIAN CROWN の8体。装甲は72から132、体格も所持技も別々で、8種の攻撃（扇状射撃・床の波・突進・曲射・全方位・跳躍・地雷・弾幕の壁）を体ごとに配分しています。**各ボスは4〜6拍の決まった順番を繰り返します。** 1拍は「その技が要る距離まで歩く→溜める→撃つ→立ち止まって隙を晒す」で、隙は最短0.60秒あります。定義は [`assets/bosses.js`](assets/bosses.js) の `routine` にデータとして置いてあります。ループと隙の実測は `node qa/boss-motion.cjs` で出せます。

ステージの定義は [`assets/stages.js`](assets/stages.js) にデータとして置いてあります。1項目足せばステージが増え、選択画面は一覧から自動で作られます。追加したら `node qa/stage-audit.cjs`（到達可能性の静的検証）と `node qa/stage-playthrough.cjs`（実ブラウザでの通し）を実行してください。

## 起動

Windows は `launch-game.bat` をダブルクリック（`index.html` をブラウザで開く）か、`npm start` を実行して `http://127.0.0.1:4173/` を開きます。遊ぶだけならビルドは要りません。外部のサービスやCDNには一切つなぎません。

## 公開用ビルド

```
npm run build          release/ を作り、dist/ASTRA-OVERDRIVE-web.zip に固める
npm run build:ci       同じものを release/ だけ作る（ビルドサーバー用）
npm run serve:release  そのビルドを http://127.0.0.1:4174 で配信して確認する
npm run artifact       Artifact に貼るページを dist/ に書き出す
```

出荷する画像は寸法を変えずに WebP へ再エンコードしたものを使います（`assets/web/`）。原本の PNG / SVG は `assets/` にそのまま残ります。素材を差し替えたら `python tools/make-webp.py` で作り直してください。ビルドは、同梱していないファイルを参照している場合、外部サイトを参照している場合、WebP が原本より古い場合に停止します。

`release/` の中身、または ZIP をそのまま置けば公開できます。itch.io、Netlify、自前サーバーのいずれでも追加の設定は不要です。検証は `node qa/release-check.cjs`、画面サイズ別の見え方は `node qa/release-viewports.cjs` で確認できます。

GitHub Pages へは `.github/workflows/pages.yml` が自動で出します。push するとテストを通してからビルドし、`release/` だけを公開します。リポジトリ側の設定は Settings → Pages → Source を "GitHub Actions" にする一回だけです。

## 操作

A/D または ←/→ 移動、Space/Z ジャンプ、↑/W で上、Shift/X ダッシュ、J またはマウス左クリック長押し→離してチャージ射撃、K またはマウス右クリックでセイバー（3段コンボ）。**上を押しながらセイバーで斬り上げ**。しゃがんでから飛び上がり、炎の柱を上前方へ出す対空技です。体2つ分（89px）跳び、炎が4回噛みます。参考GIFから弧と姿勢を測って合わせてあり、比較図は `qa/rising-ref/compare.png`。3段コンボとは繋がりません。振り中の右クリックを受付時間内に続けて入力すると次段を予約し、最大3段で終了します。各段の威力は4.5です。（チャージショットの1.5倍、威力4.5）、壁につかまり＋ジャンプで壁蹴り、Esc/P ポーズ。標準ゲームパッドは左スティック移動、A ジャンプ、B ダッシュ、X 射撃、Y セイバー、Start ポーズ。タッチボタンにも対応します。

## 設定と制作

BGM/SE 音量、ミュート、難易度、Reduced Motion、Fullscreen を設定できます。設定とベストスコアは localStorage に保存します。キーアートは `assets/title-art.png`、生成プロンプトと provenance は [`assets/ART.md`](assets/ART.md) に記載しています。OpenAI built-in image generation で生成した独自アートです。ステージ・プレイヤー・ボスの provenance は [`assets/stage-art.md`](assets/stage-art.md) に記載しています。
ステージ1のBGMは `assets/stage1-bgm.mp3` を再生します。

要件整理・レビューは Astra (`gpt-6-astra`)、実装は Luna (`gpt-5.6-luna`) が担当しました。コード、ゲームデザイン、画像は本プロジェクト用のオリジナルです。

プレイヤーは走行中、脚と逆のタイミングで両腕を肩から前後に振ります。バスター側も肘と前腕が動き、位置を固定しません。待機中は足元を保ち、両腕を下ろした姿勢でゆっくり動かします。射撃・チャージ中だけバスターを前へ構え、終了後は腕振りへ滑らかに戻ります。元のSVG素材をCanvas上で関節ごとに描画しています。セイバー斬撃は一振り0.40秒で、当たり判定は描いている刃の軌跡そのものに沿います。1段目は0.16秒に1回、2段目は0.08秒に1回、3段目は0.13/0.17/0.21/0.25秒の4回当たります。各段の威力は4.5で、3段目のみ1発あたり0.625倍の多段です。
