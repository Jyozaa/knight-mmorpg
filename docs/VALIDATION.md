# Validation — v0.6

Validated on 17 November 2026 with macOS, Chrome, Node.js 26.8.1, Blender 5.2 and the production Vite build. The previous [v0.5 validation](VALIDATION-V05.md) remains available.

## Model inspection and selection

The supplied FBX imported successfully in Blender with an articulated humanoid skeleton, dedicated garment joints and no animation clips. The original body contains 1,701 triangles. Conversion removes separate sword/shield/dagger meshes and 74 connected scabbard/hilt vertices. The exported model contains **1,682 triangles and 45 bones**. Runtime checks confirm base color, normal, roughness, metallic and AO textures, fourteen cloth bones, two rigid secondary controls and no rendered weapon mesh.

The owner clarified that their friend made the asset and explicitly confirmed public redistribution permission for source, textures and modified versions. The [permission record](../public/licenses/FRIEND-KNIGHT.md) makes no CC0 claim. The source FBX/textures, editable packed Blender scene, conversion script and GLB are committed.

Matching front/side/distance captures compare the retained v0.5 knight and supplied knight in shaded 3D and ASCII. The supplied closed visor, narrow helmet, layered cloth, asymmetry and gauntlet/leg silhouette read more coherently; the original shows more discrete plate ornamentation. Normal maps contribute lit surface detail in shaded 3D and indirectly affect ASCII luminance; they do not create silhouette geometry. A small bevel refines the separate shoulder edge. The supplied knight becomes default after gameplay validation. `?compare` exposes both models and render paths; the old model remains available with its sheathed sword.

| Comparison     | Authored v0.5                                          | Supplied v0.6                                          |
| -------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| ASCII front    | [Authored](screenshots/v06/authored-ascii-front.webp)  | [Supplied](screenshots/v06/imported-ascii-front.webp)  |
| ASCII side     | [Authored](screenshots/v06/authored-ascii-side.webp)   | [Supplied](screenshots/v06/imported-ascii-side.webp)   |
| ASCII distance | [Authored](screenshots/v06/authored-ascii-wide.webp)   | [Supplied](screenshots/v06/imported-ascii-wide.webp)   |
| Shaded front   | [Authored](screenshots/v06/authored-shaded-front.webp) | [Supplied](screenshots/v06/imported-shaded-front.webp) |
| Shaded side    | [Authored](screenshots/v06/authored-shaded-side.webp)  | [Supplied](screenshots/v06/imported-shaded-side.webp)  |

## Jitter diagnosis and repair

The v0.5 baseline was captured with ASCII bypassed. Numerical tracing identified world-space ankle-target jumps up to **38.2 cm at 144 Hz** during planted-foot release. Source ankle curves also contained abrupt rotations from unreliable toe extensions. The defects existed before reconstruction. Additional causes included binary walk/run contact switching, a positional loop seam, near-straight knee ambiguity, discontinuous reach ownership and broad temporal depth acceptance.

Retargeting now uses ankle-to-ball direction with rest-pitch calibration. Loop closure covers position/height channels as well as rotations. Contact confidence blends across samples and gaits, with hysteresis and continuous planting/release corrections. Both legs contribute to continuous pelvis reach. Projected knee confidence resolves near-straight ambiguity. Exact impact/wrist spring integration and fixed-step cloth remove avoidable render-step dependence. Captured human limb paths remain the primary motion; blur does not hide discontinuities.

Native retargeting additionally accounts for shorter limbs and ankle socket height. Samples from the actual boot mesh keep toe/heel surfaces above terrain during pitch. Native gauntlet support and garment-hem contact prevent fingertips and the rear skirt from crossing terrain during recline. Numerical testing drives the native skeleton at **30/60/144 Hz**, including walking, running, stopping and resting. Sampled native surfaces remain nonnegative during both traversal and rest. The maximum rigid armor response is about 0.68 degrees.

| Simulation rate                                                                                          | Maximum native ankle error | Maximum joint speed relative to root |
| -------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------ |
| 30 Hz                                                                                                    | 0.84 cm                    | 6.57 m/s                             |
| 60 Hz                                                                                                    | 1.50 cm                    | 7.26 m/s                             |
| 144 Hz                                                                                                   | 1.84 cm                    | 7.71 m/s                             |
| Numerical stability supports the uninterrupted visual gait review; it does not certify artistic realism. |

ASCII is evaluated after the shaded rig check. Half-float history retains useful depth precision. Hero-root reprojection, expected previous-view depth and stricter hero rejection reduce stale animated-object history. Bind-space glyph families remain attached to steel. Shaded and ASCII gait captures use the same controller and animation without simulation time advancement.

## Audio and shared environment

