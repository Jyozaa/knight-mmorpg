# Assets and provenance

All character/world geometry, rig, armor details, original procedural steel weathering, glyph atlas, bell UI icon, procedural animation and synthesized sounds are original to this project. No third-party knight, texture, recording or music was downloaded for this overhaul. No license ambiguity blocks redistribution of a sourced knight because none is used.

## Original knight model

- Creator/source: original project-authored procedural model in `src/character/model/buildArmor.ts`, with reusable shape construction in `armorGeometry.ts`.
- Export: `public/models/nameless-knight.glb`, approximately 3.5 MiB, one armor skin, 18-joint armature, five armor material groups, plus cloth meshes.
- Regenerate: `npm run export:knight`. Original source and generated model are included together in this repository; no external attribution or license restrictions are introduced by this model.
- Verified by importing into Blender: one armature, 18 bones. The GLB is a bind-pose interchange asset. Runtime IK and GPU cloth remain in TypeScript/shader source, not baked animation clips.
- Fallback: the initial original primitive knight remains in `PrototypeKnight.ts` and is selectable with `?knight=prototype`.

All screenshots under `docs/screenshots/` are captures of this original game, not reference images. Browser motion captures in ignored `test-results/` are validation artifacts and are not used by the game renderer.

The original three supplied references and the new `references/knight.png` design image remain locally in ignored `references/`. None of their pixels, geometry, source code, audio or animation has been copied into the game or repository.

## Bundled fonts

- Cormorant Garamond Regular — Cormorant Project Authors, SIL Open Font License 1.1. Complete license in `public/fonts/Cormorant-OFL.txt`. [Upstream](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond).
- Manrope Regular — Manrope Project Authors, SIL Open Font License 1.1. Complete license in `public/fonts/Manrope-OFL.txt`. [Upstream](https://github.com/google/fonts/tree/main/ofl/manrope).

Fonts are bundled locally, with system fallbacks. Runtime makes no Google Fonts requests. Third-party library licenses remain in their installed packages: Three.js/Vite/tsx/Prettier/ESLint (MIT), TypeScript/Playwright (Apache-2.0). pngjs is used only by browser validation.

## Audio

AudioManager still creates original procedural wind/grass rustle, surface footsteps, armor ticks, breathing, birds, bell partials and sparse drone tones. The wind/rustle envelopes and filters now follow the same WindSystem as grass and cape. These remain procedural placeholders, rather than production field recordings. Licensed or commissioned recordings can replace their sources without changing buses, listener positioning or cinematic automation.
