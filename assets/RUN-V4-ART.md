# RUN-V4 Art provenance and QA

- One built-in ImageGen call; original bytes: `assets/player-run-v4-source.png`.
- Native output: **1254x1254 PNG**, arranged as 4x4 nominal cells of 313.5x313.5 source pixels. The generator did not return requested 2048.
- `assets/player-run-v4.svg` embeds the unchanged PNG and is sized 1254x1254.
- References: `assets/player-sheet.png` identity, `qa/motion-reference/run-contact.png` motion, `qa/motion-preview/run-contact-new.png` failure reference.

## Frame layout and estimated pivots

Frames are row-major 0 through 15. Cell origins are columns x [0,313.5,627,940.5] and rows y [0,313.5,627,940.5]; retain fractional origins or round only at draw time. Rough local estimates by visual inspection:

Per-source-cell native measurements (cell origins [0,314,627,940], edges [0,314,627,940,1254]; frame order below is runtime logical order):

runCellOrder = [0,14,5,4,8,9,7,6,10,2,3,12,11,1,13,15]

The rootX, virtualGroundY, and muzzleXY arrays are stored in game.js by source-cell index. Scale is .19; virtual ground follows the head crest plus 223 native pixels so airborne feet remain free.

Virtual ground is pelvis-relative; flight feet should not be pinned to it. Character height is about 220 source px, so 42 gameplay px implies scale about 0.19. Include row and column origins to prevent row-wrap jumps. Muzzle estimates identify the rightmost orange opening.

The sheet visually contains an alternating run sequence, but exact phase continuity is not programmatically verified. Reorder frame indices in the runtime table if needed; do not modify this PNG.

## SVG wrapper

The SVG embeds the unchanged PNG as base64. Its `feColorMatrix` keeps RGB and computes alpha with `-5R + 10G - 5B + 3.5`, keying #ff00ff to transparent while retaining armor and white highlights.

## QA

Runtime integration metadata uses integer cell edges `[0,314,627,940,1254]`, measured per-frame root and muzzle arrays in `game.js`, and scale `.19`. The muzzle points are the forward orange component centers; virtual ground follows the head crest plus 223 native pixels so airborne feet remain free.

- Read-only dimension check: 1254x1254.
- Visual check: flat magenta, no labels/grid lines/shadows, full-body containment, consistent identity, no obvious duplicate limbs or severe warps.
- Chrome file and HTTP SVG loading were verified during integration.

