# Visual reference study

Inspected locally before implementation on 17 November 2026. Reference originals are excluded from Git and from the game bundle. No reference media is redistributed.

## A — ASCII hourglass

`WhatsApp Image 2026-11-17 at 00.07.07.jpeg`, 738 × 1600.
Fine, tightly spaced monospace characters describe a faceted volume against pure black. Broad dark areas establish negative space; dense dollar signs and numerals carry highlights. Slashes and vertical strokes outline hard edges. Its precision comes from continuous tonal structure rather than random letters. The photographic social UI is unrelated to the artwork.

Application: a hand-built, density-sorted glyph atlas, bright plate armor, deep creases, fixed screen-space cells, restrained warm brass, and no randomly changing glyphs.

## B — Crawlpedia

`WhatsApp Video 2026-11-17 at 00.07.07.mp4`, 576 × 1024, 30 fps, 30.8 seconds.
Examined extracted frames at 0, 6, 12, 18 and 24 seconds. The geometric organism moves and deforms continuously across a dark typographic document. Thin jointed limbs, blue/yellow/red geometric segments and wire structures retain coherent spatial relationships. It is not entirely an ASCII renderer: the lesson is the continuous articulation and coexistence of type and geometry, not its saturated palette.

Application: hierarchical 3D armor joints and continuous delta-time animation; original world geometry; restrained minimal interface; typography derived from an actual rendered scene rather than prewritten pictures.

## C — ASCII knight

`WhatsApp Video 2026-11-17 at 00.09.00.mp4`, 720 × 1280, 30 fps, 16 seconds.
Examined extracted frames at 0, 4, 8 and 12 seconds. A high contrast armored knight, long sword, broad pauldrons, narrow visor and flowing crimson cloth. The bright armor retains a heavy silhouette above fine grass strokes. Different viewing frames show continuity, but the source is filmed off a laptop: precise frame pacing or original rendering internals cannot be inferred.

Application: original procedural articulated plate knight with layered pauldrons, ridged breastplate, visor, chainmail, gauntlets, sword, shield and wind-driven cloth. Silver and muted brass replace bright red. The camera leaves the silhouette large enough to read.

## Rendering decisions

Real 3D scene rendered offscreen, then reconstructed in a GPU full-screen glyph pass. A fixed cell grid and four-point filtered luminance provide stable samples. Glyph thresholds have a small low-pass/hysteresis history on the GPU to reduce crawling. Depth edges preserve silhouettes. The final image contains glyphs on near-black, with no conventional 3D image blended underneath. Quality and density are independently adjustable. Extracted inspection frames live outside the repository in `/tmp/last-bell-refs`.

## Overhaul study — 0.2

Re-examined the original image and extracted knight-video frames at 0, 3, 6, 9 and 12 seconds, plus Crawlpedia frames across the recording. Temporary study contact sheets remain outside the project in `/tmp/last-bell-overhaul`; no original media is redistributed.

The benchmark knight is a bright, detailed silhouette surrounded by black, with dense highlights, thin outline strokes, deep gaps between armor layers and irregular grass. Its heavy pauldrons, narrow waist, projecting helmet, long sword and animated cloth carry its identity. The recording does not demonstrate walking, running, planted feet or a sit/lie transition, so it cannot be used as evidence for those motions. Crawlpedia demonstrates articulated continuous movement, rather than a humanoid gait reference. The hourglass remains useful for controlled character density and negative space.

### Prototype versus target

| Prototype difference                                                                                    | Overhaul response                                                                                             |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Broad hemisphere lighting, colored sky and brightened dark values fill the whole screen with characters | Black background/fog, very low fill, silver key/rim, black-preserving exponential tonal mapping               |
| Armor reads as a barrel, round balls and straight tubes                                                 | Sculpted Gothic cross-sections, layered/contoured plates, narrow visor gap, real mail links and fluted detail |
| Broad rectangular cape hides the back                                                                   | Narrow pleated mantle and split thigh cloth expose armor                                                      |
| Uniform grass planes create repeating patches of strokes                                                | Five bent tuft templates, clustered distribution, sparse/clear areas, coherent world-space wind               |
| Arbitrary phase speed creates sliding                                                                   | Distance-driven gait, stance anchors, predicted swing landings and terrain IK                                 |
| Entire body rotates backward about the pelvis                                                           | Sequential descent, supporting wrist, separate lumbar/chest recline and terrain-aligned contact frame         |
| Simple glyph ramp plus same-cell history misses moving silhouettes                                      | Measured-density ramp, depth-derived normals, oriented outlines, camera reprojection and history rejection    |
| Distant background competes with the character                                                          | Revised low side shot, selective illumination, distance extinction and black negative space                   |

