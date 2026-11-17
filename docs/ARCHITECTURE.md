# Architecture — visual overhaul (0.2)

The Vite/TypeScript/Three.js/Web Audio application retains its original gameplay, audio buses, UI and menu/playing/paused/cinematic state machine. The changes concentrate on the first hilltop scene. No story expansion or networking was added.

## Rendering

`rendering/AsciiRenderer.ts` renders actual 3D geometry to a half-float linear HDR color target and depth texture. It deliberately uses no display tone mapping before reconstruction. Black scene background, black fog, low hemisphere fill, a white directional key and restrained silver rim light replace the prior colored sky. Terrain is nearly black; illumination is concentrated visually on armor and blade silhouettes. A distance-scaled fog extinction keeps the hill readable during the long pullback while distant landscape recedes into black.

A character-resolution pass reconstructs each cell from nine spatial samples. A small peak contribution retains thin blades. Contrast uses an exponential shoulder **without** a sublinear power that brightens dark geometry. Values below the black threshold remain zero.

`GlyphAtlas.ts` measures pixel coverage of candidate printable ASCII characters, sorts it, and chooses a 24-level density ramp. Tonal glyphs use a heavier weight for armor highlights; the four oriented outline glyphs that follow remain thin for grass. Four spare marks complete the 32-column atlas. The grid is fixed in screen space; the default is approximately 360 × 140 at 1440 × 900. Density and scene render scale remain independent settings.

View-space positions reconstructed from depth provide surface normals. Color gradients select tangent-oriented outlines (`- / | \\`). The normals provide restrained shape emphasis rather than another visible layer. No extra normal render pass is needed.

History uses camera reprojection: current depth reconstructs a world position, then the previous view-projection matrix locates its history sample. Depth mismatch, large luminance change, offscreen samples or large motion reject history. Accepted samples use delta-time filtering, a small deadband and stable edge classification. This is not full motion-vector TAA: animated armor and wind-driven blades can still reject history and alias at small scales.

The final full-screen quad emits **glyph coverage only on true black**. No original color image is composited over or underneath it. World geometry, sky absence, shadows, particles and every cinematic frame pass through the same renderer.

## Character model

`character/model/buildArmor.ts` and `armorGeometry.ts` author an original adult-proportioned Gothic plate harness using shaped cross-sections, sculpted front keels, raised flutes, curved seams, rivets and rolled edges. It includes a bascinet with projecting visor and real sight gap, fitted cuirass, overlapping fauld, thigh-following tassets, scalloped pauldrons, winged couters/poleyns, tapered cuisses/greaves, articulated finger plates/sabatons, linked mail, compact shield and detailed longsword. Mail links are geometry, not a flat texture.

The assembler bakes geometry into bind space, supplies rigid skin weights to 18 real Bone joints, indexes shared vertices and batches the suit into one SkinnedMesh with five material groups. The approximately 105,000 triangles require five armor draw calls rather than one call per plate or mail ring. Rigid weighting suits metal plates; this is not a flesh deformation rig.

`Cape.ts` adds a pleated shoulder mantle and narrow split cloth panels on the thighs. Wind deformation runs in the vertex shader. Cloth has authored folds and a resting flattening blend, but no physical cloth solver or collision simulation.

`npm run export:knight` exports the original bind-pose suit and skeleton to `public/models/nameless-knight.glb` (approximately 3.3 MiB) for Blender and future asset work. The runtime uses the same source geometry builder so a missing download never blocks the scene. Blender import has verified one armature with 18 bones. The export contains geometry/skin/materials, **not authored animation clips or the runtime cloth shader**.

The initial procedural knight is preserved as `PrototypeKnight.ts`; append `?knight=prototype` to inspect the fallback.

## Animation and contact constraints

`animation/KnightAnimator.ts` separates pose evaluation from model construction. Gait phase advances by measured travel distance divided by stride length. Walking and running blend between different stride lengths, stance fractions, foot lifts, flight intervals, pelvis bounce, forward lean and elbow poses. Walking is 1.65 m/s; running is 4.4 m/s. These speeds give human-sized legs a plausible stride instead of trying to walk at the original 2.9 m/s.

