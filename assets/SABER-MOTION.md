# Saber reference retargeting

Reference: user-supplied セイバーモーション.gif, 32 frames, inspected on 2026-09-09.
Frames 0–11: raise weapon overhead, forward downstroke, low recovery.
Frames 12–19: waist-height transverse slash and torso counter-rotation.
Frames 20–31: raised windup followed by a deeper lunging downstroke and recovery.

assets/saber-rig.js retargets those poses to the current blue hero armor using the existing run atlas and rigid-part renderer. Key poses are smoothly interpolated. The reference reports zero frame durations; the existing 0.32-second combo stages and input/damage windows are retained. Existing frames remain available as image-loading fallback.

White-filled, green-edged swept ribbons are sampled from the moving blade rather than drawn as an unrelated static arc. Horizontal motion uses a flattened sweep. Trails narrow and fade in recovery; all stages mirror with the attack direction. Current audio, enemy-projectile clearing, damage and running/idle motions are preserved.

Validation: npm test, qa/saber-sfx/verify.cjs (real 3-stage input/audio), qa/saber-motion-reference/verify.cjs (606 rendered poses, reach/continuity, trail appearance and disappearance), and visual review of board.png and stage.png. No subagents used.

## Recording-driven refinement (2026-09-09)
Reviewed user recording レコーディング 2026-09-09 190241.mp4 against the reference. Split chest, head and scarf transforms; keep target-facing head alignment during waist flexion, rotate shoulder positions and chest width through the transverse slash. Reduce overextended rear-leg stance and retain deeper final lunge. Replace fan geometry with a concave, two-pointed crescent sampled along blade history, plus a delayed green echo. Curve the live blade and narrow the afterimage through recovery. 606 poses and existing game tests pass.

## Second slash and right glove (2026-09-09)
Stage 2 now compresses the stance, shifts the hips and shoulders through a transverse arm sweep. A horizontal elliptical crescent is drawn behind and in front of the torso to show depth. The sword arm uses AstraRunRig.rightForearm, which excludes the atlas muzzle and renders a cuff, palm, finger seams and thumb. Idle/run use the same glove on the right arm; the left cannon and its muzzle transform remain unchanged. Reviewed hands.png and motion board; npm test and 606-pose renderer checks pass.

## Arm-side correction
User recording confirmed the idle/run arm assignment was reversed. Near/front arm is the anatomical right glove/saber arm; far/rear arm is the anatomical left buster arm. Idle/run now draw the cannon behind the torso and the glove in front, matching the saber rig. Aim drives the rear/left elbow; cannonTransform and muzzle use that same elbow. Aim/muzzle and existing tests pass.

## Stage 2 open split stance (2026-09-09)
User feedback: the second slash barely moved the legs. Reference GIF frames 12–19 and the supplied still
show the legs and torso opening, so stage 2 was rebuilt around a wide split stance.

The front foot steps out and plants with a bent knee while the rear leg drives back and straightens, the
heel lifting off the floor. Foot separation now peaks at 42 px at t=0.54, against 26–29 px before, and the
chest turns further toward the camera (width 1.34, was 1.22) while the far arm spreads out instead of
hanging. The hips stay near their normal height on purpose: dropping them makes the rear knee sink to the
floor and the shin read as flat, so the low, driving look comes from forward torso lean during the thrust
instead. Hip-to-ankle distance stays at or below 26.7 px against the 27.5 px limb limit, so no leg stretches.

Stage 1 and stage 3 poses are byte-identical to the previous version, and the stage 1→2 and 2→3 handover
poses are unchanged, so chaining does not jump. Blade angles, the horizontal ribbon, the 0.32-second timing,
input handling, damage, projectile clearing and every sound are untouched.

Validation: npm test, qa/saber-motion-reference/verify.cjs (606 poses), qa/saber-legs-open/verify.cjs
(geometry sweep plus a real right-click 1-2-3 combo recorded frame by frame), and visual review of
qa/saber-legs-open/comparison.png, stage2.png, stage2L.png and joints-new.png. No subagents used.

## All three stages retargeted to the reference legs (2026-09-09)
After the idle stance was corrected to lead with the left foot, the saber still led with the near right
foot and its stage 1 and stage 3 legs barely opened. All three stages were rebuilt against the GIF.

Leg sides: the lead foot is the anatomical left, which is the far side, so draw() now shades it and draws
it first, and the near right foot trails. A pixel check on the rendered ankles confirms the lead foot is
the darker one in every stage, matching the idle rig.

Leg motion: stage 1 steps out under a forward pitch instead of keeping the feet gathered, stage 3 sinks
and opens further with a much deeper pitch, and the heel lift that stage 2 had now applies wherever the
legs are genuinely split. Peak foot separation went from 30 / 42 / 36 px to 38 / 42 / 42 px. The reference
loses fourteen per cent of its height and gains eighteen per cent of its width on the third hit, which the
deeper pitch and wider stance reproduce without lowering the hips far enough to flatten the rear shin.

