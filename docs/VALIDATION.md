# Validation

Validated on 17 November 2026 with installed Google Chrome on macOS, Node.js 26.8.1 and the production Vite preview at 1440 × 900. Run the commands in README to reproduce them. Browser screenshots and machine-readable results are generated in ignored `test-results/`, never from supplied reference media.

The automated browser smoke test exercises menu, settings, credits, pointer lock, audio context unlock, walking, running, stopping, proximity interaction, sitting, lying, pause/resume, the wide cinematic, getting up, evade, drag camera, fullscreen, viewport resizing and saved preferences. It watches console/page errors. It tests real inputs and reads engine state without teleporting or advancing the timeline artificially.

This does not establish performance across all GPUs, subjective audio quality, perfect camera clearance around every object, or final animation/art quality. Desktop browser and keyboard/mouse are the supported target. There is no claim of complete five-chapter story coverage.

## Recorded results

- `npm run typecheck`: passed (also included in production build).
- `npm run lint`: passed; all source, test and documentation files conform to Prettier.
- `npm test`: 7 tests passed, 0 failed.
- `npm run build`: passed. Application JavaScript is approximately 40 kB, with a separate Three.js engine chunk approximately 529 kB (138 kB gzip). Vite emits a non-blocking advisory for that engine chunk exceeding its default 500 kB threshold.
- `TEST_URL=http://localhost:4173/?diagnostics npm run test:browser`: passed against the production build, with zero page/console errors.
- Full 55-second cinematic completed; sitting/lying state, terrain clearance, pause freeze, closing quote, return to standing and subsequent movement verified.
- Browser audio context was running, with measured nonzero output RMS. Close breathing gain measured 0.0168, falling to 0.0016 in the wide shot; wind gain rose from 0.100 to 0.175. This validates the graph/automation, not subjective sound quality.
- Walking reached approximately 2.9 m/s, running exceeded 5 m/s; deceleration, proximity interaction and dodge displacement passed assertions.
- Pointer lock, drag orbit and fullscreen passed real browser checks.
- Menu resized without horizontal overflow at widths 1440, 1024, 768 and 390. Settings survived reload. Gameplay remains desktop keyboard/mouse only.
- Initial balanced scene measured approximately 58–60 FPS on the development machine. Production cinematic measured 60 FPS at fine density / performance scene scale. These measurements are machine-specific, not a cross-hardware guarantee.
- `npm audit --omit=dev`: 0 vulnerabilities at validation time.
- Source reference files, extracted frames, dependencies, build output and temporary test artifacts are excluded from Git.

Representative original game captures: [title](screenshots/title.webp), [resting](screenshots/resting.webp), [panorama](screenshots/panorama.webp). Temporary full-resolution PNGs and detailed browser metrics are in ignored `test-results/` after the smoke test.
