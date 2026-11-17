# Architecture — visual fidelity and shared wind (0.4)

The Vite/TypeScript/Three.js/Web Audio application retains its original gameplay, audio buses, UI and menu/playing/paused/cinematic state machine. The changes concentrate on the first hilltop scene. No story expansion or networking was added.

## Rendering

`rendering/AsciiRenderer.ts` renders actual 3D geometry to a half-float linear HDR color target and depth texture. It deliberately uses no display tone mapping before reconstruction. Black scene background, black fog, low hemisphere fill, a white directional key and restrained silver rim light replace the prior colored sky. Terrain is nearly black; illumination is concentrated visually on armor and blade silhouettes. A distance-scaled fog extinction keeps the hill readable during the long pullback while distant landscape recedes into black.

A character-resolution pass reconstructs each cell from nine spatial samples. A small peak contribution retains thin blades. Background contrast uses an exponential shoulder with a true black cutoff. `SurfaceStyle.ts` tags armor, cloth, grass and lantern flames in the offscreen alpha channel. Armor uses a selective rational highlight shoulder, cloth preserves red chroma, and grass receives thinner curved strokes. This replaces the globally faint v0.2 reconstruction without lifting dark scenery. Visor/plate gaps below the cutoff remain black. The hero materials are exempt from environmental fog, preserving a small silver figure in the wide shot; terrain and distant objects still fade into black.

`GlyphAtlas.ts` measures pixel coverage of candidate printable ASCII characters, sorts it, and chooses a 24-level density ramp. Larger tonal glyphs fill more of each cell for readable armor; eight thinner directional/curved marks complete the 32-column atlas. The grid is fixed in screen space; the default is approximately 360 × 140 at 1440 × 900. Density and scene render scale remain independent settings.

View-space positions reconstructed from depth provide surface normals. Color gradients select tangent-oriented outlines (`- / | \\`). The normals provide restrained shape emphasis rather than another visible layer. No extra normal render pass is needed.

History uses camera reprojection: current depth reconstructs a world position, then the previous view-projection matrix locates its history sample. Depth mismatch, large luminance change, offscreen samples or large motion or a changed surface class reject history. Accepted samples use delta-time filtering, a small deadband and stable edge classification. This is not full motion-vector TAA: animated armor and wind-driven blades can still reject history and alias at small scales.

The final full-screen quad emits **glyph coverage only on true black**. No original color image is composited over or underneath it. World geometry, sky absence, shadows, particles and every cinematic frame pass through the same renderer.

## Character model

`character/model/buildArmor.ts` and `armorGeometry.ts` author an original adult-proportioned Gothic plate harness using shaped cross-sections, sculpted front keels, raised flutes, curved seams, rivets and rolled edges. It includes a rounded closed helmet with dark sight gap, fitted cuirass, overlapping fauld, thigh-following tassets, domed overlapping shoulder lames, winged couters/poleyns, tapered cuisses/greaves, articulated finger plates/sabatons, linked mail, compact shield and detailed longsword. Mail links are geometry, not a flat texture.

The assembler bakes geometry into bind space, supplies rigid skin weights to 18 real Bone joints, indexes shared vertices and batches the suit into one SkinnedMesh with five material groups. The approximately 108,000 armor triangles require five armor draw calls rather than one call per plate or mail ring. Rigid weighting suits metal plates; this is not a flesh deformation rig.

`Cape.ts` retains its legacy name but now builds a neck wrap and three unequal, narrow, tapered crimson ribbons. Fixed 120 Hz Verlet integration, seven length-constraint passes, torso exclusion and terrain contact give the tails inertia and movement-driven trailing. Wind force and lift sample the shared CPU field at each node. A field-strength-scaled convected flutter term adds secondary ripples. Serrated edges, uneven strip lengths and twisting cross sections expose the armor instead of covering its back.

`SheathedSword.ts` attaches a separate sword and leather scabbard to a left-hip suspension group. Grip, guard, pommel, enclosed blade, metal chape and belt hangers are geometry. The mount follows pelvis movement, then rotates into a ground-clear position during sitting. Sword and scabbard remain separate objects for a future draw system; combat/drawing controls are not implemented.

`npm run export:knight` exports the original bind-pose suit and skeleton to `public/models/nameless-knight.glb` (approximately 3.5 MiB) for Blender and future asset work. The runtime uses the same source geometry builder so a missing download never blocks the scene. Blender import has verified one armature with 18 bones. The export contains geometry/skin/materials, **not runtime animation curves or the cloth solver**.

The initial procedural knight is preserved as `PrototypeKnight.ts`; append `?knight=prototype` to inspect the fallback.

## Animation and contact constraints

`animation/KnightAnimator.ts` separates pose evaluation from model construction. Gait phase advances by measured travel distance divided by stride length. Walking and running blend between different stride lengths, stance fractions, foot lifts, flight intervals, pelvis bounce, forward lean and elbow poses. Walking is 1.65 m/s; running is 4.4 m/s. These speeds give human-sized legs a plausible stride instead of trying to walk at the original 2.9 m/s.

`LocomotionClips.ts` evaluates phase-aligned KayKit CC0 idle/walk/run curves, adapted offline by `scripts/retarget-locomotion.ts`. Quaternion interpolation blends free arm swing, elbows, lumbar/chest counter-motion and hip compression. Source facing and T-pose axes are converted to the original rig; stylized carried-arm offsets are removed. The clips supply upper-body motion and vertical hip timing. Project-authored lean, inertial start/stop posture, turn banking, support transfer and head stabilization supplement them.

