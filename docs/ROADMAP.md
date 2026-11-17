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

## Complete — 0.4 scarf, locomotion and hillside atmosphere

Retargeted CC0 authored idle/walk/run upper-body curves blended with terrain IK, acceleration/turning posture and contact-controlled legs. Sword moved from hand to a separate hip scabbard. Three narrow torn scarf ribbons use shared-wind forces and fixed-step constrained simulation. Taller grass bends strongly in traveling gusts, with more pronounced field-driven audio. Fifteen medieval lantern posts and four nearby warm lights reinforce the hillside. Repository review video and eleven screenshot views accompany browser/system verification.

## Complete — 0.5 authored armor, continuous meadow and human capture

Original Blender-authored armor replaces the former runtime suit: recessed sallet, overlapping lames, shaped torso/limbs, finger/boot articulation and tattered folded wool. The rigged GLB is the actual runtime asset. Full-body CMU human capture replaces KayKit/procedural moving leg arcs, with calibrated stride, braking/turn layers and supporting IK. Starts crossfade into the full performance under controlled acceleration. The landscape has continuous overlapping grass representations; all trees, lamps, shield geometry and corresponding collisions are removed. Layered scarf wraps and helmet/shoulder/torso proxies refine cloth contact. Review captures include uninterrupted side-view cycles and live recorded audio.

## Further polish within this scene

Dedicated captured start/stop matching and planted 180-degree pivot clips could improve the current transition graph. Refine cloth self-collision and plate contact on extreme poses, custom engraved forms, thin-blade temporal reconstruction, and silhouette readability across GPUs. These are further art/animation refinements before story expansion.

## Later story work — not implemented

The Forgotten Village and toy horse memory; forest enemy/combat/dissolution; tower stairs and broken great bell; brass bell restoration; helmet removal and complete five-chapter ending. Inventory, checkpoint saves, gamepad/touch movement and multiplayer are also not implemented.

Before online play, introduce entity identity, authoritative simulation snapshots, interpolation, persistence and content streaming. The current isolated systems make that work possible; they are not a working multiplayer stack.
