# v0.7 acceptance and evidence

Implementation and validation evidence is recorded in [validation](VALIDATION.md), [machine-readable measurements](validation/v07-summary.json), [reference study](VISUAL_REFERENCES.md) and [matched recordings](previews/README.md).

- [x] Inspect primary knight video/image and high-density ASCII references directly.
- [x] Evaluate orthographic and weak-perspective composition; validate the selected default visually.
- [x] Side/three-quarter framing, consistent scale, controlled follow/look-ahead, stable slope framing and restricted orbit.
- [x] Intuitive screen-horizontal movement, shallow depth corridor, preserved speeds/collision/interactions and natural reversals.
- [x] Distinct foreground/middle/background geometry, understated parallax, continuous grass and mostly black background.
- [x] Distributed pelvis/spine/chest/head/shoulder posture; no root tipping, accumulation or retarget overwrite.
- [x] Continuous idle/walk/run/turn/sit/lie posture weights and retained captured human gait.
- [x] Stable contacts, ankle alignment, knee planes and native terrain support at 30/60/144 Hz.
- [x] Scarf, fourteen native garment bones and restrained rigid armor response survive the posture change.
- [x] Correct projection reconstruction, temporal reprojection and history invalidation in both camera types.
- [x] Fine grass strokes, silver armor hierarchy, dark gaps, controlled crimson and no conventional 3D overlay.
- [x] Natural local grass contact around legs and the reclining body without a clearing.
- [x] Full 55-second widening cinematic, legible reclining silhouette, landscape/tower reveal and smooth return.
- [x] Sampled contact-driven footsteps, brushing, wind/rustle, breathing/bells and restrained stereo remain functional.
- [x] Legacy camera, neutral posture and shaded/ASCII modes are independently selectable.
- [x] Matched A/B world route includes idle, walk, run, stop, turn, sit, recline and pullback.
- [x] Final recordings are compressed, include actual game audio, preserve timing and can be compared side by side.
- [x] Typecheck, lint, formatting, unit/system tests, production build and browser validation pass.
- [x] Viewport resizing, pause/resume, collision, input and cinematic transitions pass.
- [x] Frame pacing includes percentiles/outliers; significant spikes are investigated rather than hidden by average FPS.
- [x] Final screenshots, reference study, architecture, provenance and README reflect the shipped behavior.
- [x] No original reference media enters Git; existing model/audio permissions remain intact.
      Delivery: commit and non-force push `main` after the final staged-file and format/build gates. The final response records the remote SHA and CI result.

Non-goals: new chapters, enemies, inventory, multiplayer, painted backgrounds, prerecorded character animation imagery or replacing the existing engine.
