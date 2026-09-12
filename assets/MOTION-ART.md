# Motion atlas art

Generated with the built in ImageGen tool using `assets/player-sheet.png` as the identity reference. Local motion contact sheets were used only for timing and pose guidance; source GIFs are not bundled.

## Run

- Runtime asset: player-run-v4.svg, an SVG chromakey wrapper around the immutable player-run-v4-source.png (1254x1254 PNG, 4x4 cells with edges [0,314,627,940,1254]).
- Runtime: 16 frames, .0525s each, .84s cycle; shared measured source-cell pivots/muzzles and scale .19 are in game.js.
- Continuity order: unCellOrder = [0,14,5,4,8,9,7,6,10,2,3,12,11,1,13,15]; renderer and muzzle use the same mapping.
- Provenance and detailed measured bounds: [RUN-V4-ART.md](RUN-V4-ART.md).
- The former v2/v3 optical-flow run assets and generator notes below are historical only and are not runtime inputs.

## Saber

- File: `player-saber-v2.png`
- Canvas/grid: 1536x1024 RGBA, 4 columns x 2 rows, 384x512 cells
- Order: neutral anticipation, raised behind head, overhead peak, forward sweep, low followthrough, floor trail, recovery, return guard
- Runtime role: three-stage saber combo. Stage 1/2/3 use distinct frame maps and VFX trails; each stage is 0.32s with one hit at 0.08s, rising-edge reservation in .12.. .32s, and 4.5 damage per hit (charged base 3 × 1.5). Stage 3 resets the combo.

Both atlases preserve the blue/gold/cyan hero identity and face right. Background cleanup was applied to remove the generated checkerboard and preserve transparent canvas pixels; verify cell bounds and alpha before release.

## Provenance and measured bounds

The assets were generated with the built in `image_gen` tool (not CLI/API) using the prompts below and the local references `assets/player-sheet.png`, `qa/motion-reference/run-contact.png`, and `qa/motion-reference/saber-contact.png`.

- Run prompt set: “Create exactly one 1536x1024 PNG with exactly 8 distinct chronological full-body RUN frames in a 4 columns x 2 rows layout, each cell 384x512; preserve the original cobalt-blue/cream-gold/cyan-scarf/orange-buster hero identity; facing right; fixed pelvis/ground; contact, pass, push, flight mirrored cycle; true transparent RGBA; no checkerboard/background/grid/text.”
- Saber prompt set: “Create exactly one 1536x1024 PNG with exactly 8 distinct chronological saber attack frames in a 4 columns x 2 rows layout, each cell 384x512; preserve the original blue/gold/cyan hero; cyan-white energy saber; anticipation, overhead raise/peak, forward/downward sweep, followthrough, recovery/guard; true transparent RGBA; no checkerboard/background/grid/text.”
- Built-in output paths: `C:\Users\situz\.codex\generated_images\01a07667-ed25-7221-a423-78ef76d7f382\exec-5bc31b16-57cb-4db7-86e3-11ac14dbdbec.png` (run) and `...\exec-57f63726-0c89-41a4-a1b7-b174b928bd2a.png` (saber).
- Method truth: the generator returned a visibly checkerboard, fully opaque PNG despite the transparency instruction. A deterministic System.Drawing pixel pass removed near-neutral bright checkerboard pixels (RGB channel spread <=6, brightness >=220) by setting alpha to 0; no hero or saber pixels were redrawn or recolored. Final corners were rechecked at alpha 0.

Measured non-transparent bounds are local to each 384x512 cell (frame order is row-major):

- Run: `0 36..319,117..429`; `1 65..350,156..431`; `2 28..344,150..440`; `3 18..294,112..341`; `4 36..314,65..388`; `5 1..327,149..405`; `6 28..338,100..392`; `7 31..291,59..347`.
- Saber: `0 47..318,195..469`; `1 39..329,146..481`; `2 55..383,32..469`; `3 0..357,218..467`; `4 42..358,132..390`; `5 24..360,194..398`; `6 16..383,120..404`; `7 0..270,133..407`.

Renderer note: saber frames 2 and 6 contain edge-adjacent pixels at local x=376..383 and x=382..383 respectively; clip those rightmost pixels if preventing neighboring-cell bleed is required. The art pass does not rewrite atlas geometry.

## Transparency edit audit

Per review, one targeted built-in ImageGen edit was attempted on each original generated sheet with instructions to preserve the original canvas, frame positions, poses, white armor pixels, and white saber cores while replacing only the checkerboard with alpha. Candidates were saved under `qa/motion-alpha-candidates/`. The tool returned `Format24bppRgb` with corner alpha 255 for both candidates (`player-run-alpha-edit.png`, `player-saber-alpha-edit.png`), so neither candidate was promoted and the current assets remain unchanged.
