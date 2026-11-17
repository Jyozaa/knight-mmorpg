# Validation — v0.5

Validated on 17 November 2026 with macOS, Chrome, Node.js 26.8.1 and the production Vite preview. The primary `knight.mp4`, matching image, prior references, v0.4 captures and separate CMU human performance footage were inspected directly.

## Technical verification

- TypeScript, ESLint, Prettier, **33 unit/system tests**, production build and production browser validation pass.
- Browser checks exercise menus/settings, pointer lock, camera drag/zoom, walk/run/deceleration, evade, audio unlock, pause/resume, sitting/lying, the full 55-second pullback, get-up, fullscreen, responsive menus and persisted settings. Final reported page/console errors: **zero**.
- New tests verify removal of trees/lantern lights/collisions, complete per-stratum grass population, permanent far coverage from several camera positions, terrain-aligned roots, bounded reversal rate, full-body transitions, sword attachment/clearance, scarf wind/contact behavior and pause. Existing footfall/audio and rest/reverse checks remain.
- Walking and running stance targets show **zero measured anchor drift** in sampled terrain traversal. Walking ankle error is about **1.5 cm** on the tested slope; running has its own reach/stance check. Rest/reverse is exercised at 30/60/144 Hz. Such checks accompany visual review; they do not certify realistic movement.
- The actual Blender-authored runtime asset contains **92,008 triangles, 18 bones and six material groups**, approximately **3.3 MiB**. Original editable `.blend` and reproducible authoring source are included.
- Production chunks are approximately **78 kB application**, **452 kB motion curves**, and **519 kB Three.js** (about 28/155/134 kB gzip). Vite retains the non-blocking engine-chunk size advisory.

## Visual and motion review

[Gameplay preview with audio](previews/v05-gameplay.mp4) contains uninterrupted walking and running, direction changes, scarf/grass motion, equipment and the cinematic. It is a variable-rate native canvas capture requested at 60 Hz, exported at 1152 × 720 with H.264/AAC. Included segments retain their original speed. The raw recording stays ignored.

Successive frames from several full gait cycles were compared with the actual CMU performer. The walk shows alternating support, recovery, coordinated shoulders and pelvis; running uses a different human performance with push-off, flight and landing compression. Source joint curves include the legs and feet. The correction layer locks contact rather than replacing the performance with a generated swing arc. Starts remain controlled crossfades into those curves, rather than separately captured start takes. Tight pivots and aggressive interruptions can still be refined.

Raw Blender rendering was reviewed before ASCII. The reference comparison identifies concrete changes: sloped helmet/aperture, cheek/bevor shapes, overlapping lames, fitted chest/back/waist, articulated fingers/legs, folded torn wool and continuous grass. The private comparison sheets contain original reference pixels and are kept outside Git. See [reference study](VISUAL_REFERENCES.md).

| View                 | Capture                                                                |
| -------------------- | ---------------------------------------------------------------------- |
| Front close-up       | [Front](screenshots/front-closeup.webp)                                |
| Side close-up        | [Side](screenshots/side-closeup.webp)                                  |
| Back                 | [Back](screenshots/back.webp)                                          |
| Armor detail         | [Armor](screenshots/armor-details.webp)                                |
| Dense grass close-up | [Grass](screenshots/grass-closeup.webp)                                |
| Grassy hillside      | [Hillside](screenshots/grassy-hillside.webp)                           |
| Walking              | [Walk](screenshots/walking.webp)                                       |
| Running              | [Run](screenshots/running.webp)                                        |
| Turning              | [Turn](screenshots/turning.webp)                                       |
| Torn scarf           | [Scarf](screenshots/ragged-scarf.webp)                                 |
| Weighted waist rags  | [Waist cloth](screenshots/ragged-waist.webp)                           |
| Sheathed sword       | [Sword](screenshots/sheathed-sword.webp)                               |
| Sitting / lying      | [Sitting](screenshots/sitting.webp), [lying](screenshots/resting.webp) |
| Wide pullback        | [Wide](screenshots/panorama.webp)                                      |

