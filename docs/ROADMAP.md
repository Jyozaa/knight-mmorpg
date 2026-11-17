# Roadmap

## Complete — Prelude 01: The Knight on the Hill

- Real-time 3D GPU ASCII renderer with stability filtering and adjustable density/render scale.
- Procedural articulated knight, idle/walk/run/evade, accelerated terrain traversal and orbit camera.
- Original hillside and valley, instanced moving grass, rocks/trees, fog, twilight and distant ruined tower.
- Reachable waystone, rest interaction, sit/lie/breathe, continuous camera pullback and reversible return to exploration.
- Procedural audio buses, localized distant bell, surface-specific footsteps and cinematic mix.
- Menu, pause/settings/credits/help, fullscreen, persisted preferences and optional diagnostics.
- Automated system and browser checks, static production build.

## Next — Character polish and The Forgotten Village

1. Refine silhouette/terrain composition against the supplied references; test motion aliasing on varied GPUs.
2. Integrate an appropriately licensed skinned knight GLB with idle/walk/run/sit/lie/get-up clips and animation blending. Keep procedural rig as fallback.
3. Replace placeholders with licensed or commissioned sound, mixing for headphones/speakers.
4. Author an abandoned village with buildings, carts, cobblestones and robust capsule collision; evaluate Rapier.
5. Add the toy horse interaction, girl's memory and chapter transition.

## Later — The Hollow

- Combat inputs, attack combos, dodge invulnerability rules, hit detection and damage feedback.
- Enemy perception, pursuit, telegraphed strikes, death and ASCII particle dissolution.
- Recovery/death/checkpoints and the first returning bird.

## Later — The Last Bell

- Navigable tower stairs and broken great bell interaction.
- Brass bell inventory/story event, spatial valley bells and environmental restoration.
- Wind/sky/grass/birds/light state transitions driven by quest data.

## Later — A Moment of Peace

- Return journey, helmet removal, refined rest animation and final cinematic.
- Narrative ending, intentional fade to black and replay flow.
- Pace all five chapters to approximately 10 minutes with playtesting.

## Foundation work before online play

Entity identities, simulation snapshots, interpolation, authoritative combat, persistence and content streaming. No multiplayer networking is included in this milestone. Desktop keyboard/mouse is the supported input; gamepad and touch gameplay remain future work.
