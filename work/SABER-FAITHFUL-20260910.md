# Reference-faithful saber revision

Based on the verified Opus handoff snapshot (50 files, 66aa73d09fe106cfcbaa0a141b4683ca2f1cf92fe2ddd4e7187290e255ac81fe).

Inspected reference grids for frames 3–11, 12–19, 20–31. New implementation preserves the extended trailing-leg plant() geometry, left lead foot, right saber hand and left buster. The first and final downstrokes hold their low follow-through longer. Stage 2 keeps its front-facing opening through the recovery instead of reversing early; the hand crosses the torso more decisively.

Added assets/saber-turn-atlas.png: actual frontal and three-quarter helmet/chest artwork. It is used during the turns and raised preparation poses; the existing profile remains for lunges. No horizontal stretching is applied to this artwork. Loading failure retries and uses existing artwork as fallback.

Rebuilt downstroke afterimages in the cutting plane, with a single continuous outer curve, broad white center and nested green edge. No history-path folding into separate blobs. Live blade and trailing remnant contract while the body holds its pose. Combat duration (0.32 seconds), inputs, powers, 4-hit finisher, projectile clearing, BGM and approved SE remain unchanged. GIF zero-duration frames do not supply reliable original timing; existing game timing is preserved.

Validation: npm test (17 final motion tests plus preceding suites), 606-pose draw/continuity checks, leg reach and ground checks, real right-click 3-stage combo, 4-hit finisher and total 20.25 damage. Front-art source rectangle tested in the actual renderer. No browser errors. Reviewed contact sheets and generated 100-frame preview.

Preview: qa/saber-faithful/combo-preview.mp4. The preview is rendered at 60 fps without audio; runtime keeps the approved sound.

Image creation used the built-in image_gen tool. Source image: qa/saber-motion-v2/source-cell.png, identity reference. Generated PNG copied unchanged from the generated_images folder, preserving alpha. No subagents.

## Final image prompt

Create a production sprite atlas for the existing blue/ivory robot hero shown in reference image. Precisely preserve his cobalt helmet, ivory swept side fins, cyan visor, ivory chin, orange round chest core and navy armored torso. Pixel art with sharp shaded clusters, black/navy outlines, same 32-bit sprite aesthetic. This atlas supplies ONLY HELMET+NECK+CHEST+WAIST, NO arms, NO shoulders projecting outward, NO scarf, NO legs, NO weapons. Three busts arranged horizontally in equal thirds of a wide transparent 1536x1024 PNG: left a three-quarter view looking screen right, center a true FRONT VIEW looking toward viewer (two balanced cyan eyes/visor halves, symmetrical ivory helmet side fins, centered chin and orange chest core), right a three-quarter view looking screen left. Each torso starts at helmet crest and ends flat at waist. Each bust occupies x center256,768,1280, same height from y200 to800, centered on its waist anchor at y800. Transparent alpha everywhere else, no background, no shadows, no text or grid. Must be actual different camera orientations, not mirrored or stretched profile drawings. Keep compact hero proportions, head approx 45% of bust height and chest remaining55%. Reference is identity and material guide; the magenta background must NOT appear.
