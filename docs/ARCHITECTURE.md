# Architecture

## Runtime

Vite and strict TypeScript, with Three.js/WebGL2 and Web Audio. No UI framework, backend or network gameplay. The game loop clamps pathological frame gaps to 50 ms, advances animation continuously using seconds, and uses exponential damping for movement/camera/animation blends. It pauses on tab visibility loss so the player cannot walk off while away.

`src/main.ts` owns the lifecycle and small state machine (`menu`, `playing`, `paused`, `cinematic`). Pausing retains the preceding gameplay state. Graphics settings freeze simulation while open. Camera pointer lock has a drag fallback. Audio initializes only after Begin Journey. A read-only development snapshot supports smoke tests without hidden control/teleport APIs.

## Modules

| Module                             | Responsibility                                                                                                                |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `rendering/AsciiRenderer.ts`       | WebGL renderer, scene/depth target, glyph atlas, temporal history ping-pong, final glyph shader, resolution                   |
| `world/World.ts`                   | Seeded terrain geometry, vertex materials, lighting, instanced vegetation and rocks, tower, waystone, environmental animation |
| `world/terrain.ts`                 | Shared analytic height field, terrain surface selection and circular collision resolution                                     |
| `character/Knight.ts`              | Original jointed armor rig and continuously evaluated/blended poses, cape deformation                                         |
| `character/CharacterController.ts` | Camera-relative acceleration, turning, run/evade, terrain following and entity collision                                      |
| `camera/CameraController.ts`       | Smooth orbit/follow, camera arm obstruction checks and cinematic camera blending                                              |
| `cinematic/CinematicSystem.ts`     | Data-driven camera keys and continuous centripetal Catmull–Rom path, terrain clearance, timeline                              |
| `audio/AudioManager.ts`            | Browser audio unlock, buses, procedural sources, listener, attenuation and cinematic mixing                                   |
| `systems/Input.ts`                 | Key state/press consumption, mouse deltas, pointer lock and drag                                                              |
| `systems/InteractionSystem.ts`     | Nearest reachable interaction query and action dispatch                                                                       |
| `systems/QuestProgression.ts`      | First chapter objective state; future chapter transitions belong here                                                         |
| `systems/AssetLoader.ts`           | Cached asynchronous GLTF loader for future licensed assets; not needed by this slice                                          |
| `ui/UI.ts`                         | DOM presentation, dialogs, settings and readouts                                                                              |
| `config.ts`                        | Settings validation, deterministic random source, interpolation utilities                                                     |

## ASCII pipeline

1. Render the entire lit scene to a color target and depth texture. Resolution is independent of character density.
2. Render a character-sized temporal field. Four subcell color samples soften subpixel geometry, a depth difference helps narrow silhouettes, and nonlinear luminance maps the scene into the glyph range.
3. Read the preceding field from a separate ping-pong target. Small luminance differences retain the prior value (a 0.024 deadband); larger changes blend toward the new value. This stabilizes thresholds without holding static animation frames.
4. Render one full-screen quad. Each fixed screen cell selects one glyph from a locally generated canvas atlas. The quad samples glyph coverage, applies tonal ink brightness and a subdued grayscale/gold/blue tint. The conventional color scene is never composited into the final image.

History clears when the viewport/density changes. There are two small extra GPU passes, no DOM glyphs or CPU per-frame image readbacks. Fixed cells reduce crawling but do not eliminate all temporal aliasing, especially when very fine grass crosses a cell. A future quality pass could add normal textures and motion-aware reprojection. Current shaders use luminance/depth, not normal-based character orientation.

## Movement and animation

The knight is original geometry parented to actual Three.js Bone joints: hips, torso, head, shoulders, elbows, hips and knees. Armor plates are rigid pieces attached to the hierarchy. Analytic gait phase is continuous; speed smoothly blends its amplitude. Breathing and idle look offsets remain active during rest. The rest pose blends sitting over 2.8 seconds, then lying between 3.7 and 7.5 seconds. Returning reverses that timeline before movement unlocks.

This is an articulated procedural rig, not a skinned GLB and not baked AnimationMixer clips. That is the deliberate fallback authorized by the brief. A production rig can replace it through AssetLoader, retaining the controller/camera/interaction boundaries.

Physics is an analytic height field plus broad circular solid obstacles. This is appropriate for a terrain-only vertical slice and avoids unnecessary WASM/physics overhead. Rapier becomes appropriate with stairs, buildings, dynamic bodies and combat. Rendered terrain samples the same analytic field on a mesh; collision heights can differ slightly between mesh vertices. There is no jumping or tower climbing yet.

## Cinematic

The reusable camera system stores times, camera offsets and look heights. A continuous spline passes through its compositions: side view, whole body, hill, valley, wide panorama. Offsets are rotated into a supplied shot orientation. The hilltop track faces the valley, and the knight turns smoothly toward the resting orientation while sitting. A terrain floor prevents the pullback descending into the hillside. The camera controller eases from gameplay to the authored track. The timeline freezes on pause; grass, breathing, world and audio remain active during the sequence. It is not a video.

## Sound

Master routes independent ambience, effects, music and cinematic gain buses to the destination. Audio is generated locally from filtered noise, oscillators and bell partials. Footsteps vary by analytic terrain material. Bells use a 3D HRTF panner and the active camera listener; birds use stereo positioning. Wind and musical drones are non-positional ambience. Close breathing softens as the cinematic pulls away and the wind bed increases.

Replace synthesized sources with licensed AudioBuffers inside AudioManager; bus routing and automation need not change. Procedural sources are intentionally placeholders, not a claim of final sound design.

## Performance

28,000 grass blades are one instanced draw, three tree layers share an instanced mesh, trunks and rocks are instanced. Character joint geometry has more draws, retained for articulation/readability. The optional overlay shows complete scene calls including shadows; the glyph passes add two more. Balanced rendering uses 0.8 × viewport scene resolution, independent of the character field. Canvas pixel ratio is capped at 1.5. Future scaling work: merge rigid armor by joint, vegetation culling/LOD, adaptive quality and GPU profiling.

No multiplayer exists. Controller state, quest state and interaction descriptors are separate from presentation so authoritative entity snapshots can be introduced later. This is a foundation for that work, not a multiplayer-ready server architecture.

Implementation API reference: [Three.js documentation](https://threejs.org/docs/).
