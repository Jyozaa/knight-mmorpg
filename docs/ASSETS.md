# Assets and provenance

Character/world geometry, armor details, scarf, scabbard, lanterns, glyph atlas, procedural steel wear, UI and synthesized sounds are original project work. The three locomotion motion sources below are the only external character content used in v0.4. No third-party character mesh or reference artwork is shipped.

## Original knight and equipment

- Source: `src/character/model/buildArmor.ts`, `armorGeometry.ts`, `SheathedSword.ts` and `Cape.ts` (the last retains its legacy filename but now implements a narrow scarf).
- Export: `public/models/nameless-knight.glb`, approximately 3.6 MiB, one original armor skin, 18 bones, five armor material groups, scarf and separately mounted sword/scabbard geometry.
- Regenerate with `npm run export:knight`. Runtime uses the same builder. The GLB contains a bind pose, not the runtime contact solver, motion clips or scarf simulation.
- `?knight=prototype` selects the preserved initial primitive model.

## Authored locomotion — KayKit, CC0

Kay Lousberg's **KayKit Adventurers Character Pack 1.0** (13 March 2023) contains the authored `Idle`, `Walking_A` and `Running_A` motions used here. The official source archive explicitly licenses this content under Creative Commons Zero. The complete supplied license is retained in [KayKit-CC0.txt](../public/licenses/KayKit-CC0.txt).

Official source: [KayKit GitHub repository](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0), specifically `addons/kaykit_character_pack_adventures/Characters/gltf/Knight.glb`. Upstream revision: `672074b73ba276876a19e8816ecdc5241817ab47`. The source model is used only offline as a motion carrier, and is not included in this project.

`scripts/retarget-locomotion.ts` reads that official GLB, samples the three clips, converts its bind axes/facing, retargets arm directions, reduces the stylized arm flare and recenters its carried-arm stance to free human arms. The resulting compact curves are in `src/character/animation/clips/locomotion.json`. No textures or source mesh data are included. To regenerate, download the official GLB and run:

```sh
npx tsx scripts/retarget-locomotion.ts /path/to/KayKit/Knight.glb
npm run format
```

The runtime blends these authored upper-body/hip curves with project-authored forward lean, acceleration, turning, contact trajectories, IK and rest motion. These are adapted stylized animation clips, **not human motion capture**. Credit to Kay Lousberg is included voluntarily; CC0 does not require attribution.

## References and review media

The user-supplied originals, `references/knight.png` and the new primary benchmark `references/knight_ref.png` remain local and ignored. None of their pixels, geometry, sound or pose sequences is redistributed.

`docs/screenshots/` and `docs/previews/v04-gameplay.mp4` are captures of this real-time game. The MP4 is a compressed review edit, never used in rendering. Full raw Playwright recordings and temporary study frames remain ignored under `test-results/` or outside the repository.

## Fonts and audio

- Cormorant Garamond Regular — Cormorant Project Authors, SIL OFL 1.1; complete license in `public/fonts/Cormorant-OFL.txt`. [Upstream](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond).
- Manrope Regular — Manrope Project Authors, SIL OFL 1.1; complete license in `public/fonts/Manrope-OFL.txt`. [Upstream](https://github.com/google/fonts/tree/main/ofl/manrope).

Fonts are local. AudioManager synthesizes wind/rustle, surface footsteps, armor ticks, breathing, birds, bells and drone tones. Shared WindSystem samples drive wind/rustle gain and filters; they remain procedural sound carriers rather than field recordings. Dependency licenses remain in their installed packages.
