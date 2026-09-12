# Upper body coordination — COMPLETE (2026-09-08)

User preference: do not use subagents. This continuation was performed directly by Astra; future automatic work must respect the same preference.

The upper body now follows the V6 leg cycle: contact-driven torso pitch, shoulder sway, and opposing arm swings. The original lower-body path and .50 second cycle are retained. Cannon drawing and the projectile origin share the same shoulder transform. Charging/firing aims horizontally, then an 80 ms smooth release rejoins the running arm swing.

Changed: assets/run-rig-v6.js, game.js, render.js, tests/combat-polish.test.cjs, package.json (rig syntax check), README.md, assets/RUN-V6-ART.md.

Validation: npm test passes; existing browser mouse 10/10 and smoke 16/16 pass; unchanged leg geometry passes 2001 samples. qa/upper-body/independent-acceptance.json verifies HTTP and file startup, actual mouse held charge in both directions, single power-3 release, and 384 rendered muzzle cases including the intermediate aim pose. Maximum muzzle error is about 0.00000106 game pixels. Main game capture and 180 rendered normal/quarter-speed comparison frames reviewed. qa/upper-body/comparison.mp4 is the before/after preview. No source raster edits, UI redesign, or audio changes.

Distribution verified: 32 entries, all workspace bytes match, unchanged embedded PNG. SHA256 3bdc15cc8f350db37f7a764a1a6b0451257830e2577ba324a6ddb84f58ddc291. Result in qa/upper-body/package-verification.json. Automatic continuation is to be paused after this delivery; earlier generic animation heartbeat prompts must not restart old work or delegate.
