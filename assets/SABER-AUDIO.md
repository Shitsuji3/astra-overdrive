# Saber sound

Source: user-provided `C:/Users/situz/Desktop/ゲームAstra/se.mp4` (2026-09-09 request).
Extracted 0.48–1.04 seconds, mono 48 kHz PCM; original playback speed and pitch. Peak 0.45, 5 ms boundary fades. Embedded WAV supports both HTTP and local-file launch. All three strikes use the same supplied timbre.


## Enemy impact layer (2026-09-21)
Source: user-provided `C:/Users/situz/Desktop/ゲームAstra/斬撃SE.mp4`.
First repeated sound extracted at 0.775–1.150s (0.375s), mono 48kHz PCM, original speed/pitch, peak 0.38, 3ms/8ms boundary fades. Embedded as assets/saber-hit-sound.js for offline and hosted playback. Video and original swing sample unchanged.
Triggers only on real melee damage (normal combo, rising slash, charged thrust), for mobs and bosses. One impact per 75ms to avoid simultaneous-target stacking. No trigger for missed strikes, bullets/fan projectiles, deflection, dead or phased-out targets. Independent source layers over the existing swing using the same SE gain and mute setting.
Validation: npm test (188 Node cases plus existing checks), build:ci, qa/saber-hit.cjs (sample decoded, independent layered sources, mute, no browser errors). No subjective listening claim; mix balance awaits user playback.
