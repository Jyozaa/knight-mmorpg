# Roadmap

## Complete — Prelude 01 foundation

Playable hilltop exploration, third-person controls, terrain and object collision, GPU ASCII world rendering, rest interaction, real-time camera pullback, procedural audio buses, settings/pause/credits/help, fullscreen and diagnostics.

## Complete — 0.2 visual and animation overhaul

- Black-background lighting, selective silver highlights and no aggressive shadow lift.
- Original shaped Gothic plate harness, actual linked mail, 18-joint skin, batched armor, GLB export and retained prototype fallback.
- Five curved grass tuft templates, clustered growth, coherent world-direction wind, actor response and distance detail reduction.
- Distance-driven walking/running, distinct run pose/flight, anchored stance contacts, terrain IK, reach-aware pelvis, turning correction steps and restrained breathing.
- Staggered rest preparation, supporting wrist, terrain-aligned sitting/reclining and reversible get-up.
- Measured-density glyph atlas, oriented outlines, depth-derived normals, camera reprojection, history rejection and temporal filtering.
- Closer gameplay framing, speed-sensitive follow/FOV, wheel zoom and lower cinematic side shot.
- Shared rock render/collision placement with regression coverage.
- ESLint, expanded tests at 30/60/144 Hz, browser image/video captures, opt-in CPU/GPU profiling and GitHub Actions.

## Complete — 0.3 readable steel and shared wind

Rounded closed helmet, domed layered pauldrons, procedural steel wear, long crimson cape/tabard, selective surface-aware ASCII reconstruction, curved/world-anchored grass marks, stance-triggered footfalls and impact settling. A single spatial WindSystem drives grass, cloth, wind audio filtering/volume and nearby rustle. GPU/CPU field parity and live audio correlation are verified alongside existing controls, rock placement, IK and the hilltop sequence.

## Recommended next art milestone

Have an animator author walk/run/start/stop/turn/sit/lie/get-up clips against the exported rig or a commissioned compatible rig. Crossfade those clips through AnimationMixer, retain terrain/stance corrections, refine hand/sword placement on uneven terrain, and add cloth contact. Continue evaluating small-scale grass aliasing and silhouettes across GPUs. These are refinement tasks for the same hilltop; no new story content was added during this overhaul.

## Later story work — not implemented

The Forgotten Village and toy horse memory; forest enemy/combat/dissolution; tower stairs and broken great bell; brass bell restoration; helmet removal and complete five-chapter ending. Inventory, checkpoint saves, gamepad/touch movement and multiplayer are also not implemented.

Before online play, introduce entity identity, authoritative simulation snapshots, interpolation, persistence and content streaming. The current isolated systems make that work possible; they are not a working multiplayer stack.
