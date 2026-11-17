# Validation — v0.7

Validated on 17 November 2026 on an Apple M2 Pro / 16 GB Mac with hardware-accelerated Chrome, Node.js 26.8.1 and the production Vite build. Historical evidence remains in [v0.6 validation](VALIDATION-V06.md) and [v0.5 validation](VALIDATION-V05.md). Reproducible checks and compact measurements are in [the evidence summary](validation/v07-summary.json).

## Presentation and visual review

The default is orthographic 2.5D with weary posture. The 4.5° weak-perspective study uses matched coverage and normalized hero exposure. Both were inspected in actual live captures; orthographic holds proportions and negative space more consistently. Neutral/weary shaded and ASCII studies isolate posture from camera/render changes. The primary knight image/video and hourglass references were inspected directly; original reference media remains private.

| Study                       | Evidence                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Live 2.5D gameplay          | [Idle](screenshots/v07/idle.webp), [walk](screenshots/v07/walk.webp), [run](screenshots/v07/run.webp), [turn](screenshots/v07/turn.webp)         |
| Same camera, shaded posture | [Neutral](screenshots/v07/neutral-shaded.webp), [weary](screenshots/v07/weary-shaded.webp)                                                       |
| Same camera, ASCII posture  | [Neutral](screenshots/v07/neutral-ascii.webp), [weary](screenshots/v07/orthographic-ascii.webp)                                                  |
| Projection study            | [Orthographic](screenshots/v07/orthographic-ascii.webp), [weak perspective](screenshots/v07/weak-ascii.webp)                                     |
| Rest and return             | [Sit](screenshots/v07/sit.webp), [recline](screenshots/v07/lie.webp), [wide](screenshots/v07/wide.webp), [returned](screenshots/v07/return.webp) |

Review prompted several corrections: a rearward camera hid the visor/chest; early wide trials lost the tiny body among grass; the tower reached the frame edge; return initially snapped the target translation. The final 24.6° front/side camera, 16 m reveal, 0.45 rad resting pitch, softly compressed body-contact grass, scale-aware silver reconstruction and shared recomposed landmark address those findings. The knight stays a bright small reclining silhouette against faint meadow/tower strokes. The terrain and all grass populations remain real geometry; there is no conventional 3D overlay or painted background.

Live image guards at 1440 × 900 / Fine density found 92.28% near-black pixels, 667 crimson pixels and 2,037 bright silver pixels in the tested gameplay region. The wide-body region retained 386 lit pixels. These measurements supplement visual inspection; they do not prove artistic quality by themselves. The shaded view confirms distributed torso/head/shoulder posture rather than a tipped root. Neutral/weary canonical head positions differ by 6.17 cm under the same idle pose, and native shoulder/neck adjustments survive retargeting.

## Motion, contacts and state transitions

The 38 existing unit/system checks remain, with seven v0.7 checks for screen travel/depth constraints/collision, both projection inverses, bounded orbit, follow convergence, continuous cinematic entry/return, distributed posture without accumulation, retained grass/parallax and frame-pacing statistics. Captured full-body CMU locomotion remains the base. Actual root distance drives cadence; contacts, knee planes, support pelvis and native boot/palm/hem constraints retain their v0.6 ownership.

Native-skeleton numerical testing uses controlled steps only for diagnosis, never gameplay video. All three rates include walking, running, braking, sit/recline and modeled surface sampling:

| Simulation | Maximum native ankle error | Minimum walking surface clearance | Minimum rest surface clearance | Maximum sampled joint velocity |
| ---------- | -------------------------- | --------------------------------- | ------------------------------ | ------------------------------ |
| 30 Hz      | 0.00815 m                  | 0.00214 m                         | 0.00104 m                      | 6.57 m/s                       |
| 60 Hz      | 0.01419 m                  | 0.00243 m                         | 0.00104 m                      | 7.26 m/s                       |
| 144 Hz     | 0.01796 m                  | 0.00249 m                         | 0.00104 m                      | 7.71 m/s                       |

A transient roughly 2 mm skirt penetration discovered during weary transition was corrected with a 9 mm modeled-hem support margin. Fourteen native garment joints and two rigid armor controls remain present; sampled rigid response stays below 0.01194 rad. The source loop/contact regression gates retain zero measured stance-target slip and bounded release continuity. Repeated identical pose sampling shows no accumulated transform drift. Posture fades through rest and recovers during get-up; native feet remain within 3.5 cm reach tolerance.

Production browser checks cover both camera modes, independent neutral/weary and shaded/ASCII selection, weak perspective, menu/settings/credits/help, sampled-audio unlock, real input/pointer capture, walking/running/braking/reversal, depth corridor, collision/evade, rest proximity, sitting/reclining, full 55-second clock, pause/resume, return, fullscreen and 1440/768/390 px viewport layouts. Resize invalidates temporal history. Both projection inverses reconstruct world points; the shader renders and reprojects correctly in orthographic and perspective modes. Source-level camera replacement separately checks history invalidation by camera identity.

