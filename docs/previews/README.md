# Motion and audio review — v0.7

Both ASCII files retain the same real-input route: idle, walk, run, stop, reversal, sit, recline, the complete 55-second pullback and get-up. **Side by side: A is left, B is right; audio is B's actual stereo master bus.** A uses legacy camera / neutral posture; B uses 2.5D / weary posture. Both use the supplied knight, shared world, 1440 × 900 viewport, Fine density and Balanced quality. Matched checkpoint positions differ by at most 0.04665 m from native input timing.

| Preview                                  | Duration | Export size | File size |
| ---------------------------------------- | -------- | ----------- | --------- |
| [A — legacy / neutral](v07-legacy.mp4)   | 81.15 s  | 1152 × 720  | 41.27 MiB |
| [B — 2.5D / weary](v07-2p5d.mp4)         | 81.12 s  | 1152 × 720  | 16.09 MiB |
| [A left / B right](v07-side-by-side.mp4) | 81.13 s  | 1920 × 600  | 30.53 MiB |
| [Shaded motion](v07-shaded.mp4)          | 31.79 s  | 1152 × 720  | 30.02 MiB |

The shaded edit retains uninterrupted walking/running, stopping/turning and key sit/lie/wide/return segments. All files include actual game audio, encoded as stereo AAC. Export preserves native timing: no interpolation, speed changes or motion smoothing. Side-by-side synchronization can hold the latest frame from either source. Its nominal 60 fps output is not a claim that every native source interval was 16.67 ms. Single A/B files retain variable native cadence.

| Native capture | Frames | Mean fps | p99 frame gap | Maximum gap | Gaps >25 / >50 ms |
| -------------- | ------ | -------- | ------------- | ----------- | ----------------- |
| legacy-ascii   | 4831   | 59.53    | 19 ms         | 81 ms       | 38 / 1            |
| 2p5d-ascii     | 4860   | 59.91    | 19 ms         | 37 ms       | 11 / 0            |
| 2p5d-shaded    | 4795   | 59.10    | 32 ms         | 43 ms       | 78 / 0            |

Legacy capture contains one 81 ms encoded gap at 52.323 s, during the resting reveal, with a coincident 66.6 ms game interval. Recording overhead is a likely contributor; the separate uncaptured probe did not reproduce a slow frame. B has no encoded gap above 50 ms. These native holds remain visible rather than being smoothed away. The [validation report](../VALIDATION.md) separates capture cadence from clean game frame pacing.

Decoded source audio has no clipped sample frames. Peaks are −12.72 dBFS (A), −14.59 dBFS (B), and −14.61 dBFS (shaded). Travel RMS is about five to six times idle RMS, with quieter wind/rustle/rest passages. Stance-triggered foley, loaded variations and brushing are checked in live diagnostics. Human headphone preference and the original foley recording method are not independently verified.

Final review inspected full-size shaded/ASCII frames, consecutive gait frame strips, matched posture/projection stills and compressed side-by-side/wide frames. Silver silhouette and black/crimson hierarchy survive export; fine grass loses some detail at reduced size. [Lossless stills](../screenshots/v07/idle.webp) provide closer inspection. Exact metrics are in [the evidence summary](../validation/v07-summary.json).

With production preview on port 4173:

```sh
npm run record:v07
CAPTURE_MODE=2p5d RENDER=shaded npm run record:v07
node scripts/inspect-v07.mjs
node scripts/compress-v07.mjs
node tests/presentation-studies.mjs
node tests/frame-pacing.mjs
```

`EXPORT_ONLY=shaded node scripts/compress-v07.mjs` re-exports a single artifact. Native skeleton and controlled still diagnosis use the development server on port 5173: `npm run test:stability` and `node tests/composition-study.mjs`. Controlled pose time is never used in gameplay video.

Raw captures, marks, detailed arrays and original references remain ignored. Prior [v0.6 gameplay](v06-gameplay.mp4), [v0.6 shaded gait](v06-gait-shaded.mp4) and [v0.5 preview](v05-gameplay.mp4) remain available with their historical validation.
