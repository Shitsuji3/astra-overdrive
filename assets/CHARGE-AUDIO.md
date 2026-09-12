# Charge and charged-shot audio — 2026-09-09

User supplied these MP3 files for this game:

- `ビーム砲チャージ.mp3` → `charge-hold.mp3` (decoded duration approximately 3.966 seconds).
- `チャージショット.mp3` → `charge-fire.mp3` (decoded duration approximately 3.472 seconds).

The imported MP3 files are byte-for-byte copies. `charge-sounds.js` embeds those same bytes as base64 so playback works both over localhost and when opening index.html directly. Both buffers are decoded once after audio initialization.

Hold sound loops while charging and fades out in 45 ms on release or cancellation. The firing sample plays once per actual charged shot, at its original speed. There are no synthesized readiness beeps layered over these samples. Game charge timing and damage are unchanged. Gain compensation is 1.8 for hold and 1.1 for firing, before the existing SE/master volume controls. The original MP3s are not edited.

HTTP and file playback, release switching, mute/volume, pause, focus loss, death, result mode and title cancellation were checked in `qa/sample-charge/verification.json`. Normal buster, saber and BGM retain their existing sounds.
