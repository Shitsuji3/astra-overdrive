# Motion V4 plan — STATUS: COMPLETE (historical record; reopened after user visual rejection)

The prior completion claim is retained as history only. The user re-reported that the 16-frame run looks unnatural: V4 contains too many forward poses on the same side, so alternating footfall, contact/push-off, and airborne recovery do not read as a continuous run. Silhouette similarity sorting cannot guarantee human temporal order, and passing the 16-frame and muzzle-position checks was insufficient for motion acceptance.

The next plan is [RUN-V5-PLAN.md](RUN-V5-PLAN.md). V5 has not been implemented or visually accepted.

Accepted runtime: 16-pose aligned SVG run with charge continuity, 72px saber range, and three combo stages at 4.5 damage each.

Root verification: npm/engine tests pass; 49 visual scenes preserve HUD and idle feet; HTTP/file checks cover 16 run frames and three-stage input; mouse, smoke, 64 muzzle coordinates, four same-frame boundaries, and held-charge motion in both directions pass.

Package: dist/ASTRA-OVERDRIVE.zip, 30 entries with byte-for-byte verification, SHA256 4e359a93f53ff2f074364ab9f832d17841251409e83894dc29dcbd689a1e4c8e.

Heartbeat automation was paused and verified for the historical V4 record; it was reactivated for V5. See [RUN-V5-PLAN.md](RUN-V5-PLAN.md). UI and audio remain unchanged.

Historical quota snapshot: 18% 5-hour, 34% weekly; reset 2026-09-07 13:30:26 JST. This is not a current usage claim.