## Wind, grass and sound

GPU/CPU shared-field samples differ by at most 0.00284, within 8-bit readback quantization. The exact grass shader is executed separately on the GPU: roots stay anchored, standing contact lowers nearby tips, reclining lowers tips along the body, and distant tips retain their height. All 729 strata remain populated. Bounded foreground/background parallax never edits instance matrices or deletes blades. Grass, scarf, native cloth and audio share one field/time; pause freezes the field and cinematic clock.

All fourteen foley files load, retain their recorded provenance hashes, and have no synthetic footstep fallback. Actual stance-entry events trigger variations and brushing; the wind bed/rustle follows the same gust/filter targets as visible vegetation. Stereo panning uses view orientation, a virtual listening ear avoids the distant orthographic rendering eye, and initial/periodic bells use the recomposed landmark coordinates. Captures contain the actual master bus, including footsteps, friction, quiet armor, wind/rustle, breath, birds and bells. Signal, loading, cadence, gain, pause and spatial-coordinate checks are automated. The supplied foley's original recording method and a human headphone judgment of its timbre are not independently verified.

## Frame pacing

A separate clean production probe records real rAF intervals through idle, walk, run, stop, reversal and sit/recline, after six seconds of warm-up. Screenshots and video recording are disabled. GPU timing is enabled; the isolated grass pass runs only periodically. This measures active steady-state play rather than inferring stability from average FPS.

| Mode             | Frames | p50     | p95     | p99     | Maximum | >25 / >33.34 / >50 ms | Long tasks |
| ---------------- | ------ | ------- | ------- | ------- | ------- | --------------------- | ---------- |
| Legacy / neutral | 1,767  | 16.7 ms | 16.8 ms | 16.8 ms | 16.8 ms | 0 / 0 / 0             | 0          |
| 2.5D / weary     | 1,766  | 16.7 ms | 16.7 ms | 16.8 ms | 16.8 ms | 0 / 0 / 0             | 0          |

Mean component timings (legacy → 2.5D): animation CPU 1.112 → 1.146 ms, camera CPU 0.019 → 0.021 ms, scene CPU 1.529 → 1.113 ms; GPU scene 2.893 → 2.260 ms, ASCII 1.169 → 1.168 ms, isolated grass 2.423 → 1.629 ms. Isolated grass timing is diagnostic work, not an additional normal full-rate pass.

An early PNG review showed a 216.6 ms interval near the menu/play boundary. Investigation separated screenshot/transition intervals from active timing and repeated both routes without capture; neither clean run reproduced an outlier. Diagnostics exclude intervals straddling inactive states, while active stalls remain counted. These results establish steady-state 60 Hz behavior on this machine; asset loading, export/recording overhead and other hardware are separate measurements. The shipped diagnostic ring reports p50/p95/p99/max and slow-frame counts, plus a separate lifetime CPU submission peak.

## Review recordings and delivery gates

[Legacy A](previews/v07-legacy.mp4), [2.5D B](previews/v07-2p5d.mp4), [side by side](previews/v07-side-by-side.mp4) and [shaded motion](previews/v07-shaded.mp4) are generated from real controls with the same knight, world route, Fine density and Balanced quality. A uses legacy/neutral; B uses 2.5D/weary. Both ASCII recordings retain idle, walk, run, stop, turn, sit, recline, the entire 55-second reveal and get-up. Matched route checkpoints differ by at most 4.67 cm from native input timing. The side-by-side file uses A left / B right with B's actual stereo audio. The shaded edit retains consecutive gait cycles and key rest/return segments.

Capture requests 60 Hz, but native timestamps and encoded cadence are measured separately. Export uses timestamp-preserving scaling/compression, with no interpolation, speed change or motion smoothing. Side-by-side frame synchronization may hold the most recent frame from either stream. See [preview metadata and reproduction](previews/README.md) for exact sizes, durations and cadence. Native capture averages 59.53 fps (A), 59.91 fps (B), and 59.10 fps (shaded). A contains one 81 ms encoded hold during the reveal, with a coincident 66.6 ms rAF interval; capture overhead is a likely contributor, while uncaptured runs showed no outlier. This hold is retained and reported. Decoded audio has zero clipped sample frames. Raw video, detailed timing arrays and private reference studies remain ignored.

Required final gates are typecheck, lint, formatting, all 45 unit/system tests, production build, both production browser suites, native 30/60/144 Hz stability, matched live recording assertions and final artifact review. The acceptance ledger is [here](V07-ACCEPTANCE.md). Existing model permission, motion notices and foley provenance remain intact. No original reference media is staged. Commit/remote delivery is reported with the final branch and SHA.
