# ボスの絵

## src/
いただいた元絵をそのまま置いてあります。8体分、背景（工場の情景）付きです。

## <id>-portrait.webp
ステージ選択に出る240pxの正方形。src から `tools/make-boss-portraits.py` で作ります。
背景は意図的に残しています。枠の中に収まると資料写真として読めるためです。

## <id>.png
戦闘中のスプライトにするための切り抜き（背景を抜いたもの）。
`tools/cut-boss.py` が GrabCut で抜いています。

現状、warden / ashmaw / obsidian-crown は十分きれいに抜けますが、
tidebreaker / coilhead / gravelock / sparkwidow は機体と背景がどちらも暗い青緑のため、
脚の間や背後の情景が残ります。そのため戦闘中のスプライトにはまだ使っていません。

きれいに入れ替えるには、背景を無地（透過、または真っ白・マゼンタなど機体に無い色）にした
元絵があると確実です。用意できたら src/ を差し替えて、次を実行してください。

    set PYTHONPATH=qa/python-deps
    python tools/cut-boss.py "<元絵>" <id>
    python tools/make-boss-portraits.py
    npm run build
