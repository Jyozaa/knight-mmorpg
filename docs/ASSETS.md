# Assets and provenance — v0.5

## Original armor and environment

The armor mesh is original project-authored geometry, substantially rebuilt in Blender for v0.5. It does not contain a reference image, reference-derived texture, borrowed character mesh or video frames.

- Editable source: `assets/nameless-knight.blend`.
- Reproducible modeling source: `scripts/author-knight.py` (Blender 5.2).
- Runtime asset: `public/models/nameless-knight.glb`, about 3.3 MiB, 92,008 triangles, 18 neutral-axis bones and six material groups.
- The Blender workflow constructs individual shaped and solidified plate surfaces, bevelled boundaries, curved seams, discrete articulation, recessed dark structure and curved torn lower cloth. It exports evaluated geometry and weights, with indexed hard-normal seams. A custom GLB writer preserves the original runtime joint convention rather than introducing Blender bone-roll offsets into the IK solver.
- `prepareArmor` loads this actual GLB; the game does not rebuild the old primitive suit. Scarf, four weighted torn belt/hip strips and sheathed sword remain original runtime geometry attached to the asset's joints.

Grass geometry/distribution, scenery, glyph atlas, steel weathering and synthesized audio are original project work. The unused tree, lamp and shield implementations have been removed.

## Human motion — CMU Graphics Lab

Full-body performances from subject 16 replace the former KayKit curves:

| Take  | Use                                   |
| ----- | ------------------------------------- |
| 16_15 | Straight walking cycle                |
| 16_35 | Running cycle                         |
| 16_17 | Coordinated curved-walking/turn layer |
| 16_08 | Run braking and settled idle pose     |
| 16_33 | Walking braking                       |

[Official subject listing](https://mocap.cs.cmu.edu/search.php?subjectnumber=16), [use terms](https://mocap.cs.cmu.edu/), [redistribution FAQ](https://mocap.cs.cmu.edu/faqs.php). The permission allows incorporation into products and redistribution/modification, but prohibits reselling the motion data itself. **It is not CC0.** See [CMU-MOCAP.md](../public/licenses/CMU-MOCAP.md).

The database acknowledgment is included in the bundled motion provenance note.

`retarget-locomotion.ts` reads `16.asf` and the five named AMC files, resolves ASF joint axes and forward kinematics, removes the take's travel heading, transfers all body/arm/leg/foot rotations onto the original rig, calibrates root travel and chooses matched cycle boundaries. Contact classification and stride metadata accompany the retargeted curves. Runtime IK supports this full-body motion; it no longer invents the moving swing trajectory. Toe/finger motion is deliberately restrained because those CMU channels are not directly captured reliably.

Only game-specific derived curves in `src/character/animation/clips/locomotion.json` are included. Raw database files and the source performance movies remain outside Git. Original starts are controlled full-body transition blends, rather than separately captured start clips; this distinction is explicit in the architecture and validation notes.

## References and review material

`references/knight.mp4` is the primary art/environment benchmark. It was inspected at multiple timestamps alongside `knight_ref.png`, the earlier ASCII knight video, hourglass and Crawlpedia media. It shows a posed character with cloth/grass movement, not a walking/running performance. Official CMU human performance movies were examined separately for gait.

Reference files and internal reference-versus-game contact sheets stay local and ignored. No original reference media is redistributed. Committed screenshots and `docs/previews/v05-gameplay.mp4` depict this game. The preview includes the real synthesized game audio and is never used by the renderer.

## Fonts and sound

Cormorant Garamond and Manrope remain locally bundled under SIL OFL 1.1, with their complete licenses in `public/fonts/`. Dependency licenses remain in installed packages. AudioManager synthesizes wind/rustle, stance-triggered boots, armor ticks, breathing, birds, bells and sparse drone tones. Shared spatial wind drives the audible gain/filter envelopes; these are synthesized carriers, not field recordings or commercial music.