Each foot has a world-space anchor during stance and a quintic-eased swing arc toward a predicted landing position. Landing prediction accounts for a crossed phase boundary, reducing frame-rate dependence. Analytical two-bone IK solves each thigh and shin against the terrain-adjusted ankle target. Pelvis height adjusts to stance reach, and sabatons add heel/toe motion. Small idle/turn correction steps lift and replant one foot at a time. Torso counter-rotation, angular-velocity twist, head stabilization and restrained breathing supplement the contact-driven pose.

Rest is a ten-second pose timeline: prepare, staggered foot repositioning, bent-knee descent, supporting wrist, seated settling, lumbar/chest recline and relaxed breathing. The pelvis does not rotate ninety degrees as a single rigid body. A terrain-aligned resting frame supports the entire suit, and thigh-weighted tassets avoid hanging through the ground. Initial foot positions blend into the rest trajectory; locomotion layers fade out. Returning reverses this timeline before movement unlocks.

This is a contact-driven procedural animation system, not mocap or AnimationMixer clips. It is substantially more constrained than the prototype, but it is not a claim of production cinematic human animation. Tight pivots, aggressive reversal and extreme slopes remain areas for further animation work.

## World and camera

`world/Grass.ts` builds five curved tuft templates, each with differently sized, tapered and bent blades. Tufts grow around patch centers under a low-frequency coverage field, leaving banks, sparse patches and clearings. Near tiles use richer templates; outer tiles use three-blade versions. Tiles have bounded, camera-distance visibility, with the actor's nearby grass retained for the wide cinematic.

The GPU wind field has a prevailing wave, a traveling gust envelope and secondary spatial turbulence. Force is transformed from world direction into each instance's basis, so rotated tufts bend under the same wind. Quadratic height weighting keeps bases planted. A small radial response parts nearby grass around the knight. Static normals approximate the small deformation; there is no per-blade physics.

`rockPlacement.ts` populates both visible instance matrices and obstacle footprints from the same transform. The pre-overhaul checkout already contained the reported matrix assignment; the refactoring preserves it, marks the GPU buffer dirty, computes bounds and adds a regression test for every instance.

`CameraController.ts` retains terrain/obstacle avoidance and exponential follow. Follow distance and field of view ease with movement speed. Wheel zoom permits close inspection, while drag/pointer-lock controls remain intact. Character visual yaw eases independently rather than snapping from the title pose into gameplay.

`CinematicSystem.ts` retains data-driven spline keys and a 55-second timeline. Revised shots favor a low side view and black negative space. The current gameplay camera eases into the track. Camera and pose timelines freeze together on pause. The player can return at any point; getting up completes before exploration resumes.

## Performance and validation

Backquote toggles diagnostics and opt-in profiling. CPU measurements distinguish animation, camera, scene submission and ASCII submission. `GpuProfiler.ts` uses asynchronous `EXT_disjoint_timer_query_webgl2` queries for scene and ASCII GPU time. Every 120 profiled frames, an isolated grass pass measures grass cost. Unsupported or disjoint GPU queries report `n/a`, never CPU time disguised as GPU time. Profiling is off during normal play.

Strict TypeScript, ESLint, Prettier, system/contact/asset tests and production builds run through npm scripts. GitHub Actions runs type checking, real lint, format checking, unit tests and the build on pushes and pull requests. The local Playwright test runs the actual production UI/inputs, records motion video, takes eight requested visual captures, checks black-space coverage and watches runtime errors. See VALIDATION.md for measured results and limits.

Existing modules retain their roles: Input, InteractionSystem, QuestProgression, AudioManager, UI, AssetLoader and configuration. Analytic height-field/circle physics remains appropriate for this single terrain scene; Rapier, buildings and combat remain out of scope.

API references: [SkinnedMesh](https://threejs.org/docs/pages/SkinnedMesh.html), [GLTFExporter](https://threejs.org/docs/pages/GLTFExporter.html), [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html).
