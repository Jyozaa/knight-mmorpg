# Motion and audio review

[v0.6 ASCII gameplay](v06-gameplay.mp4) — 44.69 seconds, 1152 × 720, 24.70 MiB — contains uninterrupted walking/running, turns, cloth/scarf, sampled footsteps, resting and pullback. [Shaded gait review](v06-gait-shaded.mp4) — 16.32 seconds, 960 × 600, 5.29 MiB — shows consecutive walking/running cycles with ASCII bypassed. Both record real input-driven gameplay and the actual Web Audio master bus. Native frame statistics and limitations are in [validation](../VALIDATION.md).

The recorder requests 60 Hz; actual timestamps determine measured frame rate. Export does not interpolate, speed up, or smooth animation. Cuts omit travel back to the waystone and long intervals of the 55-second sequence. Short audio fades prevent cut clicks.

With production preview running on port 4173:

```sh
node tests/record-preview.mjs
node scripts/compress-preview.mjs
node tests/record-gait.mjs
ffmpeg -i test-results/v06/v06-shaded.webm -vf scale=960:600:flags=lanczos -c:v libx264 -preset slow -crf 32 -maxrate 2500k -bufsize 5000k -threads 2 -fps_mode vfr -c:a aac -b:a 96k -movflags +faststart docs/previews/v06-gait-shaded.mp4
```

Comparison screenshots use `TEST_ORIGIN=http://localhost:4173 node tests/model-review.mjs`. Numerical native-skeleton stability testing uses the development server on port 5173 and `node tests/animation-stability.mjs`. Controlled numerical time steps are not used in video capture.

Raw video, timestamp marks, PNGs and detailed metrics stay ignored. The [v0.5 preview](v05-gameplay.mp4) and [its measured validation](../VALIDATION-V05.md) remain for history. Original external reference media is not redistributed.
