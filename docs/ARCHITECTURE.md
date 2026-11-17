# Architecture — v0.6

The Vite/TypeScript/Three.js/Web Audio game retains its menu/playing/paused/cinematic states, input system, gameplay interaction and 55-second hilltop sequence.

## Supplied character and comparison

The default knight loads `public/models/imported-knight/knight.glb` through GLTFLoader. `scripts/import-knight.py` preserves the supplied skeleton/weights, connects five PBR source maps, removes separate weapons and whole embedded scabbard components, and adds a rigid shoulder hinge/bevel. Editable Blender source includes packed textures. The original v0.5 mesh remains selectable through `?compare` or `?knight=authored`.

`KnightAnimator` continues to drive the canonical 18-joint rig. Its original skin is hidden for the supplied appearance. `ImportedAvatar` maps anatomical world directions onto native bind axes, preserves local wrist articulation and solves native leg reach against shared targets. Pelvis/ankle calibration accounts for shorter legs and the lower boot socket. Native boot samples constrain toe/heel clearance under captured foot pitch. Both assets load locally; the retained original asset supplies canonical rig metadata and the comparison mesh.

Fourteen supplied cape/skirt/mail bones use fixed 120 Hz weighted hinges with shared wind, movement inertia, gravity, a restrained angular envelope and body/leg/terrain proxies. The added shoulder hinge and existing belt bone use small damped rigid rotations. The original scarf solver remains attached to the canonical neck/shoulder frame and continues throughout cinematics. Skin bones rotate rigid metal groups; the whole armor suit is not given cloth deformation.

## v0.6 motion and reconstruction repairs

The diagnosis found independent problems: binary anchor release, walk/run contact switching, unstable toe-derived ankle orientation, incomplete loop-channel closure, near-straight knee-plane ambiguity and overly permissive ASCII depth history.

Contact confidence interpolates across neighboring capture samples and walk/run blends. Hysteresis prevents chatter. Planting eases into a fixed anchor over 65 ms; release carries the previous correction and removes it over 140 ms with zero-slope endpoints. The moving ankle path remains captured human motion. Pelvis reach evaluates both legs continuously; projected knee confidence resolves near-straight ambiguity. Exact spring integration removes render-step dependence from impact/wrist response. Idle settling also retains transition continuity.

The capture conversion uses ankle-to-ball direction instead of unreliable toe extensions and subtracts the native foot segment's rest pitch. It closes ankle/pelvis channels and quaternion seams, then calibrates full-cycle root travel. Raw CMU data remains outside Git.

ASCII history is half-float. Reprojection compensates hero root motion and compares expected previous-view depth, with stricter hero rejection. Armor families use bind coordinates; moving hero edge classification no longer freezes against stale background history. Shaded review bypasses ASCII without changing the character, controller or world. Its opaque tone-mapped display pass keeps semantic alpha inside the HDR target, preventing canvas capture from incorrectly unpremultiplying surface tags.

## v0.6 sampled foley

`GrassFoley` decodes fourteen bundled CC0 OGG files after user audio unlock. Grass, soft impacts, dry friction and quiet armor layers use varied samples, rates, gains and stereo positions. The animator's grounded contact events trigger steps; movement distance triggers low-level vegetation brushing. Grass sample tails crossfade into a loop for the existing WindSystem-controlled rustle bus. Ambient wind and foot movement retain separate buses. Missing sample files remain visible in diagnostics; no synthetic footstep substitute is presented as production foley.

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
