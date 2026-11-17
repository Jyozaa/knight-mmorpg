# The Last Bell

_A world waiting to be heard._

A playable third-person fantasy scene reconstructed entirely from ASCII glyphs on the GPU. Version 0.3 refines **The Knight on the Hill** with readable silver armor, a deep red cape, curved grass and one spatial wind field shared by animation and audio. The existing controls, audio, UI and hilltop interaction are preserved. This is a vertical slice, not the full five-chapter RPG.

![Live title scene](docs/screenshots/title.webp)

## Play locally

Requires Node.js 22.13+ (22 LTS), or 24+ and a current desktop WebGL2 browser with hardware acceleration.

```sh
npm install
npm run dev
```

Open the URL printed by Vite (usually **http://localhost:5173**) and choose **Begin Journey** to unlock audio. Walk forward toward the waystone, about 10 metres from the spawn. Press **E** when **Press E to Rest** appears. The knight prepares, sits and reclines over ten seconds; the camera continues its real-time pullback to 55 seconds. **Return to the fields** reverses the rest pose before movement unlocks. Escape pauses either mode.

Keyboard/mouse gameplay is supported; menus adapt to smaller viewports.

| Control                  | Action                                   |
| ------------------------ | ---------------------------------------- |
| WASD                     | Camera-relative movement                 |
| Mouse                    | Look while captured                      |
| Drag either mouse button | Orbit without capture                    |
| Wheel                    | Zoom for detail inspection               |
| Double-click world       | Capture mouse again                      |
| Shift                    | Run                                      |
| Space                    | Evade                                    |
| E                        | Rest near waystone                       |
| Escape                   | Pause/resume and release mouse           |
| F                        | Fullscreen                               |
| H                        | Control help                             |
| Backquote                | Diagnostics and opt-in CPU/GPU profiling |

Walking is 1.65 m/s and running is 4.4 m/s, matched to the new leg stride. Left mouse combat is reserved for a future milestone.

## What changed in 0.3

- Refined the original 18-joint suit toward the new kneeling-knight **design** reference: rounded closed helmet, domed overlapping pauldrons, heavier cuirass, reinforced gauntlets/greaves, stable weathered-steel shading and a long crimson cloak/tabard. Gameplay still begins standing.
- Added semantic surface tags to the HDR scene buffer. Armor gets selective silver reconstruction, dark gaps remain dark, red cloth retains its hue and grass uses thin curved glyphs. The background stays black; no ordinary 3D image is composited into the output.
- One `WindSystem` drives grass bending, cape motion, wind gain/filtering and grass rustle. Gusts propagate at 2.8 m/s with shared direction, intensity and turbulence. Audio samples the actor/listener field, accounts for distance and uses smooth automation.
- Shorter irregular grass blades bend from planted roots. World-anchored stroke choice avoids repeating vertical columns.
- Added stance-driven footstep sounds, boot impact settling and support-side weight transfer while retaining terrain IK and the rest/get-up timeline.
- Preserved gameplay, controls, audio buses, UI, rock instancing and the 55-second cinematic. The hero retains a small silver highlight through the wide pullback.

The model remains original procedural art, and animation remains contact-driven procedural work rather than authored/mocap clips. Cloth is GPU-deformed, not simulated. Those distinctions and remaining limits are described in [architecture](docs/ARCHITECTURE.md) and [visual study](docs/VISUAL_REFERENCES.md).

## Verify and build

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run preview
```

ESLint performs real code linting; Prettier checks formatting separately. GitHub Actions runs type checking, lint, format, unit tests and build on pushes/PRs. The 23 system tests include rock matrices versus colliders, GLB skin data, grass templates, temporal behavior, foot planting/clearance, rest/reverse at 30/60/144 Hz, camera continuity existing movement/interaction systems, shared wind identity/propagation and gust/audio correlation.

With dev or preview running in another terminal:

```sh
npx playwright install ffmpeg
npm run test:browser
# Test built production output instead:
TEST_URL='http://localhost:4173/?diagnostics' npm run test:browser
```

The test uses installed Google Chrome. To use downloaded Chromium, run `npx playwright install chromium ffmpeg`, then `BROWSER_CHANNEL=chromium npm run test:browser`. It drives actual inputs, captures all eight requested views, records `test-results/overhaul-motion.webm`, checks silver/red readability, predominantly black output, shared GPU/CPU wind, live audio correlation, pause/rest/return, settings/fullscreen and errors. Full PNGs, video and detailed metrics remain in ignored `test-results/`. Diagnostic snapshots are read-only and available in development or with `?diagnostics`.

`npm run build` creates `dist/` for static hosting, with relative URLs for subpaths. No backend, account, CDN, reference video or character download is required at runtime.

## Model and documentation

```sh
npm run export:knight
```

Regenerates [nameless-knight.glb](public/models/nameless-knight.glb), a Blender-compatible original bind-pose model with its 18-joint skin. The game uses the same source builder directly. Append `?knight=prototype` to view the preserved original fallback. Runtime procedural animation and cloth shader are not baked into the export.

[Architecture](docs/ARCHITECTURE.md) · [Reference comparison](docs/VISUAL_REFERENCES.md) · [Validation/captures](docs/VALIDATION.md) · [Assets/provenance](docs/ASSETS.md) · [Roadmap](docs/ROADMAP.md)

No village, combat, inventory, climbable tower, restoration sequence, helmet removal, full story or multiplayer was added. The next recommended milestone is authored character/cloth animation polish within the same hilltop scene.
