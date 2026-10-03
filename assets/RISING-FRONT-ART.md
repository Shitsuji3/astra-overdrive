# Forward-facing rising-cut art — 2026-10-03

Previous version. The user then identified swapped arm roles and a saber wrist resembling
a second cannon. Current runtime is `player-rising-front-v3.png`; see `RISING-ARMS-ART.md`.

Previous runtime master: `assets/player-rising-front-v2.png`, RGBA 1536×1024,
4 columns × 2 rows, cells 384×512. Shipping: `assets/web/player-rising-front-v2.webp`.
Created with the built-in `image_gen` tool, transparent_background=true, using the
previous rising atlas as the edit target and the approved run/saber art as identity references.
The returned PNG was copied unchanged; alpha is preserved. WebP is the ordinary shipping conversion.
Original output: `C:/Users/situz/.codex/generated_images/01a0ff6d-870a-70e0-a06c-58e9ef96949a/exec-244c9b45-df58-41ed-8a62-dbf11e4d60fa.png`.
Original character masters and the rejected rear atlas are retained.

The user reported that the attack and torso faced opposite directions and reach had shrunk.
Simply reversing the rear sprite did not redraw the front armor and moved the hilt backward.
This new sheet shows the right-facing visor, front chest core and side/front torso in all cells.
The outer facing transform mirrors the body and flame together for leftward attacks.
Cell order: windup, low crouch, initial rise, airborne peak, follow-through, arms open,
airborne recovery, landing guard. Runtime uses cells 0–6; cell 7 remains spare art.

Measured per-cell floor/pelvis/hilt anchors live in `assets/saber-rig.js`.
Fire uses the same rotated hilt until deliberate separation. The original diagonal
forward inclination, flame dimensions and 1.25 contact-outline coefficient were restored;
visible length compensates for the new raised wrist and keeps the final floor pass long.
The hit outline follows the drawn flame. Damage, hit-count limit, inputs and physics are unchanged.
The vertical footprint is different because the new arm rises above the head; the whole
old shape and per-target hit counts are not claimed identical. The grounded 75px probe
hits at the same moment and damage as the original. Both directions behave symmetrically.

Actual browser captures and range/damage report: `qa/rising-direction-reach-20261003/`.
Reproduction: `qa/rising-direction-reach-20261003.cjs`, `qa/rising-reference-20261003.cjs`,
`qa/rising-back-art-20261003.cjs`, `qa/rising-body-preview.py`.

## Exact built-in generation prompt

```text
Edit the first sprite atlas into a FORWARD-FACING rising-cut atlas for the same approved blue robot hero. The last implementation incorrectly showed a backward-facing torso. EVERY character in this new sheet must face SCREEN RIGHT with FACE, CHEST, pelvis and boot toes toward RIGHT, same front/side three-quarter camera as reference image 2. Show the amber FRONT chest core and cyan RIGHT-facing visor in every cell. Do not just mirror the back drawings: redraw FRONT chest armor, front shoulder anatomy and side-view boots. No back/shoulder-blade view, no buttocks facing camera, no soles shown toward viewer. Preserve the identity and detailed crisp pixel-sprite style in image2 and image3, cobalt armor, ivory cream panels, swept ivory helmet crest, amber ear light, cyan scarf trailing LEFT, left buster cannon, anatomical right gloved saber hand. No new armor design. Same 1536x1024 RGBA canvas, EXACTLY4cols x2rows, each384x512. True transparent alpha background, no background colors or texture, no checkerboard, no grid or text. NO flames, NO energy blades, NO trails; orange saber hilt only so the game can add fire. Every full body stays inside its cell.
Chronological poses row-major, consistent hero scale ~360px helmet-to-sole standing height and centered pelvis x~205 in each cell. Saber arm/hand MUST be on the front/SCREEN RIGHT side during the rise, not tucked behind the head on screen LEFT. The saber hilt rises from the floor at screenRIGHT to just ABOVE and FORWARD (RIGHT) of the helmet, local x around300, leaving the face visible. Cannon arm is pulled back at screenLEFT and hangs below shoulder.
Cell0 row1col1: facingRIGHT front/side windup, feet spread, knees bend, right sword arm pulled back toward screenLEFT hip at waist level, hiltLEFT of torso. Chest core and visor faceRIGHT.
Cell1 row1col2: deep low crouch, still lookingRIGHT and torso facingRIGHT, pelvis low, knees deeply bent, right gloved hand and orange hilt near floor on screenRIGHT forward of toes, cannon arm tucked back near left knee. Feet planted toesRIGHT.
Cell2 row1col3: rising cut starts, torso uncoils upward facingRIGHT, right sword arm swinging UP/RIGHT with hilt slightly above and ahead of the helmet at local x~300 y~120. Knees start to straighten, feet coming close beneath pelvis, one heel lifting. Body leans slightly backward towardLEFT, but chest/visor faceRIGHT.
Cell3 row1col4: fully extended airborne peak, facingRIGHT front/side, orange chest core clearly visible. Sword hand UP and FORWARD of helmet on screenRIGHT at localx~300 y~80. Right forearm passes in front of chest then up ahead of the face, face remains visible. Cannon arm screenLEFT back/down beside hip. Both legs hang close beneath pelvis with toes pointingRIGHT, one knee slightly bent, no high knee or kick. Body stretched vertically with mild backward arch. Scarf streamsLEFT.
Cell4 row2col1: same forward-facing airborne followthrough, right hand high and FORWARD at localx~300 y~70, chest/visor faceRIGHT, legs relaxed and dangling close together. Toe tipsRIGHT, no soles facing camera. Slightly relaxed version of cell3.
Cell5 row2col2: still facingRIGHT front/side, arms open outward as flame detaches, right gloved hand opens to screenRIGHT at shoulder height, cannon opensLEFT, amber front chest core visible, legs hang under hip. Face remainsRIGHT, do not show back.
Cell6 row2col3: facingRIGHT airborne recovery, right sword hand stays raised UP/RIGHT of the helmet, cannon hangs backLEFT, legs come together preparing to land. Chest visible, helmet/boot tipsRIGHT.
Cell7 row2col4: forwardRIGHT landing guard, knees slightly bent planted feet toeRIGHT, right sword hand low at frontRIGHT hip, cannon backLEFT. Same character as source.
Keep all8 poses clearly distinct and preserve the deep low stance, long upward arm motion and straight airborne legs. The key invariant is FRONT/SIDE RIGHT-facing torso and RIGHT-facing head in ALL8 frames, with raised sword hand at the leadingRIGHT side. This sheet must not contain the former rear-view character.
```