### Visual review and limits

Reviewed new standing, walking, running, frontal close-up, grass close-up, seated, lying and wide screenshots, plus representative motion-capture frames. Armor now has a fitted silhouette, readable plate separations and much more geometric detail. Grass forms curved clumps and open patches; predominantly black backgrounds restore hierarchy. The result is an original real-time interpretation, not a reproduction of the reference.

Remaining differences: the reference has bespoke illustration-level shaping and carefully composed bright areas. This procedural suit is more regular, and fine mail/rivets disappear as it gets small. Grass can still resolve into vertical marks at a distance. The motion is procedurally constrained, not motion captured; a polished authored rest/get-up clip and better cloth contact would improve it further. Temporal filtering reduces threshold crawling but cannot remove all aliasing on subcell grass. These limits are not hidden by a high FPS claim.

## v0.3 — new armor design reference

Inspected `references/knight.png` (643 × 360) before edits, alongside renewed multi-frame inspection of both original videos and the hourglass image. The new reference shows heavy, rounded steel plate, a closed helmet with a narrow dark visor, four overlapping curved pauldrons, segmented gauntlets/greaves, worn surfaces, chainmail gaps, a longsword and a crimson cloth train. Its kneeling pose is **not** the default gameplay pose.

The v0.2 captures remained too faint and regular. v0.3 replaces ring-like shoulders with domed overlapping lames, rounds the pointed crown, restrains breastplate fluting and adds stable procedural steel wear. The crimson cloak has a broader, longer silhouette and shares gusts with grass and sound. Surface-tagged reconstruction makes armor silver/white without lifting the black background, preserves visor gaps and red cloth, and uses curved grass strokes rather than repeated vertical bars. Thin subcell hero samples and fog-exempt hero materials preserve the tiny figure during pullback.

Reviewed actual standing, portrait, grass, walk, run, seated, resting and wide frames, plus successive frames from a recorded motion test. Measured readability guards accompany visual review; neither high FPS nor black-pixel percentage is treated as proof of art quality. The new reference remains local and excluded from Git; no pixels, texture, pose sequence or original media are redistributed.

Remaining art differences: this is still an original procedural suit, not the reference's bespoke sculpt. Rigid plate proportions, cloth contact, tight pivots and distant grass aliasing can be refined further. The extreme wide shot intentionally reduces the knight to a few silver glyphs. The full scene is always live 3D reconstructed in ASCII.

## v0.4 — primary ASCII scarf benchmark

Inspected `references/knight_ref.png` after the user identified its filename. It shows silver-white armor with strong negative-space joints, a narrow dark visor, heavy layered shoulders, a thin waist and a torn crimson scarf streaming across the neck/shoulder. The long tails project laterally without hiding the breastplate. Tall, curved, fine grass rises around the lower legs; the sky stays almost black. This is the primary artistic benchmark for v0.4, supported by renewed frames from the original knight video.

The original interpretation retains the suit and exposes it with three unequal narrow scarf ribbons, removes the held sword in favor of a hip scabbard, raises and curves the meadow, and adds sparse old iron lanterns. Brightness is surface-selective. The renderer uses a rational silver highlight shoulder and stable variation among dense glyphs, rather than increasing all scene brightness.

The image itself does not demonstrate locomotion. KayKit's CC0 authored walk/run curves supply coordinated upper-body timing; project-authored IK, foot contact, acceleration and turning adapt them to the terrain. Actual gameplay recordings are reviewed separately. The result remains an original procedural suit with adapted stylized animation, rather than a reproduction of the image or human mocap.
