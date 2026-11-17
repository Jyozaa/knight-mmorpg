# The Last Bell

_A world waiting to be heard._

A playable third-person fantasy hillside rendered entirely through real-time ASCII. Version 0.5 replaces the previous character foundation with an original Blender-authored articulated harness and full-body human motion capture. Continuous, multi-scale grass fills the open hills; trees, lamps and the shield are removed. The crimson scarf, sheathed sword, shared wind/audio and 55-second rest cinematic remain.

[Gameplay with live audio](docs/previews/v05-gameplay.mp4) · [Captures and validation](docs/VALIDATION.md)

![Live game](docs/screenshots/front-closeup.webp)

## Run

Node.js 22.13+ or 24+, a current desktop WebGL2 browser, and hardware acceleration are required.

```sh
npm install
npm run dev
```

Choose **Begin Journey** to unlock sound. Walk toward the waystone about ten metres ahead and press **E** when the rest prompt appears. The knight sits and reclines over ten seconds while the camera continues its 55-second pullback. **Return to the fields** reverses the pose before movement unlocks.

| Control            | Action                             |
| ------------------ | ---------------------------------- |
| WASD               | Camera-relative movement           |
| Shift              | Run                                |
| Mouse / drag       | Captured look / free orbit         |
| Wheel              | Zoom                               |
| Double-click world | Recapture mouse                    |
| Space              | Evade                              |
| E                  | Rest near waystone                 |
| Escape             | Pause/resume                       |
| F                  | Fullscreen                         |
| H                  | Controls                           |
| Backquote          | Diagnostics and optional profiling |

Walk/run speeds are 1.35/3.6 m/s, synchronized to calibrated human gait cycles. Reversals brake and turn before recovering speed. Keyboard/mouse gameplay is supported; menus adapt to smaller screens.

## v0.5

- Original editable [Blender model](assets/nameless-knight.blend): angular sallet and recessed facial aperture, fitted cuirass/backplate, overlapping shoulder lames, articulated hands/elbows/legs/sabatons and torn, curved lower wool. The bundled GLB is the model used at runtime, with 18 joints and six material groups.
- Replaced KayKit upper-body curves and generated leg swings with retargeted **full-body CMU human capture**. Walk/run cycles, curved walking and separate braking takes drive the pose; contact/terrain IK corrects the captured feet. Starts blend into the full-body performance under controlled acceleration. Motion provenance and product-use terms are in [assets](docs/ASSETS.md).
- Removed tree meshes, lantern meshes/lights/colliders and forearm shield. No exposed stone-path shading remains.
- Continuous stratified grass across a 432 m square, using overlapping near/middle/far representations. Every stratum is populated; the far layer stays present during pullback. Strong traveling bends, delayed recovery and tip flutter share one wind field with cloth and sound.
- Layered neck wrapping, unequal torn tails and contact proxies. Four additional heavy belt/hip rags reuse the scarf solver with restrained wind/inertia and hip/thigh contact.
- Restrained tired-walk lean, support-side shoulder/torso response and step-driven wrist lag supplement the human capture. Wind/rustle are substantially quieter, while coherent grass recovery waves remain clearly visible.
- Measured glyph tone families, bind-space variant selection and staggered baselines reduce regular stripe patterns. Black background and selective silver/crimson reconstruction are preserved.

This remains the hilltop vertical slice. New story chapters, combat, inventory and multiplayer are not implemented.

## Checks and review capture

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run preview
TEST_URL='http://localhost:4173/?diagnostics' npm run test:browser
```

Browser validation uses installed Google Chrome and Playwright FFmpeg (`npx playwright install ffmpeg`). It drives real controls and checks errors, wind CPU/GPU parity, actual sound controls, menus, movement, rest, pause, return, resizing and fullscreen. Detailed output stays in ignored `test-results/`.

The separate review recorder captures the game canvas at requested 60 Hz together with the actual Web Audio master bus:

```sh
node tests/record-preview.mjs
node scripts/compress-preview.mjs
```

It retains uninterrupted walking/running sequences. The committed compressed edit contains only real-time segments. No source reference media or raw captures are committed. Diagnostic capture streams require `?diagnostics`; they do not control the simulation.

## Authoring

```sh
# Requires Blender; set BLENDER to its executable on other systems.
npm run export:knight
# Requires the specific original CMU subject-16 ASF/AMC files listed in ASSETS.md.
npx tsx scripts/retarget-locomotion.ts /path/to/cmu-subject-16
npm run format
```

`author-knight.py` regenerates the editable Blender scene and neutral-axis rigged GLB. The GLB is about 3.3 MiB. Runtime loads that local asset; no character CDN or external service is needed.

[Architecture](docs/ARCHITECTURE.md) · [Reference study](docs/VISUAL_REFERENCES.md) · [Validation](docs/VALIDATION.md) · [Provenance](docs/ASSETS.md) · [Roadmap](docs/ROADMAP.md)
