import { readFileSync, mkdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
const marks = JSON.parse(
  readFileSync("test-results/preview/marks.json", "utf8"),
);
const segments = [
  [marks.standing, 2.2],
  [marks.walk, marks.travelEnd - marks.walk],
  [marks.equipment, 3.1],
  [marks.restStart + 0.4, 4],
  [marks.lying - 0.6, 4.9],
  [marks.wide, 4.8],
];
const filters = segments.map(
  ([start, length], i) =>
    `[0:v]trim=start=${start}:duration=${length},setpts=PTS-STARTPTS[v${i}]`,
);
filters.push(
  segments.map((_, i) => `[v${i}]`).join("") +
    `concat=n=${segments.length}:v=1:a=0,fps=24,scale=1152:720:flags=lanczos[out]`,
);
mkdirSync("docs/previews", { recursive: true });
const output = "docs/previews/v04-gameplay.mp4";
const result = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    "test-results/preview/raw.webm",
    "-filter_complex",
    filters.join(";"),
    "-map",
    "[out]",
    "-c:v",
    "libx264",
    "-crf",
    "30",
    "-preset",
    "slow",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-an",
    output,
  ],
  { stdio: "inherit" },
);
if (result.status !== 0)
  throw new Error(`ffmpeg failed: ${result.error ?? result.status}`);
console.log(
  `${output}: ${(statSync(output).size / 1024 / 1024).toFixed(2)} MiB`,
);
