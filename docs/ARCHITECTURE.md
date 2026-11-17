# Architecture — v0.5

The Vite/TypeScript/Three.js/Web Audio game retains its menu/playing/paused/cinematic states, input system, gameplay interaction and 55-second hilltop sequence.

## Authored character

`scripts/author-knight.py` builds an original editable Blender armor scene. Separate sculpted plate surfaces receive thickness and rolled bevels, then bake into an indexed, rigidly weighted 18-joint skin. The original neutral local joint axes are written explicitly into GLB; Blender's edit-bone roll does not change runtime IK semantics. Six materials distinguish steel, edges, recessed mail, leather, brass and wool.

`prepareArmor` fetches the bundled GLB before boot. `buildArmor` reads its accessors, reconstructs the bone hierarchy and batches its six primitive groups into one SkinnedMesh. Steel wear and surface semantics are applied to the authored asset. This replaces the previous runtime procedural armor builder. The `.blend`, modeling script and exported asset are all committed.

Scarf and sword attach to named rig joints. The sword remains enclosed in a scabbard on a separate left-hip group, with belt hangers and independent sword/scabbard objects for future drawing. Its rest rotation preserves terrain clearance. There is no forearm shield.

## Full-body human locomotion

`retarget-locomotion.ts` resolves CMU ASF coordinate bases, channel rotations and hierarchy for the named subject-16 takes. Bone directions retarget full upper and lower body motion onto the armor's hanging-arm bind convention. Matched-pose cycles retain hip compression, pelvis rotation, torso counter-motion, arm coordination and foot pitch. Root-travel measurements calibrate stride distance. Raw captures are not shipped.

`LocomotionClips` interpolates all 18 joint rotations, captured ankle trajectories, hip offsets and contact classifications. Walk and run have separate human performances and calibrated cycle lengths. Curved-walking capture supplies a coordinated turning layer; separate walking/running braking takes blend during deceleration. Idle uses the settled capture pose with slight breathing. Starts are full-body crossfades under gameplay acceleration, not separate captured start takes.

`KnightAnimator` evaluates this full pose first. Stance targets lock in world space; swing targets come from the captured pose rather than a mathematical swing arc. Analytical two-bone IK corrects contact/terrain and reach, using the captured knee plane rather than the old fixed bend pole. The captured world foot orientation is retained after leg correction. Small one-foot settling steps remain procedural when stopping or turning in place. Stance entries trigger boots and a small impact response.

`CharacterController` caps heading changes at 3.5 rad/s and brakes during large direction reversals before recovering travel speed. Movement direction follows the changing body heading to reduce sideways moonwalking. Walk/run are 1.35/3.6 m/s; cadence follows actual distance divided by calibrated stride. Visual yaw follows more closely than v0.4. A restrained fatigue layer adds two degrees of walk-only forward lean, small support-side shoulder/torso shifts and damped wrist impulses triggered by actual foot contacts. It fades during stopping/rest and does not drive the legs. Source rates, contact corrections and real recorded motion are validated separately; none is a claim that numerical tests certify human realism.

The existing prepare/sit/support/recline/get-up timeline remains a terrain-aligned pose blend. It is still project-authored procedural rest motion, not CMU sitting capture.

## Cloth and contact

The legacy `Cape.ts` filename now contains two asymmetric neck-wrap layers and three unequal torn scarf ribbons. Fixed 120 Hz Verlet steps and length constraints integrate world-space shared-wind forces, flutter, drag and movement inertia. Ellipsoid proxies attached to the helmet, shoulders and thorax exclude fabric from the moving suit; terrain constrains the resting tails. Cached world/inverse matrices avoid repeated matrix construction. Four shorter belt/hip strips reuse that same solver with nine nodes, higher gravity, stronger damping and approximately one-third of the scarf wind response. Their widths follow the belt tangent; additional hip/thigh proxies and more constraint passes limit stretching during sitting. These are contact proxies, not full mesh/self-collision.

Curved tattered wool panels are part of the authored skin. Their roots follow the thighs while restrained shader bending samples the same wind field. Uneven outlines, fold geometry and layered lengths provide the silhouette before ASCII reconstruction.

## Continuous meadow

`Grass.ts` fills 729 sixteen-metre tiles over a 432 m square. Every stratified cell receives a tuft: no random patch rejection, path exclusion or intentional clearings. Near/mid/far templates use different blade counts, segment counts, spread and spacing. The far layer remains present across the complete region; detailed representations overlap it near the actor/camera. Frustum culling removes invisible objects, while distance changes representation rather than deleting all coverage.

GPU vertex bending samples the shared traveling field with a height-dependent delay, directional displacement, droop, secondary turbulence, tip flutter and local actor response. Roots remain planted. Source fans, seeded orientation and height variation create a dense continuous meadow without identical blade motion. Farther fans cover more area with fewer segments. Terrain has no exposed stone-path shading. There are no trees, lamps, point-light flames or corresponding obstacles; rocks and the existing tower remain.

## ASCII rendering

The scene still renders into half-float color/depth, followed by temporal reconstruction and a glyph-only final pass on black. No ordinary 3D image, reference texture or prerecorded motion is composited into the result.

The atlas contains eight measured tone bands with six comparable-coverage variants, plus directional/curved strokes. Bind-space semantic alpha carries stable armor variant information; cloth retains crimson and grass selects thin bent strokes. Staggered glyph baselines reduce uniform horizontal rows without adding glyphs per cell. Depth normals, luminance edges, selective armor mapping, camera reprojection, deadband and disocclusion rejection remain. Animated-object motion vectors are not available, so fine moving details can still alias.

## Wind, sound, camera and recording

One `WindSystem` owns the spatial field, time and uniform objects. GPU grass and wool, CPU scarf and Web Audio sample it. Traveling gusts, drift and turbulence therefore control visible bending together with wind/rustle gain and filters. Wind and rustle gain targets are reduced to roughly one-quarter/one-third of their previous levels, with softer filtering. Grass adds low-frequency recovery sway and patch-dependent phase/stiffness under the same field. Audio retains the original buses and procedural sound sources. Simulation time freezes on pause.

The camera follows more closely while retaining orbit, wheel zoom, obstacle avoidance and the original 55-second spline. Backquote enables optional asynchronous GPU/CPU profiling. Grass GPU samples are diagnostic subsets of scene cost.

With `?diagnostics`, the capture hook combines `canvas.captureStream(60)` with a MediaStream destination connected to the live master bus. `record-preview.mjs` records real input-driven gameplay and audio through MediaRecorder. Exported cuts retain original speed, and actual frame statistics are inspected rather than manufacturing 60 FPS through interpolation. Raw captures stay ignored.
