# Validation — v0.3

Validated on macOS with Google Chrome, Node.js 26.8.1 and the production Vite preview at 1440 × 900. The original three references and new `references/knight.png` were inspected before edits. All images here are live game captures, not reference artwork.

## Results

- TypeScript, ESLint, Prettier, **23 unit/system tests** and production build: passed.
- Production browser smoke test: passed with **zero page/console errors**. Movement, run, evade, pointer lock/drag/zoom, settings, fullscreen, pause/resume, rest/get-up and the full 55-second pullback remain functional.
- Existing rock matrix/collider, terrain IK, stance contact and rest/reverse checks at 30/60/144 Hz remain green. New boot sounds are triggered by stance entry, with tests verifying contact/event correspondence.
- The original GLB was regenerated: approximately 112,000 armor triangles, five armor material groups and the preserved 18-joint skin. The interchange model remains original project geometry; no reference pixels or unlicensed assets were copied.
- `npm install --package-lock-only` audit: zero vulnerabilities at validation time.
- Production application chunk: approximately 83 kB (29 kB gzip), plus the approximately 538 kB (141 kB gzip) Three.js chunk. The engine still produces Vite's non-blocking 500 kB bundle-size advisory.

## Shared wind verification

Unit tests establish common WindSystem identity for grass/cape/audio, deterministic propagation at 2.8 m/s, frame-rate independence and field-driven wind/rustle/filter targets. The browser separately renders the **same GLSL field** at four positions/times and compares its GPU readback against the TypeScript sampler used by audio. Maximum discrepancy was 0.00284, within 8-bit framebuffer quantization tolerance.

A 220-sample live browser trace compares visible-field gusts with actual Web Audio controls. Recorded correlations were approximately **0.996 gust → audible gain**, **0.999 target → actual gain**, **0.999 filter target → actual cutoff**, and **0.999 rustle target → actual gain**. These measurements include smooth automation rather than merely comparing two copies of a target variable. Wind time also remains fixed during pause. Noise is a procedural carrier; modulation comes from the shared field.

## Visual and motion review

Inspected the views below plus successive motion-recording frames. Armor now reads as silver/white, plate gaps and visor remain dark, the crimson cloth is visible, and grass uses bent clumps/curved strokes against black. In the same standing-view central region, bright silver pixels increased from **3,809 in the committed v0.2 capture to 8,863** in v0.3; the new frame contained **15,632 red cloth pixels**. This is a readability regression measurement, not proof of realistic character art.

The measured world region remained approximately **94% near-black**. About **1.06% of whole-frame pixels** changed by more than 35/255 between nearby screenshots. These coarse guards accompany direct screenshot/motion inspection and cannot establish perfect temporal stability.

| View                | Capture                                        |
| ------------------- | ---------------------------------------------- |
| Standing            | [Standing](screenshots/standing.webp)          |
| Walking             | [Walking](screenshots/walking.webp)            |
| Running             | [Running](screenshots/running.webp)            |
| Armor/closed helmet | [Portrait](screenshots/knight-closeup.webp)    |
| Grass               | [Grass detail](screenshots/grass-closeup.webp) |
| Sitting             | [Sitting](screenshots/sitting.webp)            |
| Lying               | [Resting](screenshots/resting.webp)            |
| Wide cinematic      | [Panorama](screenshots/panorama.webp)          |

Full-resolution PNGs, the complete recording, an 18-second motion extract (`test-results/v03-motion-short.webm`) and exact metrics (`test-results/browser-results.json`) remain local ignored test artifacts. Recordings are review material and are never used by the game.

## Performance and remaining limits

Walking, running and the wide cinematic measured about **60 FPS** on this machine at fine density (503 × 196 glyph cells) and 0.5 scene scale. GPU samples measured roughly **1.13 ms scene**, **0.58 ms ASCII reconstruction** and **0.73 ms isolated grass**. Grass is a subset of scene cost, not an additional cost to add again. CPU animation/camera samples were about 0.02 ms each. These are machine-specific samples rather than universal benchmarks; submission timers can quantize to zero.

The suit and motion remain original procedural work, not a commissioned sculpt or mocap performance. Cloth follows the shared field with a resting flattening approximation, not physical contact simulation. Extreme slopes/pivots, hand/weapon placement and tiny grass still deserve refinement. At the extreme wide endpoint the knight intentionally resolves into a few silver glyphs. Audio remains synthesized placeholder sound, with synchronization verified at the control/signal level rather than a claim of final recording quality. No later story chapters were added.