Fourteen bundled CC0 OGG assets load and decode in Chrome with no missing files. Actual grounded-foot events trigger layered grass, soft impact, dry friction and quiet armor samples. Walking/running use different intensity and rate ranges. Movement distance adds grass brushing; crossfaded grass tails replace the rustle carrier while the existing shared wind controls gain and filtering. Wind and foot movement have separate layers. The old noise/oscillator footstep implementation is removed.

The [audio provenance](../public/licenses/GRASS-AUDIO.md) identifies the creator, CC0 permission, download mirror, exact hashes and layer uses. These are sampled foley assets; their original recording technique was not independently established. Playback is verified by decoded buffers, sample variation, event counts, non-silent Web Audio output and captured master-bus audio. A human listening assessment of subjective realism and balance remains outstanding.

Dense grass, shared wind direction/time, black sky, no trees/lamps, UI, third-person controls and the complete 55-second rest/return remain. The GPU/CPU wind parity test is retained.

## Checks and measured results

TypeScript, ESLint, Prettier, **38 unit/system tests**, production build and production browser validation pass. The browser exercises menus/settings, audio unlock, pointer lock, walking/running/braking, rest, the full pullback, pause/resume, get-up, evade, orbit/zoom, fullscreen, responsive menus and saved settings. Final page/console errors: **zero**. Separate native-skeleton stability and all four model/render comparisons also pass.

The browser's walking mesh surface minimum is **+4.18 mm** and resting minimum **+2.74 mm** on the sampled scene. Stance anchors remain fixed in the canonical contact test; the imported morphology adds boot-surface correction. The standing image guard reports **90.19% near-black**, **10,480 bright silver pixels** and **6,404 red scarf pixels** in the monitored region. Nearby idle frames change by about **7.45%**; this includes animated grass/cloth and is not an isolated shimmer score.

Production walk/run/wide snapshots report **60 FPS** at 503 × 196 cells and 0.5 scene scale. CPU animation/camera samples are approximately **0.59/0.01 ms**, scene submission **0.91 ms**. Asynchronous GPU samples are approximately **2.38 ms scene**, **2.03 ms isolated grass**, **0.77 ms ASCII**. Timers sample different passes/frames; grass is not additive to scene cost. These measurements are machine-specific. Review recording uses 0.8 scene scale.

GPU/CPU shared-wind samples agree within **0.00284**. A 220-sample audio trace measures approximately **0.9917 gust-to-gain**, **0.9988 target-to-gain**, **0.9988 target-to-filter**, **0.9992 target-to-rustle** correlation. All fourteen foley files decode; sampled movement includes multiple grass variations and vegetation brushing. Raw recordings, reference material and detailed diagnostic traces remain ignored in `test-results/v06/`.

## Final capture statistics

The native ASCII source contains **6,270 frames across a 104.645-second timestamp span**, approximately **59.91 FPS**. The uninterrupted walk is **9.114 seconds / 547 frames (approximately 60.02 FPS)**; the run is **7.625 seconds / 457 frames (59.93 FPS)**. Segment-window edge counting can differ by one frame. The refreshed shaded source contains **976 frames across 16.287 seconds**, approximately **59.86 FPS**. These are observed source timestamps, without frame generation or time scaling.

The committed ASCII edit is **44.69 seconds / 2,677 frames**, **1152 × 720**, H.264/AAC, **24.70 MiB**. Its audio measures **−39.9 dB mean / −15.1 dB peak**. The shaded review is **16.32 seconds / 976 frames**, **960 × 600**, H.264/AAC, **5.29 MiB**, with **−40.3 dB mean / −17.4 dB peak** audio. Both are variable-rate exports with no clipping. The shaded bitrate is capped for a practical download.

Shaded review uses an opaque display pass after the HDR scene. This prevents semantic surface alpha from being treated as premultiplied transparency by canvas recording. A decoded video frame was compared with its near-time screenshot; the hero-region average differs by about five percent, including compression and moving cloth, rather than the previous overbright capture. Consecutive frames from several walk/run cycles were inspected in both render modes. The abrupt release jump is absent in the recorded review, with residual fine-detail glyph aliasing noted below.

[ASCII gameplay with live audio](previews/v06-gameplay.mp4) · [Uninterrupted shaded walk/run](previews/v06-gait-shaded.mp4)

## Limits

Starts, braking and turns use controlled blends rather than a full motion-matching graph. Resting remains the existing authored procedural sequence. Contact proxies and weighted garment hinges are not full fabric self-collision or collision against every armor triangle. Source fingers retain their bind articulation and follow the wrist; independent performance finger animation is not supplied. Fine distant blades and moving glyph edges can still alias. The original asset remains loaded to provide canonical rig metadata and selectable comparison. No story systems were expanded.
