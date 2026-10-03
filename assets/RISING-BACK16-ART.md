# Rising saber: sixteen poses with a visible back — 2026-10-03

Current runtime masters:
- `assets/player-rising-back16-a-v4.png`: frames 0–7.
- `assets/player-rising-back16-b-v4.png`: frames 8–15.
- Shipping copies: `assets/web/player-rising-back16-a-v4.webp` and `assets/web/player-rising-back16-b-v4.webp`.

Each RGBA master is 1536×1024, four columns × two rows, 384×512 cells. Both were created with the built-in `image_gen` tool in edit mode, `transparent_background=true`, using local referenced images. The returned PNGs were copied unchanged. WebP quality 96 is the normal shipping conversion, preserving alpha. Earlier front and rear masters and the approved original character art remain intact.

Original returned files:
- A: `C:/Users/situz/.codex/generated_images/01a0ff6d-870a-70e0-a06c-58e9ef96949a/exec-99e41d86-0cd2-4008-afcf-6745cae599cc.png`.
- B: `C:/Users/situz/.codex/generated_images/01a0ff6d-870a-70e0-a06c-58e9ef96949a/exec-67314d5b-8230-4422-924a-0a54ba06b066.png`.

Reference: the user's `C:/Users/situz/Pictures/Screenshots/スクリーンショット 2026-10-03 150835.png`, sixteen frames in two rows of eight. A uses the approved front-v3/hero identity and the new reference to establish the rear view; B continues A and returns to the approved front view in the last two frames. The exact tool prompts are below.

## Pose and anatomy checks

The sequence is front wind-up (0), low rear crouch (1), initial rear lift (2), rear ascent (3–7), rear follow-through and flame release (8–13), front overhead recovery (14), and front arms-open recovery (15). The central ivory back plate, rear shoulder armor, rear waist and boot soles distinguish the rear poses from the front chest core. Frames 1–13 show the back, while the head profile still faces the attack. This applies the user's latest request for a visible back without reversing the attack.

Anatomical RIGHT hand holds a separate saber handle with fingers and a wrist; anatomical LEFT arm is the single buster. In a right-facing rear view the saber is on screen-right and the buster on screen-left; in the front arms-open pose these screen positions reverse. The whole body and flame are mirrored together for left attacks. Actual body-only output was visually inspected for all sixteen poses; metadata/transform assertions alone do not prove correct anatomy.

Frames 0–15 all occur in the actual ↑＋K input sequence. The existing falling stage holds frame 15 and retains the small held blade already present in the game. The reference's final flame-free silhouette is therefore not claimed as pixel-identical. The factory background, UI, inputs, physics, damage settings and hit interval/limit are preserved.

## Runtime crop and emitter anchors

`assets/saber-rig.js` stores each frame's floor, hip, neck, right shoulder and saber emitter coordinates, the phase endpoints, and optional source rectangles. Coordinates were measured on the new originals; the emitter anchor is the orange tip. Draw-time rectangles include a frame's scarf or handle when it slightly extends into a neighboring blank margin and exclude a neighboring frame's stray edge. The destination offset uses the same crop origin, so the floor and saber anchors do not move. No pixels in the generated masters were repainted or removed.

The sixteen cumulative phase endpoints are .045, .115, .18, .25, .32, .39, .46, .53, .60, .67, .73, .79, .85, .92, .965, 1. The renderer loads both atlases and selects frames by phase, using each sheet's own loading/retry state.

Before flame separation, the flame root and the rotated saber emitter coincide. The detached flame starts at the raised rear-view hand position, rather than following the opening arm. The prior forward reach correction and shared visible flame/hit contour are retained.

## Verification artifacts

`qa/rising-back16-20261003.cjs` renders all sixteen poses with and without flame against the new reference. Outputs in `qa/rising-back16-20261003/` include:
- `reference-16-comparison.png`: all sixteen reference/body/flame pairs.
- `back-poses-closeup.png`: enlarged rear crouch, rear ascent, rear follow-through and front recovery, drawn by the actual renderer without flame.
- `reference-16-report.json`: 64 left/right × normal/reduced-motion poses, 32 atlas draws, directions and load/browser errors.
- `after.json`: actual keyboard input, including every observed frame index.
- `after-poses.json`: 44 pose/flame/hitbox samples.
- `range-and-targets.json`: visible reach against the original rig and actual enemy damage in both attack directions.
- `motion-normal.webp` / `motion-slow.webp`: the 70 actual input screenshots packaged for review.
- `release/` and `playables/`: the same render/input checks against both shipping builds.

Source, normal shipping and Playables pose values match. All three input sequences visit 0–15 in order, with apex 89.211111px at .600s, landing at 1.016667s, and 13 falling-held frames, equal to the preceding saved version. Browser errors and failed image requests are empty. `npm test`, `build:ci`, `build:playables` and `git diff --check` succeeded; existing test requirements were not weakened.

