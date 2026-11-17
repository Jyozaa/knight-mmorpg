# Validation — 0.2 visual and animation overhaul

Validated locally with Google Chrome on macOS, Node.js 26.8.1, and the built production game served by Vite preview at 1440 × 900. Reference study preceded changes. Source assets, generated geometry, static frames and a recorded browser session were reviewed; successful compilation alone was not the finish criterion.

## Checks

- Strict TypeScript: passed.
- ESLint (real code linting): passed. Prettier format checking is separate and passed.
- Unit/system suite: **17 passed, 0 failed**.
- Production build: passed. The application chunk is approximately 73 kB (26 kB gzip); the separate Three.js chunk is approximately 538 kB (141 kB gzip). Vite reports its non-blocking default 500 kB chunk advisory for the engine.
- Production Playwright test: passed, **0 page/console errors**. It uses actual menu, mouse, wheel and keyboard inputs, with no teleport API or artificial timeline acceleration.
- Browser audio produces measured nonzero output. Existing buses and cinematic breathing/wind transitions pass assertions.
- Full 55-second rest cinematic, pause/resume, reversible get-up, subsequent movement and evade pass. Fullscreen, pointer lock, drag orbit, persisted settings and viewport changes also pass.
- The original rigged GLB imports into Blender as one armature with 18 bones. Export/skin/material regression checks pass.
- `npm install --package-lock-only` audit: 0 vulnerabilities at validation time.
- GitHub Actions is configured to run type checking, ESLint, format checking, tests and production build on pushes and pull requests.

## Contact and animation evidence

Walking stance targets remain fixed in world space. On the tested forward slope, maximum stance target slip was zero, and actual solved ankle error was below numerical floating-point tolerance. Running includes a different stance fraction and flight intervals; it is not just a faster version of the walk.

The complete rest/reverse trajectory was sampled at 30, 60 and 144 Hz. Largest pelvis displacement per frame was respectively 11.9 mm, 5.95 mm and 2.48 mm. Tested ankle/knee/head centers remained above terrain. Sampled resting armor surfaces had approximately 3.7 mm minimum terrain clearance; forward walking/idle surface samples had approximately 3 mm worst penetration, inside the 25 mm test tolerance and below grass scale. These are measurements on the covered route/pose, not a guarantee for every possible slope, pivot or collision.

The clearance checks exposed waist plates intersecting the ground and residual gait offsets leaking into the rest pose. Tassets now follow the thighs, and locomotion layers blend out of the rest pose. Sword carry was also adjusted to keep its tip above the tested terrain.

Motion recording: `test-results/overhaul-motion.webm` (generated and ignored by Git). Representative successive frames were extracted locally to review alternating feet, start/run changes, descent/support and spine recline. Continuous interpolation and high FPS alone are not treated as proof of realistic animation.

## Performance measurements

The production smoke run measured 60 FPS during walking, running and the wide cinematic at fine density (approximately 503 × 196 glyph cells) and 0.5 scene scale. An earlier balanced scene also measured approximately 60 FPS on this development machine. No adaptive quality reduction was used to obtain those results.

Opt-in asynchronous GPU queries distinguish GPU work from CPU command submission. The recorded wide-shot sample measured roughly **1.13 ms scene GPU**, **0.53 ms ASCII GPU**, and **0.78 ms isolated grass GPU**. Grass is part of the scene cost and must not be added to it again. CPU samples were about 0.019 ms character animation, 0.017 ms camera, 0.40 ms scene submission and 0.10 ms isolated grass submission. Individual submission measurements can quantize to zero at browser timer resolution. These are samples, not statistically controlled benchmarks or universal hardware guarantees.

The standing-frame pixel mask was approximately 96.4% near-black in the measured world region. Approximately 1.03% of full-frame pixels changed by more than 35/255 between nearby captures. Black percentage and a whole-frame change metric are coarse regression guards; they do not establish silhouette quality or motion-vector correctness. Manual frame/motion review remains necessary.

Exact machine-readable values from the latest run are saved in ignored `test-results/browser-results.json`.

## Captures reviewed

All images below come from the live game and pass through the same ASCII reconstruction, including cinematic frames. No reference image or prerecorded scene is used in the renderer.

| Required view     | Capture                                           |
| ----------------- | ------------------------------------------------- |
| Standing in grass | [Standing](screenshots/standing.webp)             |
| Walking           | [Walking](screenshots/walking.webp)               |
| Running           | [Running](screenshots/running.webp)               |
| Knight close-up   | [Close portrait](screenshots/knight-closeup.webp) |
| Grass close-up    | [Grass](screenshots/grass-closeup.webp)           |
| Sitting           | [Seated](screenshots/sitting.webp)                |
| Lying             | [Resting](screenshots/resting.webp)               |
| Wide pullback     | [Panorama](screenshots/panorama.webp)             |

## Remaining limits

This is a much more detailed original procedural suit and contact-driven animation system, not a commissioned production character or motion-captured performance. Tight turns, backward evasions, extreme terrain and hand/weapon contact deserve more work. Cloth uses shader deformation without physical contact. Fine grass still aliases into strokes at long distances; camera reprojection lacks per-object motion vectors. The scene is intentionally very dark, and visual evaluation remains display-dependent. Broader GPU/browser testing is still needed. No later story chapters, combat, inventory, networking or mobile gameplay were added.
