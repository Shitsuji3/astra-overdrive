# RUN V6 ART PROVENANCE

V6 preserves `player-run-v4.svg` and its embedded PNG unchanged. It uses measured source masks with an anatomically restrained swing, compact folded recovery, exact ground anchoring, and deterministic two-bone IK. No new raster artwork or image generation was used.

The upper body follows the same phase as the legs. Torso pitch follows the two contacts per cycle and shoulder sway follows the stride. Both arms have shoulder-driven upper arms and separate bent forearms. Elbows travel in opposite directions; the buster moves over 18 game pixels horizontally during free running instead of pivoting at a fixed location. Additional upper-arm and forearm masks are clipped from the same unchanged source cell.

Idle uses the same character and arm joints with planted feet, slower breathing, and relaxed arm motion. Charging or firing raises the weapon elbow and holds the cannon horizontal; the final 80 ms of the firing pose smoothly releases it back to the free arm position. Drawing and projectile spawning use the same elbow, cannon angle, and aim weight for both idle and running.

The 2026-09-08 continuation, final adjustment, and validation were performed directly by Astra without subagents, following the user's latest preference.

## Idle foot sides (2026-09-09)
User comparison against 待機モーション.gif and the supplied still: the reference stands with the left foot
forward and the right foot behind, while the game had them reversed. draw() shades and draws the `right`
slot first, so that slot is the far leg, which by this project's established near/far convention is the
anatomical left. standingPose now puts that far left leg forward at +8 and the near right leg behind at -8.

Only the idle stance changed. The running cycle ankles, the buster muzzle for every aim weight, and both
idle and running arm poses are numerically identical to the previous version.
