# Right-hand saber / left-arm buster correction — 2026-10-03

Historical front-only version. Superseded by the sixteen-pose rear-view assets described in [RISING-BACK16-ART.md](RISING-BACK16-ART.md). This master is retained for identity/anatomy reference and restoration.

Previous runtime master: `assets/player-rising-front-v3.png`, RGBA 1536×1024, four columns × two rows,
384×512 cells. Shipping copy: `assets/web/player-rising-front-v3.webp`.
Created with the built-in `image_gen` tool with transparent_background=true.
Returned output was copied unchanged; normal WebP encoding preserves transparency.
Original output: `C:/Users/situz/.codex/generated_images/01a0ff6d-870a-70e0-a06c-58e9ef96949a/exec-cab2463f-a8b9-4b7c-bebf-f583b230f469.png`.
Final edit target: intermediate draft `exec-6fd24d4e-95ef-406c-9aef-0eab5489ce50.png` in the same generated_images folder.
Identity/anatomy reference: approved `assets/player-run-v4-source.png`.
Previous masters and original character art are retained. Intermediate drafts were visually rejected and never loaded by the game.

The user specified anatomical RIGHT hand = saber, LEFT arm = buster. The near/right shoulder must
lead to a visible articulated wrist and fingers holding a separate slim handle/guard/emitter;
the far/left shoulder leads to the single bulky cannon. The old front-v2 sheet had inconsistent
arm assignments and a saber forearm shaped like another cannon. Current eight source cells and
seven active runtime poses were visually inspected without flame covering the arms.
The inspection board does not automatically classify arm anatomy; draw-call/transform assertions
alone are not evidence of correct hands or weapon count.

Measured emitter centers in source-cell pixels: [82,365], [353,462], [282,76], [237,24],
[292,15], [25,199], [286,12], [77,330]. Floor/pelvis/neck/near-shoulder anchors were retargeted in
`assets/saber-rig.js`. The orange emitter is the blade/flame origin, not the glove's centre.
The hand opens LEFT in cell5 while holding its saber; the far buster opens RIGHT. The detached
flame keeps moving from the previous raised emitter, so it is not dragged to the open arm.
The empty left edge of cell6 contains four pixels of the adjacent cannon glow; the renderer
insets that source edge by four pixels without moving any anchor. The master PNG is unchanged.

Game physics, inputs, damage settings, hit cap/interval, flame angle/width and range compensation
are unchanged from the preceding reach-recovery version. The new emitter coordinates retarget
the drawn flame and its shared contact contour. At phase .30 the measured forward reach is
95.6px. Left/right distant target checks pass. Per-target hit counts are reported explicitly;
the entire old vertical footprint is not claimed identical.

Inspection and actual-input captures: `qa/rising-arms-20261003/`.
Reproduce with `qa/rising-arms-art-20261003.cjs`, `qa/rising-back-art-20261003.cjs`,
`qa/rising-reference-20261003.cjs`, `qa/rising-direction-reach-20261003.cjs`.
See `work/RISING-REFERENCE-20261003.md` for final validation and backup details.

## Exact final built-in edit prompt

```text
Edit reference1: correct the RIGHT SABER ARM, which is currently attached to the wrong shoulder. Reference2 is the approved right-hand / left-buster anatomy. Keep all8 body/leg/head/scarf poses, 1536x1024 4x2 sprite sheet, true transparent alpha, no blade/flame. Redraw the ARMS, not just tiny additions.

For every character: RIGHT NEAR ARM starts at the SCREEN-LEFT SHOULDER. It must have a narrow wrist and clearly articulated blue GLOVE GRIPPING a separate thin saber handle with ivory guard and tiny orange emitter. LEFT FAR ARM starts at SCREEN-RIGHT shoulder and ends in the ONE bulky blue cannon with an orange muzzle. Only2 arms, no spare shoulder stump.

The solution is to MOVE THE RAISED SABER HAND TO THE LEFT OF THE HELMET, directly above the NEAR SHOULDER. Do not keep the old raised arm behind the head at screenRIGHT.

Cell2 row1col3: REMOVE the entire old raised sword arm from behind the RIGHT edge of helmet. Replace the blue stump at screenLEFT shoulder with a COMPLETE RIGHT ARM reaching straight UP from that near shoulder. Near shoulder local(178,258), upper arm to elbow(165,182), forearm to wrist(173,113), blue fingers gripping a slim diagonal UP/RIGHT handle, tip at local(190,85), LEFT OF THE HELMET. Connect shoulder→upperarm→elbow→forearm→glove continuously. Helmet remains around(224,209). LEFT BUSTER remains down at SCREENRIGHT hip. Exactly one high glove and one low cannon, no stump.
Cell3 row1col4: delete old raised arm behind/right of head. Near right shoulder around(191,200) raises a complete arm straight UP on SCREENLEFT OF HELMET. Elbow(178,119), glove(182,51), small orange saber tip(198,24). Face at SCREENRIGHT stays visible; raised arm stays to the LEFT of face. Left cannon hangs at SCREENRIGHT hip. No blue stub left at old near shoulder, it is replaced by this actual raised upper arm.
Cell4 row2col1: same, delete old raised arm above right edge head. Right arm begins near shoulder(178,180)→elbow(169,111)→glove(183,49)→tip(199,24), entirely SCREENLEFT of face. Left cannon at SCREENRIGHT hip. Exactly two arm roots.
Cell6 row2col3: same right arm shoulder(180,180)→elbow(172,106)→glove(184,47)→tip(201,23), LEFT of the helmet. Delete old far raised sword arm. Left cannon hangs low SCREENRIGHT.

Cell1 low crouch: DELETE current near screenLEFT cannon. That near shoulder is the RIGHT shoulder and should lead a continuous right arm bent down/forward ACROSS FRONT of torso and knee, elbow near(257,433), articulated blue glove around(335,460) gripping a thin horizontal saber grip with orange tip(354,469). LEFT cannon attaches at FAR SCREENRIGHT shoulder, folded down beside screenRIGHT hip, its muzzle near(289,414), behind the crossing sword arm. No cannon on screenLEFT near shoulder.

Cells0,5,7 preserve their already-correct roles: right/near hand screenLEFT grips a thin saber handle, left/far cannon screenRIGHT. In cell0/7 make the separate handle/ivory guard obvious; no gun bore on hand. Cell5 right near arm opensLEFT holding handle, left far cannon opensRIGHT. Keep2 arms and1 saber only.

Raised saber handle points diagonally UP/RIGHT, but raised GLOVED HAND MUST BE TO LEFT OF HELMET, directly above the near RIGHT shoulder. This permits a physically continuous arm with no third shoulder stub. Keep head/chest/toes facingRIGHT, all bodies and foot anchors unchanged. Do not add new armor, blade, fire, glow or ground. Real transparent alpha.
```
