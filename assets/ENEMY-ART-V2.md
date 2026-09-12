# Enemy sprite atlas V2 — 2026-09-09

Original enemy artwork generated with the built-in image generation tool for this project. The atlas is a 1536 × 1024 transparent RGBA PNG, copied unchanged as `enemy-atlas-v2.png`. No existing franchise character artwork was used. The generated source is `C:/Users/situz/.codex/generated_images/01a071d6-55a4-72f3-85f6-e53450e47f46/exec-d755f136-3339-42ba-a28f-63b943ba6e33.png`.

Design direction: detailed late-1990s side-scrolling mecha sprites with strong silhouettes, metal bevels, articulated joints, dark outlines and bright sensors. Top row: crimson/ivory armored infantry in four walking poses. Middle: violet/gunmetal aerial scout with stabilizers, engine glow and firing pose. Bottom: ochre/ivory defense turret with pedestal, charging barrel, firing and recoil poses.

`enemies-v2.js` uses explicit atlas rectangles and torso/ground anchors because the generated rows are not a uniform grid. Each frame is cached once in a 64 × 64 transparent canvas at gameplay scale, with nearest-neighbor sampling. The original alpha is preserved. White silhouette masks provide hit feedback. Walking faces the actual patrol direction; drones and turrets face the player. Turret/drone muzzle frames respond to the existing fire-timer reset, not a new attack rule. Failed loading retries with bounded backoff and the existing fallback stays available.

Scope: normal walker, drone and turret visuals. The player, background, boss, enemy collision/damage/positions, audio and UI are retained. Review captures are under `qa/enemy-redesign/`. HTTP pixel checks cover four walking frames, hit/dead states, facing and four turret states; file-based playback was checked by screenshot because file-origin canvas export is browser-restricted.
