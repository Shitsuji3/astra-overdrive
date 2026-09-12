# Motion V6 plan — STATUS: COMPLETE

V6 is the delivered articulated run rig using unchanged V4 SVG/PNG source parts. It runs on a stable 0.50 second cycle with restrained anatomical swing, compact recovery, stable torso/cannon, exact ground anchoring, and deterministic IK.

Implementation: `assets/run-rig-v6.js`, loaded by `index.html` and used by `game.js` / `render.js`. Provenance: `assets/RUN-V6-ART.md`.

Validation completed:

- Main 14-phase contact review and 180-frame normal/quarter-speed comparison: `qa/run-v6/running-contact.png`, `qa/run-v6/aiming-contact.png`, and `qa/run-v6/user-video-contact.png`.
- 2001-sample geometry check passed.
- Independent HTTP/file acceptance passed: 256 rendered muzzle cases, maximum error `9.21e-7`, and held charge in both directions.
- Full npm and browser QA passed.
- Distribution contains exactly 32 entries with all packaged bytes matching source. SHA-256: `e7f6712ac294df7dd41e935c4d71def39ef066dcfb73a20e5d1b30cb90ae16b8`.

The parent agent will pause the existing automation after final delivery.
