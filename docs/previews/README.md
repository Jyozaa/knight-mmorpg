# v0.4 gameplay motion review

[Play v04-gameplay.mp4](v04-gameplay.mp4) — about 30 seconds, 1152 × 720, 24 FPS, H.264, approximately 6.3 MiB. This is a silent Playwright screen recording; live synthesized audio and wind synchronization are checked separately by browser tests.

The edit shows standing wind/scarf motion, a side-view walk, run, moving direction changes and deceleration, equipment/lantern framing, sitting, lying and the wide pullback. Cuts omit the return walk and long middle of the cinematic. Every included segment runs at real-time speed. Nothing from this video is used by the game renderer.

Reproduce against `npm run preview` with Chrome, Playwright FFmpeg and a system `ffmpeg` supporting libx264:

```sh
node tests/record-preview.mjs
node scripts/compress-preview.mjs
```

Raw video and timestamp marks stay in ignored `test-results/preview/`. The capture script drives real keys, camera drag/wheel and the normal rest interaction; it does not teleport the knight or advance the simulation clock.