Each foot has a world-space anchor during stance and a cubic-eased swing arc toward a predicted landing position. Landing prediction accounts for a crossed phase boundary, reducing frame-rate dependence. Analytical two-bone IK solves each thigh and shin against the terrain-adjusted ankle target. Pelvis height adjusts to stance reach, and sabatons add heel/toe motion. Small idle/turn correction steps lift and replant one foot at a time. Stance-entry events now trigger footstep audio; a damped impact response and support-side pelvis shift add weight instead of using an unrelated sound timer. Torso counter-rotation, angular-velocity twist, head stabilization and restrained breathing supplement the contact-driven pose.

Rest is a ten-second pose timeline: prepare, staggered foot repositioning, bent-knee descent, supporting wrist, seated settling, lumbar/chest recline and relaxed breathing. The pelvis does not rotate ninety degrees as a single rigid body. A terrain-aligned resting frame supports the entire suit, and thigh-weighted tassets avoid hanging through the ground. Initial foot positions blend into the rest trajectory; locomotion layers fade out. Returning reverses this timeline before movement unlocks.

This is a hybrid of retargeted authored curves and procedural contact/IK, not human mocap or a commissioned animation performance. Tight pivots, aggressive reversal and extreme slopes remain areas for further animation work.

## World and camera

`world/Grass.ts` builds five curved tuft templates, each with differently sized, tapered and bent blades. Tufts grow around patch centers under a low-frequency coverage field, leaving banks, sparse patches and clearings. Near tiles use richer templates; outer tiles use four-blade versions. Tiles have bounded, camera-distance visibility, with the actor's nearby grass retained for the wide cinematic.

### One wind field for graphics and sound

`environment/WindSystem.ts` owns time, normalized direction, intensity, gust strength, turbulence and propagation speed. Its deterministic traveling front uses `phase = (dot(position, direction) - time * speed) / 8.5`; gust strength is the fifth power of the normalized sine front. Secondary crosswind turbulence is spatially coherent. The default front travels at 2.8 m/s. Time advances once per simulation frame and freezes on pause/settings.

The TypeScript sampler drives sound. The corresponding shared GLSL sampler is injected into grass using the same field parameters. The scarf samples the CPU field directly, just like audio. Shared instance identity and CPU/GPU parity are tested. Grass force is transformed into each instance's local basis, with height-weighted bending and droop that leave roots planted. Scarf nodes integrate world-space forces and movement inertia, then convert back into chest-local geometry. The same world-space gust reaches neighboring clumps in sequence.

Wind and rustle audio use actor/listener field samples, focus distance and camera-relative wind direction. Field strength/gusts drive gain and filter cutoff; nearby rustle attenuates during pullback. Web Audio target automation smooths those values over 75–100 ms. Filtered procedural noise is only a carrier: there is no independent random/sine wind envelope. Breathing, birds, bells and other buses retain their separate roles. Grass remains an efficient vertex approximation; scarf uses a small constrained particle model, not a full aerodynamic cloth solver.

`LampPosts.ts` batches fifteen sparse iron posts/cages along paths and ridges. Small amber flame meshes have an explicit semantic tag, a hue guard against interpolated alpha edges, and deterministic low-amplitude flicker. Four nearest warm point lights provide short-range local illumination without shadow maps; distant flames remain self-lit.

`rockPlacement.ts` populates both visible instance matrices and obstacle footprints from the same transform. The pre-overhaul checkout already contained the reported matrix assignment; the refactoring preserves it, marks the GPU buffer dirty, computes bounds and adds a regression test for every instance.

`CameraController.ts` retains terrain/obstacle avoidance and exponential follow. Follow distance and field of view ease with movement speed. Wheel zoom permits close inspection, while drag/pointer-lock controls remain intact. Character visual yaw eases independently rather than snapping from the title pose into gameplay.

`CinematicSystem.ts` retains data-driven spline keys and a 55-second timeline. Revised shots favor a low side view and black negative space. The current gameplay camera eases into the track. Camera and pose timelines freeze together on pause. The player can return at any point; getting up completes before exploration resumes.

## Performance and validation

Backquote toggles diagnostics and opt-in profiling. CPU measurements distinguish animation, camera, scene submission and ASCII submission. `GpuProfiler.ts` uses asynchronous `EXT_disjoint_timer_query_webgl2` queries for scene and ASCII GPU time. Every 120 profiled frames, an isolated grass pass measures grass cost. Unsupported or disjoint GPU queries report `n/a`, never CPU time disguised as GPU time. Profiling is off during normal play.

Strict TypeScript, ESLint, Prettier, system/contact/asset tests and production builds run through npm scripts. GitHub Actions runs type checking, real lint, format checking, unit tests and the build on pushes and pull requests. The local Playwright test runs the actual production UI/inputs, records motion video, takes the eleven requested visual captures, checks black-space coverage and watches runtime errors. See VALIDATION.md for measured results and limits.

Existing modules retain their roles: Input, InteractionSystem, QuestProgression, AudioManager, UI, AssetLoader and configuration. Analytic height-field/circle physics remains appropriate for this single terrain scene; Rapier, buildings and combat remain out of scope.

API references: [SkinnedMesh](https://threejs.org/docs/pages/SkinnedMesh.html), [GLTFExporter](https://threejs.org/docs/pages/GLTFExporter.html), [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html).
