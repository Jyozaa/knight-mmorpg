# Validation — v0.4

Validated on 17 November 2026, macOS, Node.js 26.8.1, Google Chrome and the production Vite preview at 1440 × 900. Inspected the new `references/knight_ref.png` and renewed frames from the original knight video. No reference media is committed.

## Results

- `npm run typecheck`, `npm run lint`, `npm run format:check`, **28 unit/system tests**, and `npm run build`: passed.
- Final production browser test: passed with **zero page/console errors**. Real inputs verify walk/run/deceleration, evade, orbit/zoom/pointer lock, menus/settings, fullscreen, resizing, audio unlock, pause/resume, rest/get-up and the complete 55-second cinematic.
- Added tests cover sheathed sword parentage and ground clearance through rest, scarf neck attachment/length bounds/ground contact/wind motion/pause, relative-air trailing of the long tails, authored walk/run/start/stop blending, and lantern semantic material tags/four-light budget. The lantern test catches the material-clone hook loss found during visual review.
- Existing stance tests measure zero target drift during walking contact and negligible ankle/target error on the sampled slope. Rest/reverse clearance remains checked at 30/60/144 Hz. These numerical checks supplement motion review; they do not prove realistic animation.
- Regenerated original GLB: 3.56 MiB, approximately 108,000 armor triangles, five armor material groups, 18 bones and separate scarf/sword/scabbard geometry. Blender 5.2 imported one armature with all 18 bones and 27 mesh objects.
- Production application chunk: approximately 133 kB / 43 kB gzip, plus Three.js at 539 kB / 141 kB gzip. The existing non-blocking Vite 500 kB engine-chunk advisory remains.

## Motion and visual review

[Repository gameplay preview](previews/v04-gameplay.mp4): 29.8 seconds, 1152 × 720, 24 FPS H.264, approximately 6.3 MiB. It contains actual side-view walking/running, moving turns, stopping, shared-wind scarf/grass, equipment/lamps and the sit/lie/wide sequence. Cuts omit travel back to the waystone and the middle of the long pullback; included shots retain real-time speed. The recording is silent; sound controls are verified separately below. Raw 90-second recording and earlier review passes remain ignored.

Reviewed successive frames from actual gameplay recordings, including a gait-cycle contact sheet and the final compressed edit. The profile view exposes separate knee recovery, support/flight, lumbar lean, shoulder/elbow movement and hip compression. The walk/run no longer share the old rigid sword-carrying arm pose. Idle-to-travel, run turns and settling were inspected as sequences, alongside the numerical foot-contact checks.

Visual review prompted fixes to interpolated lamp-tag speckles, lost amber shader tags after material cloning, fractional glyph indices, scarf root/body constraint interference, excessive following-wind scarf lead, and reversed heel/toe pitch. The final scarf exposes the armor, long tails trail under running, the short torn end can curl independently, grass visibly bends, and lamp flames retain amber through the ASCII reconstruction. The knight remains a few silver glyphs at the extreme wide endpoint.

Final standing measurement: **93.3% near-black** in the sampled world region; **14,591 bright silver** and **4,380 red scarf** pixels in the central guard region. Approximately **2.49%** of pixels changed substantially between nearby idle captures. These are coarse readability/crawling guards, not artistic scores or proof of perfect temporal stability.

| Requested view         | Capture                                     |
| ---------------------- | ------------------------------------------- |
| Standing               | [Standing](screenshots/standing.webp)       |
| Walking, side view     | [Walking](screenshots/walking.webp)         |
| Running, side view     | [Running](screenshots/running.webp)         |
| Armor and closed visor | [Portrait](screenshots/knight-closeup.webp) |
| Sheathed sword         | [Scabbard](screenshots/sheathed-sword.webp) |
| Torn crimson scarf     | [Scarf](screenshots/ragged-scarf.webp)      |
| Tall grass             | [Grass](screenshots/grass-closeup.webp)     |
| Medieval lamp post     | [Lantern](screenshots/lamp-posts.webp)      |
| Sitting                | [Sitting](screenshots/sitting.webp)         |
| Lying                  | [Resting](screenshots/resting.webp)         |
| Wide cinematic         | [Panorama](screenshots/panorama.webp)       |

## Shared wind and audio

The same WindSystem instance drives GPU grass, CPU scarf forces and audio targets. Four GPU sampler positions agree with the CPU field within **0.00284**, within framebuffer quantization tolerance. The 220-sample live Web Audio trace gives correlations of **0.9955 gust → audible gain**, **0.9990 gain target → actual**, **0.9990 cutoff target → actual**, and **0.9993 rustle target → actual**. Wind time and scarf nodes freeze with simulation pause. No independent random wind envelope was introduced.

## Performance and remaining limits

Final browser walk, run and wide samples each reported **60 FPS** at fine density (503 × 196 cells), 0.5 scene scale. The separate review recording uses 0.8 scene scale. CPU animation measured about **0.22 ms**, camera about **0.02 ms**; sampled GPU scene cost ranged roughly **0.8–2.0 ms**, ASCII **0.5–1.0 ms**, isolated grass around **1.2 ms** across review runs. Grass is already part of the scene; isolated samples occur at different instants and are not an extra additive cost. These are machine-specific samples, not a universal 60 FPS guarantee.

Locomotion is hybrid adapted stylized authored motion plus procedural contact legs, rather than human mocap. Tight 180-degree pivots, extreme slopes and dedicated start/stop/turn clips can still improve. Scarf uses a small constrained ribbon solver with torso/terrain exclusion; it has no full self-collision, helmet/pauldron collision mesh or aerodynamic model. It may brush armor during abrupt changes. Tiny distant grass and moving plates can still alias because history lacks per-object motion vectors. The original procedural armor remains more regular than the supplied artwork. Audio is synthesized. No later story content was added.
