# The Last Bell

_A world waiting to be heard._

A playable third-person fantasy landscape reconstructed entirely from ASCII characters on the GPU. Prelude 01 implements **The Knight on the Hill**: exploration, an original articulated knight, environmental sound, and a continuous real-time resting cinematic. It is the first vertical slice, not the complete five-chapter RPG.

![The Last Bell title screen, rendered from the live 3D ASCII world](docs/screenshots/title.webp)

## Play locally

Requires Node.js 22.12+ and a current desktop browser with WebGL2 and hardware acceleration.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (usually **http://localhost:5173**), then select **Begin Journey**. This click also unlocks browser audio. A mouse and keyboard are required for gameplay; the menu and settings adapt to smaller screens.

Walk forward along the ridge toward the small ring-marked waystone, roughly 10 metres from your starting position. When **Press E to Rest** appears, press E. The knight sits, lies back and breathes while a 55-second camera sequence reveals the landscape. Select **Return to the fields** at any time; the knight smoothly stands before movement resumes. Escape pauses the sequence.

## Controls

| Control                       | Action                                  |
| ----------------------------- | --------------------------------------- |
| WASD                          | Move relative to the camera             |
| Mouse                         | Look while pointer is captured          |
| Drag with either mouse button | Orbit without pointer lock              |
| Double-click world            | Capture mouse again                     |
| Shift                         | Run                                     |
| Space                         | Evade, with a short cooldown            |
| E                             | Rest near the hilltop waystone          |
| Escape                        | Pause/resume; release mouse capture     |
| F                             | Toggle fullscreen                       |
| H                             | Show/hide controls                      |
| Backquote (`)                 | FPS, frame time, draw calls, ASCII grid |

Left mouse attacks are reserved for the future combat milestone. Combat is **not** implemented in this build.

## Included

- An actual 3D world: rolling terrain, mountain silhouettes, valley, rocks, fir trees, a ruined bell tower and a hilltop waystone.
- An original 3D knight with helmet, visor, layered plate armor, chainmail-colored joints, boots, sword, shield, cloth cape and brass keepsake bell. Hierarchical Bone joints drive smooth procedural animation; no sprite frames or reference assets.
- Accelerated movement, camera-relative steering, walking/running blends, idle breathing, turning, evade motion, terrain following and obstacle collision.
- GPU glyph atlas, depth-aware silhouette emphasis, fixed character grid and filtered/hysteretic luminance. Everything visible in the world passes through the ASCII pipeline, including sky, shadows and cinematics.
- 28,000 instanced wind-animated grass blades, instanced trees/rocks, moving atmospheric motes, twilight lighting and fog.
- Sitting, lying, continuous cinematic camera pullback, breathing, closing quotation and a smooth return to exploration.
- Procedural wind, birds, footsteps on grass/stone, armor ticks, breathing, spatial distant bells and a sparse original musical drone. Independent master, ambience, music, effects and cinematic buses.
- Menu, pause, credits, control help, saved settings, audio levels, density, render scale, sensitivity, fullscreen and optional diagnostics.
- Self-contained runtime: bundled fonts and original geometry/audio; no third-party CDN or downloaded character required.

## Verify and build

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

`npm run lint` checks formatting with Prettier; TypeScript strict checking is the code correctness check. The unit tests cover frame-rate independence, terrain/collision, controller behavior, cinematic safety, seeded generation and interaction selection.

With the development server running in another terminal:

```sh
npm run test:browser
```

The browser test uses installed Google Chrome via Playwright. Alternatively install a Playwright browser with `npx playwright install chromium`, then run `BROWSER_CHANNEL=chromium npm run test:browser`. The test drives the actual UI and keyboard, checks movement and rest without teleporting, runs the cinematic, checks fullscreen and graphics settings, and captures screenshots to ignored `test-results/`. Set `TEST_URL=http://localhost:4173/?diagnostics` to test the production preview. Diagnostic state is read-only and available in development or with `?diagnostics`.

`npm run build` produces `dist/` for static hosting. Relative build URLs support deployment below a subpath. No server, database, multiplayer service or account is required.

## Scope and next milestone

This is a procedural art foundation. Armor and landscapes need further art direction and broader hardware testing; procedural sound is usable placeholder audio. The third-person camera avoids terrain and local obstacles, but the cinematic is authored for the hilltop area. There is no game save, gamepad/touch movement, combat, inventory, village, memories, climbable tower, restoration sequence, helmet removal or complete 10-minute story yet.

The recommended next milestone is **The Forgotten Village**: a licensed rigged production character with blended animation clips, authored village traversal, and the toy-horse memory interaction, after another animation/visual polish pass on this slice.

See [architecture](docs/ARCHITECTURE.md), [visual reference study](docs/VISUAL_REFERENCES.md), [roadmap](docs/ROADMAP.md), [asset credits](docs/ASSETS.md) and [validation notes](docs/VALIDATION.md).