At phase .30 visible forward reach is 97.56px (original 94.31px). Both directions hit a ground target 75px away at .083333s for 2.8125 damage; low/high airborne targets also receive hits (5.625 / 11.25), while a target 130px away remains outside the flame. The raised wrist changes the vertical flame footprint and some fixed target hit counts; this is not a claim that every old point and damage count is identical.

## Exact generation prompt: A

```text
Create the FIRST EIGHT consecutive animation poses of a 16-frame rising saber cut for the SAME approved cobalt/ivory blue robot hero. Reference1 is the current hero sprite atlas to edit. Reference2 is the user's choreography strip with16 frames (8top then8bottom); use TOP ROW choreography only for these8 cells, don't copy its red character or fire. Reference3 is the original approved hero identity. The user specifically wants to see the hero's BACK during the rising cut. Keep attack direction SCREENRIGHT and visor profile lookingRIGHT, but torso/shoulders/pelvis rotate so BACK ARMOR faces the viewer. Real rear-three-quarter view, not the front chest seen with head turned.

1536x1024 RGBA atlas, EXACT4columns x2rows, cells384x512. All full bodies inside their own cell with12px safe margin, no crossing cell edges. TRUE TRANSPARENT ALPHA, no background/checkerboard/grid/labels/shadows. Pixel-sprite style, crisp outlines, same cobalt/ivory armor, swept helmet crest, round amber ear, cyan scarf, same proportions. No new wings/backpack/weapons. NO FIRE, NO BLADE, NO GLOW/TRAILS. Only the small saber handle for game's fire attachment.

CRITICAL REAR ANATOMY: in cells1–7 BACK faces camera, back shoulder blades + blue centre back/ivory spine panels + rear waist are visible. NO orange FRONT CHEST CORE in those cells. Torso must not be a front chest with round orange core. Face is mostly hidden by back helmet, just a RIGHT-facing side visor sliver/ear at SCREENRIGHT helmet edge; don't lookLEFT. Cyan scarf trailsLEFT behind the direction of travel.
ONE anatomical RIGHT SABER ARM and ONE anatomical LEFT BUSTER only. In this REAR VIEW, right arm attaches to rear shoulder at SCREENRIGHT, has a narrow articulated wrist and a visibly blue FINGERED GLOVE gripping a separate SLIM straight saber grip, ivory guard and small orange emitter beyond the glove. No cannon mouth on sword hand. Left arm attaches SCREENLEFT rear shoulder and is a SINGLE bulky fingerless blue buster with amber muzzle. Exactly TWO continuous arms, no stumps/third arms. Glove and cannon are visibly different.
Keep pelvis near localx~205 and soles near localy~490 in each cell, consistent ~340px helmet-to-sole standing size. Do not float the body within its cell; the GAME supplies jump displacement. Raised sword hand/hilt is up and ahead of helmet on SCREENRIGHT, aroundlocalx290 y70–120. Legs extend close together under hips as in the reference, no kicks or running stride.

Chronological row-major cells0–7:
0: front/side RIGHT-facing windup like current hero, knees bent wide, right gloved sword hand sweeps back to screenLEFT at waist. Left/far buster screenRIGHT near hip. Only this frame can show front chest core.
1: DEEP LOW CROUCH while rotating into rear-three-quarter view. Back shoulder panels and rear waist visible, helmet still looksRIGHT. Right sword glove at screenRIGHT near floor, straight handle pointsRIGHT, emitteraround(340,468). Left buster folded near screenLEFT knee. Feet planted, knees deeply folded, pelvis low.
2: low pose uncoils into rear view, right shoulder/upperarm lifts the fingered saber hand UP/RIGHT to helmet height, emitteraround(290,115). Left buster hangs low SCREENLEFT of rear waist. One heel lifts, legs come close beneath pelvis.
3: back fully visible on airborne rise, right arm bends then stretches up/right, hand emitteraround(290,80), visor tiny profileRIGHT. Back arches slightlyLEFT. Both legs dangle closely under hip, one knee softly bent, toesRIGHT. Left buster down/back at screenLEFT.
4: same rear rise but right elbow extends a little higher, wristaround(292,67). Back spine panels remain visible, hips uncoil, legs longer and closer, scarf shifts slightlyLEFT.
5: rear airborne reach, right fingered saber grip above/right helmetaround(294,58); left buster relaxed downLEFT; body long, legs nearly parallel, toesRIGHT. Small pose difference from4.
6: rear airborne rise approaching peak, same back anatomy and right high glove, elbow slightly relaxes, one ankle tucked a little behind other, handaround(290,57). Do not duplicate frame5 exactly.
7: rear airborne peak, back shoulder plates clearly visible, pelvis directly under upper back, right glove/handle held high/rightaround(289,60), left buster downLEFT, legs hang close. Slightly lower elbow/scarf movement than6.

Preserve exact weapon handedness through the rotation. All raised poses show BACK ARMOR rather than orange chest. Body faces/attacksRIGHT and head profileRIGHT, without flipping the whole attack backwards. Eight subtle consecutive motion poses matching reference top row, not unrelated dramatic actions.
```

