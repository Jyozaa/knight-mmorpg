import * as T from "three";
export const ATLAS_COLUMNS = 64;
/** Eight measured tone bands, six comparable-coverage variants each. One glyph per cell. */
export function createGlyphAtlas() {
  const cellWidth = 32,
    cellHeight = 48,
    canvas = document.createElement("canvas");
  canvas.width = ATLAS_COLUMNS * cellWidth;
  canvas.height = cellHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.font = "52px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const candidates = Array.from(" .`',:;!iltrcvx+*=osaznuhekw%&8B#@$MW");
  const measured = candidates
    .map((char) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#fff";
      ctx.fillText(char, 16, 25);
      const p = ctx.getImageData(0, 0, cellWidth, cellHeight).data;
      let coverage = 0;
      for (let i = 3; i < p.length; i += 4) coverage += p[i] / 255;
      return { char, coverage };
    })
    .sort((a, b) => a.coverage - b.coverage);
  const ramp = Array.from({ length: 48 }, (_, i) => {
    const band = Math.floor(i / 6),
      variant = i % 6;
    const center = (band / 7) * (measured.length - 1);
    return measured[
      Math.max(
        0,
        Math.min(
          measured.length - 1,
          Math.round(center + (variant - 2.5) * 0.8),
        ),
      )
    ].char;
  });
  const chars = [
    ...ramp,
    "/",
    "\\",
    "(",
    ")",
    "-",
    "|",
    "'",
    ",",
    "/",
    "\\",
    "{",
    "}",
    "<",
    ">",
    ":",
    ".",
  ];
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, cellHeight);
  ctx.fillStyle = "#fff";
  chars.forEach((char, i) => {
    ctx.font = i < 48 ? "52px monospace" : "48px monospace";
    ctx.fillText(
      char,
      i * cellWidth + 16,
      25 + (i < 48 ? [-4, -1, 3, 1, -3, 4][i % 6] : 0),
      30,
    );
  });
  const atlas = new T.CanvasTexture(canvas);
  atlas.minFilter = T.LinearFilter;
  atlas.magFilter = T.LinearFilter;
  atlas.generateMipmaps = false;
  return {
    atlas,
    characters: chars.join(""),
    coverage: measured.map((v) => v.coverage),
  };
}
