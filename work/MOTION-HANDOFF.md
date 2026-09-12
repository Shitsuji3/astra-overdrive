STATUS: DONE

# Motion handoff

最終更新: 2026-09-07

## 完了

T1/T2/T3を完了。音声は今回のスコープ外で、未完事項はありません。

- T1: `assets/player-run-v3.png`、14フレーム、各60ms、周期0.84秒。共通アンカーは`rx=192`、`gy=460`。原本は`assets/player-run-v2.png`。DIS単一sourceの中割りは半位相切替を採用し、二重像を抑制する制約と限界を`assets/MOTION-ART.md`に記録。
- T2: saber基本射程72、敵の縦判定55、ボス75、ボス射程オフセット+40を維持。
- T3: rising edge入力のみ。予約窓は各段の`.12s.. .32s`。3段目後は必ずリセット。威力は段1/2/3で`4.5 / 5.175 / 6.75`。段別frame map、姿勢、共通VFXを実装し、atlas/fallback双方で表示。

## 検証証拠

- `npm test`
- `node qa/motion-review.cjs`
- `node qa/motion-input-check.cjs`
- `C:/Users/situz/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe qa/motion-visual-check.py`
- `qa/motion-preview/records.json`
- `qa/motion-preview/input-results.json`
- `qa/motion-preview/run-contact-new.png`
- `qa/motion-preview/saber-contact-new.png`

HTTP/file入力検証は両方でrun14、saber8、combo1→2→3、pause、pageerror/console.errorなしを確認。motion reviewは47シーン、errors=[]。

## 変更と分担

変更対象は`game.js`、`render.js`、`assets/player-run-v3.png`、`assets/generate-run-atlas.py`、`assets/MOTION-ART.md`、`tests`、`package.json`、`qa`、本handoff。変更前スナップショットは`qa/motion-before/20260907-032822`。

Astraが要件整理・設計・最終レビューを担当し、Lunaが実装・修正とQA実行を担当。旧記録にある「未着手」「レビュー待ち」「8フレーム」は作業途中の履歴であり、現在仕様には適用しない。

## 受入状態

Astra最終レビュー合格。T1/T2/T3全完了。音声のみ対象外。