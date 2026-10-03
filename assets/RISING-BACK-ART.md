# Dedicated backward-facing rising-cut art — 2026-10-03

Historical asset. The mirror-only correction described below was rejected because the
body faced away from the attack and forward reach had shrunk. The current runtime uses
`player-rising-front-v2.png`; see `RISING-FRONT-ART.md`. Do not restore this rear atlas
as the current attack or treat its old QA as evidence that the facing was correct.

Runtime master: `assets/player-rising-back-v1.png`, 1536×1024 RGBA, four columns × two rows,
384×512 cells. Shipping copy: `assets/web/player-rising-back-v1.webp`, same dimensions.
The built-in `image_gen` tool created this new atlas; no existing character master was overwritten.
The returned PNG already has real alpha (corner alpha 0). It was copied unchanged into the game.
Only the normal shipping WebP conversion re-encodes it.

Identity references: the approved `player-run-v4-source.png` and `player-saber-v2.png`.
Choreography reference: the user's `スクリーンショット 2026-09-12 191734.png`.
Generated original:
`C:/Users/situz/.codex/generated_images/01a0ff6d-870a-70e0-a06c-58e9ef96949a/exec-45dcbd2f-7093-42da-8e2e-dd628925edeb.png`.

Cell order: rear windup, deep rear crouch, extending takeoff, rear airborne peak,
rear follow-through, arms open, front airborne recovery, front landing guard.
Cells 0–6 drive the rising cut. Cell 6 is held during the ride down; normal gameplay
returns to the existing idle/run rig when the player lands. Cell 7 is available art,
not a new landing animation. Other attacks and the original locomotion atlas are retained.

`assets/saber-rig.js` stores measured per-cell floor/pelvis anchors, shoulders and orange hilt
positions. Full-body poses replace the previous head/torso polygon substitution. The flame
uses the same measured hilt and body transform; after release it continues from the raised
wrist while the arms open. `bodyOnly: true` is an inspection option, not a player setting.

## Exact built-in generation prompt

```text
Create a production sprite atlas for the SAME cobalt blue / ivory armored robot hero in reference image 1 and 3. Reference 2 is strictly choreography ONLY: copy its backward-facing rising sword slash poses, do NOT copy its red character. This is a new 8-pose atlas, exactly 4 equal columns x 2 equal rows on a 1536x1024 genuinely transparent RGBA canvas, each cell384x512, no lines or labels. All 8 full bodies fit comfortably within their own cell. Crisp outlined detailed 2D pixel sprite style matching image1, unchanged helmet ivory swept crest, orange circular ear, blue ivory boots and armor, cyan scarf, left arm cannon and right gloved hand with tiny orange saber hilt ONLY. No sword blade, NO FLAME, no particles, no glow, no ground, no magenta, NO CHECKERBOARD.
CRITICAL: This is a BACKWARD-FACING RISING CUT, NOT a forward-facing overhead slash. Cells0 through5 show the SAME hero's BACK toward the viewer, head turned LEFT, shoulders viewed from behind, no chest orange core visible. The sword is in the anatomical right hand on the screen RIGHT of the back torso. Keep all armor detailing consistent.
Row1 cell0: windup, rear three-quarter back, head looks LEFT, sword arm pulled horizontally toward screenLEFT at waist level, feet spread, knees starting to bend.
Row1 cell1: DEEP LOW BACK-FACING CROUCH, knees deeply folded, pelvis very low, torso pitched forward toward LEFT, helmet left, right sword hand stretched low toward screenRIGHT just above ground. Off cannon arm tucked near left knee. Scarf to right.
Row1 cell2: rising swing from behind, still back facing / looking LEFT, whole torso extends UP from crouch, right sword elbow bends and hand rises at screenRIGHT of helmet, palm at crown height, left cannon hangs low screenLEFT beside thigh. Legs nearly straight beneath pelvis, one knee a little bent. Back arched slightly toward LEFT. The silhouette MUST be entirely different from a frontal standing swing.
Row1 cell3: airborne peak rising cut, same back-facing LEFT head, right sword forearm nearly vertical over right shoulder, hand slightly ABOVE helmet screenRIGHT, torso fully stretched, pelvis almost directly below shoulder, left cannon hanging back/down at screenLEFT hip. BOTH feet dangling closely beneath hip, left leg slightly tucked and right leg straight. Scarf droops diagonally to screenRIGHT.
Row2 cell0: back-facing rising follow-through, right sword hand over screenRIGHT crown, body slender upright with back arched LEFT, headLEFT, one dangling leg straight, other knee bent. Like cell3 but relaxed.
Row2 cell1: back-facing airborne RELEASE, BOTH ARMS OPEN outward horizontally, right gloved arm screenRIGHT and left cannon screenLEFT, straight torso and feet dangling. Head still LEFT.
Row2 cell2: turn back toward normal forward-facing RIGHT in air, front three-quarter face cyan visor and amber chest core reappear, right saber hand raised beside head, cannon down, legs coming together for landing.
Row2 cell3: normal RIGHT-facing landing recovery guard, slight bent knees feet planted, right hand lowered beside hip, cannon lower. Same hero body proportions as image1. No changes to identity or visual quality. Make chronological pose differences clear; especially the low back-facing crouch versus the long extended back-facing takeoff.
```

Validation and browser previews: `work/RISING-REFERENCE-20261003.md`, final full-body section.

## Latest facing correction

The user then clarified that the hero does not need to look backward when cutting upward.
The unchanged master cells 2–5 look left, so the runtime reverses those cells as the cut starts,
then mirrors the whole attack for leftward attacks. The hero now looks toward the attack during
takeoff/ascent/release. Windup/crouch cells 0–1 and front recovery cell 6 retain their views.
Measured hip/neck/shoulder/hilt X coordinates receive the same reversal as the sprite;
the flame and its collision outline stay attached. No new bitmap was generated for this correction.
Current inspection output is `qa/rising-facing-20261003/`.