The standing world-region guard measured **89.6% near-black** despite much denser grass, with **15,819 bright silver** and **6,316 red cloth** pixels in the central guard region. Approximately **7.11%** of pixels changed substantially between nearby idle captures, including actual strong grass/scarf motion. This is a coarse guard against gross crawling, not an artistic score or isolation of temporal noise.

## Wind and sound

The same WindSystem drives GPU grass/wool, CPU scarf and audible wind/rustle. GPU/CPU field samples agree within **0.00284**. A 220-sample live Web Audio trace gives approximately **0.9918 gust → audible gain**, **0.9989 gain target → actual**, **0.9989 filter target → actual**, **0.9993 rustle target → actual**. Wind and cloth time freeze on pause.

The preview records the real master bus, not a separate soundtrack. The exported audio is non-silent and unclipped; sample measurements are listed with the final export below. These signal/control checks are not a claim of finished field-recording sound design.

## Performance and limitations

Production browser walk/run/wide samples reported **60 FPS** at 503 × 196 cells, 0.5 scene scale. The native review capture uses 0.8 scene scale. Sampled CPU animation/camera cost was approximately **0.43/0.03 ms**, scene submission **1.06 ms**. Asynchronous GPU samples reported scene **1.51 ms**, isolated grass **2.07 ms**, ASCII **0.45 ms**. Isolated grass and scene timers sample different frames/passes and are not directly comparable or additive. These are machine-specific samples, not a universal guarantee.

Coverage uses 729 tiles over 432 m with overlapping detailed/middle/coarse representations. The far representation is retained rather than distance-deleted. Grass is still geometry and can naturally be occluded by rocks or the knight; fine distant blades can alias. The generated terrain ends beyond the traversable region and far scenery remains subtle.

The reference remains more bespoke and ornamental. Starts/pivots can benefit from dedicated capture/matching. The resting timeline remains procedural. Scarf uses animated collision proxies rather than full mesh/self-collision; lower wool has restrained shader motion. Extreme terrain or abrupt equipment/cloth interactions still merit refinement. No new story content was added.

## Final capture statistics

The final native recording contains **5,038 video frames over 104.505 seconds**, approximately **48.21 FPS**. Its uninterrupted walk segment spans **9.116 seconds / 442 frames (48.49 FPS)** and run segment **7.627 seconds / 362 frames (47.46 FPS)**. The stream was requested at 60 Hz; these are measured source timestamps, not interpolated output. The game snapshot reported 60 FPS and zero capture-page errors, but the recorder delivered fewer frames; the preview is not a verified 60 FPS recording. The capture snapshot measured approximately 0.42 ms CPU animation, 0.01 ms camera and 1.05 ms scene submission. The compressed edit retains the same timing and live audio.

Final review edit: **44.63 seconds, 2,163 frames**, requested 60 Hz / approximately **48.44 FPS** variable-rate, **1152 × 720**, H.264 video and AAC audio, **23.42 MiB**. Audio measures approximately **−42.4 dB mean / −18.2 dB peak**, with no clipping. Export keeps original timestamps and does not generate intermediate frames. The older v0.4 preview was retired from the current tree; it remains in Git history.

## Continuation — quiet wind and restrained secondary motion

The requested continuation keeps the authored v0.5 foundation and captured leg performance. A walk-only fatigue layer adds a restrained forward bias, support-side shoulder/torso response and small damped wrist impulses from real foot contacts. Four short belt/hip rags reuse the scarf solver with more weight, lower wind response, tangent-aligned widths and hip/thigh contact. Grass gains continuous recovery sway and patch variation; wind/rustle targets are substantially quieter with gentler filtering. Added tests verify wrist response/fade, rag attachment/strain/terrain contact through travel and rest, and reduced wind levels while preserving correlation.

Independent finger motion is not available in this 18-joint rig; hands respond at the wrist. Cloth uses simplified contact proxies and length constraints rather than full fabric self-collision. Audio gain/filter changes are measured and recorded; subjective loudness balance remains a listening judgment.
