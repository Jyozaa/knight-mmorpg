import * as T from "three";
export const ATLAS_COLUMNS = 32;
/** Coverage is measured rather than assuming a typed character string is density-sorted. */
export function createGlyphAtlas() {
  const cellWidth = 32,
    cellHeight = 48,
    canvas = document.createElement("canvas");
  canvas.width = ATLAS_COLUMNS * cellWidth;
  canvas.height = cellHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.font = "bold 44px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const candidates = Array.from(" .`',:;!iltrc+*oahk%8B&#@$MW");
  const measured = candidates
    .map((char) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#fff";
      ctx.fillText(char, 16, 25);
      const pixels = ctx.getImageData(0, 0, cellWidth, cellHeight).data;
      let coverage = 0;
      for (let i = 3; i < pixels.length; i += 4) coverage += pixels[i] / 255;
      return { char, coverage };
    })
    .sort((a, b) => a.coverage - b.coverage);
  // Choose 24 coverage-spaced printable ASCII characters; eight oriented/curved stroke marks follow.
  const ramp = Array.from(
    { length: 24 },
    (_, i) => measured[Math.round((i * (measured.length - 1)) / 23)].char,
  );
  const chars = [...ramp, "/", "\\", "(", ")", "-", "|", "'", ","];
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, cellHeight);
  ctx.fillStyle = "#fff";
  chars.forEach((char, i) => {
    ctx.font = i < 24 ? "bold 44px monospace" : "40px monospace";
    ctx.fillText(char, i * cellWidth + 16, 25);
  });
  const atlas = new T.CanvasTexture(canvas);
  atlas.minFilter = T.LinearFilter;
  atlas.magFilter = T.LinearFilter;
  atlas.generateMipmaps = false;
  return {
    atlas,
    characters: chars.join(""),
    coverage: measured.map((item) => item.coverage),
  };
}
