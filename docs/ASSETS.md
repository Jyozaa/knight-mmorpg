# Assets and provenance

All game geometry, articulated character parts, environment layout, procedural animation, glyph atlas, bell UI icon and synthesized sounds were created for this project. No third-party knight model, texture, recording, music track or reference media is included.

The three supplied reference files remain locally in ignored `references/`. Their contents have not been copied into the game or repository; the study in VISUAL_REFERENCES.md describes observed artistic principles.

## Bundled fonts

- Cormorant Garamond Regular — Cormorant Project Authors, SIL Open Font License 1.1. Font and complete license in `public/fonts/`. [Upstream](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond).
- Manrope Regular — Manrope Project Authors, SIL Open Font License 1.1. Font and complete license in `public/fonts/`. [Upstream](https://github.com/google/fonts/tree/main/ofl/manrope).

Fonts are hosted locally; game runtime makes no Google Fonts requests. System fonts provide fallbacks. Upstream library licenses are included in installed dependencies: Three.js (MIT), Vite (MIT), TypeScript (Apache-2.0), Playwright (Apache-2.0), tsx (MIT), Prettier (MIT).

## Production replacements

AudioManager creates original procedural wind/grass-like rustle, footsteps, armor ticks, breathing, bird tones, bell partials and drone notes. Replace their sources with appropriately licensed recordings without changing the buses or spatial listener. A cached GLTF loading adapter is ready for an appropriately licensed knight, but this build does not download one.
