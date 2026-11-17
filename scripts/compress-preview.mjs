import { readFileSync, mkdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
const m = JSON.parse(readFileSync("test-results/v05/marks.json", "utf8"));
const segments = [
  [m.standing, 3],
  [m.walk, m.walkEnd - m.walk],
  [m.run, m.runEnd - m.run],
  [m.turn, m.turnEnd - m.turn],
  [m.portrait, m.portraitEnd - m.portrait],
  [m.restStart + 0.4, 4],
  [m.lying - 0.2, 4.2],
  [m.wide, 5],
];
const filters = [];
for (let i = 0; i < segments.length; i++) {
  const [s, d] = segments[i];
  filters.push(`[0:v]trim=start=${s}:duration=${d},setpts=PTS-STARTPTS[v${i}]`);
  filters.push(
    `[0:a]atrim=start=${s}:duration=${d},asetpts=PTS-STARTPTS,afade=t=in:d=0.03,afade=t=out:st=${d - 0.03}:d=0.03[a${i}]`,
  );
}
filters.push(
  segments.map((_, i) => `[v${i}][a${i}]`).join("") +
    `concat=n=${segments.length}:v=1:a=1[v][a]`,
);
filters.push("[v]scale=1152:720:flags=lanczos[out]");
mkdirSync("docs/previews", { recursive: true });
const output = "docs/previews/v05-gameplay.mp4";
const r = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    "test-results/v05/raw.webm",
    "-filter_complex",
    filters.join(";"),
    "-map",
    "[out]",
    "-map",
    "[a]",
    "-c:v",
    "libx264",
    "-crf",
    "32",
    "-preset",
    "slow",
    "-pix_fmt",
    "yuv420p",
    "-fps_mode",
    "vfr",
    "-c:a",
    "aac",
    "-b:a",
    "96k",
    "-movflags",
    "+faststart",
    output,
  ],
  { stdio: "inherit" },
);
if (r.status !== 0) throw new Error(`ffmpeg: ${r.error ?? r.status}`);
console.log(
  `${output}: ${(statSync(output).size / 1024 / 1024).toFixed(2)} MiB; no frame interpolation or time scaling`,
);