## Exact generation prompt: B

```text
Create the NEXT EIGHT consecutive poses (frames8–15) that continue reference1, the first eight poses of the approved blue hero's REAR rising saber cut. Match reference1's exact blue/ivory back armor, helmet, body proportions, right gloved saber hand, single left buster and pixel-sprite finish. Reference2 is user's 16-frame sequence, use BOTTOM ROW choreography for these8 cells. Reference3 is the current front-view blue hero for the final turn forward. Do not copy red hero or flames.

Same1536x1024 truly TRANSPARENT RGBA sheet, EXACT4columns x2rows,384x512 cells, no grids/labels/background/checkerboard. Each full body fits with12px clear padding; emitter and scarf also INSIDE cell, localx between16 and348, localy between20 and495. No crossing edges. Feet near localy~485, pelvis centeredlocalx205, same scale as reference1. No blade/fire/glow/trails. The game adds fire. Separate thin saber grip with ivory guard and small orange emitter.

Frames8–13 (first SIX cells) show BACK ARMOR, not front chest: visible back shoulder blades and central ivory spine plate over cobalt rear torso, rear waist. NO orange chest core. Helmet back + tiny RIGHT-facing visor/ear profile. Attack direction RIGHT, scarf trailsLEFT. Anatomical right arm SCREENRIGHT from the rear shoulder, narrow wrist and blue FINGERED GLOVE holding ONE slim saber handle high/forward beside RIGHT helmet edge. Anatomical left arm SCREENLEFT from rear shoulder, SINGLE bulky fingerless buster hanging beside hip with amber muzzle. Exactly TWO complete continuous arms. Keep left buster and right glove clearly different. Legs dangle close together under pelvis as in reference; no running stride/high kick.

Row-major localcells0..7 =globalframes8..15:
0(global8): rear airborne follow-through continues last pose of reference1. Right saber grip high/right emitteraround(292,60), left buster lowLEFT, back slightly arched, both legs long and nearly parallel, one knee loosely bent. Tiny wrist/scarf change from previous pose, not identical.
1(global9): same rear facing follow-through, right wrist relaxes a few pixels lower around(292,65), back settles, knees/ankles loosen, left buster nearLEFT waist; maintain fully visible back spine plate.
2(global10): rear descending follow-through, grip still high/right around(288,70), torso slightly straighter, legs hang closer; scarf gently droopsLEFT. No torso FRONT.
3(global11): rear descent, right elbow a little less extended, griparound(285,73), left cannon shifts slightly outLEFT, relaxed dangling legs, soles visible from rear.
4(global12): flame release starts (DO NOT DRAW FLAME): back still seen, right glove still raised but elbow eases down with griparound(284,78), left buster slightly opens from hip. Legs remain hanging together.
5(global13): rear release follow-through, right hand/grip above shoulder around(284,82), left buster further opensLEFT, rear waist/back clearly visible, ankles prepare to settle. Still BACK, no chest core.
6(global14): turn torso toward normal front/side view facingRIGHT, amber front chest core appears. Near/anatomical RIGHT arm is now SCREENLEFT shoulder, continuously raises in FRONT of the chest toward above helmet, visible gloved fingers grip slim handle emitteraround(260,38). Far anatomical LEFT buster is now SCREENRIGHT hanging near hip. Do NOT swap weapon roles when turning. Both legs close together under pelvis. This is the smaller overhead saber recovery from user bottom-row penultimate frame.
7(global15): fully front/side RIGHT-facing airborne ARMS OPEN as in last reference frame. Near RIGHT arm extends screenLEFT, BLUE FINGERS visibly grip slim handle with orange emitteraround(55,215). Far LEFT BUSTER extends screenRIGHT with single amber muzzle around(335,205). Chest core visible, torso upright, legs dangling close together not stepping/kicking. Exactly TWO arms, ONE glove/saber and ONE cannon.

Use same back armor design/hero as reference1 throughout; don't invent backpack or rear orange chest. Distinct subtle per-frame changes at all8 moments. The final2 FRONT recovery cells must keep right-hand saber/left-buster anatomy from reference3. No third arms or shoulder stumps, no second cannon, no floating hands, no dropped saber. This second sheet is a continuation, not a new attack.
```