Hips deliberately stay near their normal height in every stage. Thigh and shin are 12.5 and 15 px, so a low
hip forces the rear knee down to the floor and the shin reads as lying flat. Hip-to-ankle distance peaks at
26.6 px against the 27.5 px limb limit, and the rear knee stays at least 4.2 px above its ankle throughout.

Blade angles, both trail shapes, the 0.32-second stage timing, the handover poses between stages, input
handling, damage, projectile clearing and every sound are unchanged.

Validation: npm test, qa/saber-motion-reference/verify.cjs (606 poses), qa/saber-legs-open/verify.cjs
(geometry for all three stages, a rendered-pixel check of which leg leads, the idle stance sides, and a
real right-click 1-2-3 combo recorded frame by frame), and visual review of
qa/saber-legs-open/saber-comparison.png plus the per-stage contact sheets. No subagents used.

## Stage 3 becomes an overhead finisher (2026-09-09)
User request: wind the third slash up big and bring it down, and let it land multiple hits for heavy damage.

Motion. The finisher now rocks back onto the trailing leg through the first third of the swing, raising the
blade high behind the head, then drives a long cut down past the knee while the front foot plants wide. The
blade sweeps 221 degrees, against 172 before, and the hand peaks 49 px above the ground. The blade's
length taper was moved from t=0.65 to t=0.82 for this stage only, so the edge stays full through the cut
instead of shrinking mid-swing. Stage 1 and stage 2 poses are untouched, and both handover poses between
stages are unchanged, so chaining still does not jump.

Damage lives in game.js, not here: combat.saberHitTimes lists the elapsed seconds at which each stage
lands, and the finisher lists four of them.

## Retargeted hard against the reference (2026-09-09)
User asked for the saber to sit far closer to the GIF. Reading the reference again with ground-aligned,
gridded frames showed the mistake behind the earlier caution: the reference's deep lunges keep the hips
low because the trailing leg is fully extended, not folded. Folding a bent leg under a low hip is what
drops the knee to the floor, so the hips had been kept high to avoid it. Extending the leg instead solves
the same problem and matches the source.

plant() now enforces that. Every planted foot is clamped inside the 27.25 px limb reach, and once the hips
sink the trailing ankle is eased out toward a taut 26.9 px leg. Authoring a low hip therefore produces a
long extended trailing leg automatically instead of a collapsed one.

All three stages were rewritten on that basis, at nine keys each:
stage 1 raises the blade straight overhead, whips it down and lands in a deep pitched lunge held through
the follow-through; stage 2 coils low, thrusts, then sweeps while the chest turns fully open with both arms
thrown wide; stage 3 rocks back into a full overhead windup and drives the longest, lowest cut of the three
down to the floor. Peak foot separation is now 44 to 47 px against 38 to 42 before, hips reach 15 px above
the ground against 20, and the far arm opens 12 px rather than 9 as the chest turns.

The scarf is no longer a fixed timer wave. pose() reports how fast the torso pitch and hip drive are
changing, and the scarf lifts against that rate, so it streams up through each cut and settles afterwards.

Each stage keeps a full-length edge until its own cut finishes: the taper starts at t=0.76, 0.72 and 0.82.

Timing, input, damage, hit range, projectile clearing, the handover poses between stages and every sound
are unchanged. The leg check in qa/saber-legs-open/verify.cjs was rewritten to match how the reference
actually draws a lunge: the knee must stay above the ankle, and a shallow trailing shin is only accepted on
a leg that is genuinely extended.

## Squaring the second slash up to the camera (2026-09-09)
User pointed at the reference frames where the body turns to face the viewer and asked for that much turn.
The chest had only been widening by a third, which reads as a small rotation rather than a body that has
come around. It also stayed sunk in the lunge while it turned, so the figure went wide instead of tall.

The turn is now much larger and correctly timed. The chest broadens to 1.85 instead of 1.34, the shoulders
swing right around to 24.5 px apart against 6.5 in the side view, and the helmet is carried over the hips
rather than out over the leading shoulder. Both arms are thrown out: the sword hand reaches 17 px clear of
the hip and the far buster arm opens 17 px rather than 12. The heel lift fades out as the body squares up,
so both feet plant flat.

Timing moved with it. The thrust still goes deep, hips 16.5 px above the ground, and the body then stands
back up to 20.5 px as it turns, which is what the reference does across frames 15 to 18. The turn window
runs from t=0.28 to t=0.90 and peaks at 0.59.

This is a widened side view, not real front-facing artwork. The silhouette, shoulders, arms and stance now
read as squared up, but the helmet is still drawn in profile; a true front view would need new art.

Stage 1 and stage 3 stay side on and are untouched, as are timing, input, damage, the multi-hit finisher,
hit range, projectile clearing, the handover poses and every sound.
