# v0.5 motion and audio review

[Play v05-gameplay.mp4](v05-gameplay.mp4) — 44.63 seconds, 1152 × 720, H.264/AAC, approximately 23.4 MiB. The edit includes uninterrupted side-view walking and running, moving turns/deceleration, equipment/armor, wind-driven scarf/grass, sitting, lying and the wide pullback. It includes the actual live synthesized game audio.

The recorder requests 60 Hz directly from the WebGL canvas and connects the existing Web Audio master bus to the same MediaRecorder stream. The final source measures **48.21 FPS overall**, 48.49 in the uninterrupted walk and 47.46 in the run; detailed statistics are in [validation](../VALIDATION.md). The recorder did not sustain the requested 60 FPS. There is no frame interpolation, speed-up or animation smoothing in export. Cuts omit travel back to the waystone and long intervals of the 55-second sequence. Short audio fades only avoid clicks at those cuts.

Reproduce against `npm run preview` with Chrome and system FFmpeg (libx264/AAC):

```sh
node tests/record-preview.mjs
node scripts/compress-preview.mjs
```

Raw native video, timestamp marks, source statistics and full PNGs stay ignored in `test-results/v05/`. The capture script drives real keys and camera controls and uses the normal rest interaction. No teleportation or clock advancement is used. Original reference media is not redistributed.
