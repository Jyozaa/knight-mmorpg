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
