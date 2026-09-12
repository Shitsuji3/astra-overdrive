# Both arms free in run and idle — COMPLETE (2026-09-08)

User explicitly permits moving the buster in locomotion and idle, and requests both arms swing. No subagents used. Replaced fixed cannon-pivot motion with two-part arms: upper arms rotate at the shoulders, elbows move in opposing directions, and forearms/cannon follow. Running elbows travel more than 10px across the shoulders; free cannon muzzle travels more than18px horizontally. Idle now uses the same rig with stable feet and slower relaxed movement in both arms. Shooting/charging raises the elbow and aims forward; existing80ms smooth release retained.

Source changed in assets/run-rig-v6.js, game.js, render.js, tests/combat-polish.test.cjs. Source PNG/SVG unchanged, no image generation. Existing UI, stage, movement speed and run leg cycle, saber, mouse control and audio preserved.

Validation: npm passes including arm-travel regression, unchanged leg geometry2001samples, browser mouse10/10, smoke16/16. qa/arm-swing/independent-acceptance.json covers768 rendered muzzles across run/idle, left/right, free/intermediate/aimed, HTTP/file, plus actual heldmousechargedrelease. Max error1.06e-6 gamepixels. Four14-phase sheets inspect run/idle and aim/free states. qa/arm-swing/preview.mp4 shows current run and idle motion.

ZIP verification in qa/arm-swing/package-verification.json; exactly32 entries, no QA or reference files, every entry matches workspace bytes. Previous ZIP backed up before rebuilding. Automatic continuation should remain paused after delivery. Future work must follow user's no-subagent preference and newest request rather than old COMPLETE records.
