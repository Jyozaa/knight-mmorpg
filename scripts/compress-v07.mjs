/** Preserve native timestamps and complete 55 s reveals. No fps conversion, interpolation or motion smoothing. */
import { spawnSync } from "node:child_process";
import { readFileSync, mkdirSync, statSync, writeFileSync } from "node:fs";
const folder = "test-results/v07";
mkdirSync("docs/previews", { recursive: true });
function encode(args, output) {
  if (
    process.env.EXPORT_ONLY &&
    !output.endsWith(`v07-${process.env.EXPORT_ONLY}.mp4`)
  )
    return;
  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      ...args,
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-threads",
      "4",
      "-pix_fmt",
      "yuv420p",
      "-fps_mode",
      "vfr",
      "-c:a",
      "aac",
      "-b:a",
      "112k",
      "-movflags",
      "+faststart",
      output,
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error(`ffmpeg ${result.status}`);
  const size = statSync(output).size;
  console.log(output, (size / 1024 / 1024).toFixed(2) + " MiB");
  if (size > 95 * 1024 * 1024)
    throw new Error("Preview exceeds reviewable Git size");
}
const marks = {};
for (const mode of ["legacy", "2p5d"]) {
  const m = JSON.parse(
    readFileSync(`${folder}/${mode}-ascii.json`, "utf8"),
  ).marks;
  marks[mode] = m;
  encode(
    [
      "-i",
      `${folder}/${mode}-ascii.webm`,
      "-filter_complex",
      `[0:v]trim=start=${m.idle}:end=${m.end},setpts=PTS-STARTPTS,scale=1152:720:flags=lanczos[v];[0:a]atrim=start=${m.idle}:end=${m.end},asetpts=PTS-STARTPTS[a]`,
      "-map",
      "[v]",
      "-map",
      "[a]",
      "-crf",
      "31",
    ],
    `docs/previews/v07-${mode}.mp4`,
  );
}
const a = marks.legacy,
  b = marks["2p5d"];
encode(
  [
    "-i",
    `${folder}/legacy-ascii.webm`,
    "-i",
    `${folder}/2p5d-ascii.webm`,
    "-filter_complex",
    `[0:v]trim=start=${a.idle}:end=${a.end},setpts=PTS-STARTPTS,scale=960:600:flags=lanczos[l];[1:v]trim=start=${b.idle}:end=${b.end},setpts=PTS-STARTPTS,scale=960:600:flags=lanczos[r];[l][r]hstack=inputs=2:shortest=1[v];[1:a]atrim=start=${b.idle}:end=${b.end},asetpts=PTS-STARTPTS[a]`,
    "-map",
    "[v]",
    "-map",
    "[a]",
    "-crf",
    "31",
    "-metadata",
    "title=A: legacy camera, neutral posture | B: 2.5D camera, weary posture; audio B",
  ],
  "docs/previews/v07-side-by-side.mp4",
);
const shaded = JSON.parse(
  readFileSync(`${folder}/2p5d-shaded.json`, "utf8"),
).marks;
const segments = [
    [shaded.idle, shaded.beforeRest - shaded.idle],
    [shaded.sit, 3],
    [shaded.lie, 3],
    [shaded.wide, 1.5],
    [shaded.return, shaded.end - shaded.return],
  ],
  filter = [];
segments.forEach(([start, duration], i) => {
  filter.push(
    `[0:v]trim=start=${start}:duration=${duration},setpts=PTS-STARTPTS[v${i}]`,
  );
  filter.push(
    `[0:a]atrim=start=${start}:duration=${duration},asetpts=PTS-STARTPTS,afade=t=in:d=0.03,afade=t=out:st=${duration - 0.03}:d=0.03[a${i}]`,
  );
});
filter.push(
  segments.map((_, i) => `[v${i}][a${i}]`).join("") +
    `concat=n=${segments.length}:v=1:a=1[v][a]`,
);
filter.push("[v]scale=1152:720:flags=lanczos[out]");
encode(
  [
    "-i",
    `${folder}/2p5d-shaded.webm`,
    "-filter_complex",
    filter.join(";"),
    "-map",
    "[out]",
    "-map",
    "[a]",
    "-crf",
    "27",
  ],
  "docs/previews/v07-shaded.mp4",
);
const metadata = [];
for (const name of ["legacy", "2p5d", "side-by-side", "shaded"]) {
  const result = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_streams",
      "-show_format",
      "-of",
      "json",
      `docs/previews/v07-${name}.mp4`,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error("ffprobe failed");
  const probe = JSON.parse(result.stdout),
    v = probe.streams.find((s) => s.codec_type === "video"),
    a = probe.streams.find((s) => s.codec_type === "audio");
  metadata.push({
    name,
    width: v.width,
    height: v.height,
    duration: +probe.format.duration,
    bytes: +probe.format.size,
    frames: +v.nb_frames,
    averageRate: v.avg_frame_rate,
    audio: a.codec_name,
    channels: a.channels,
  });
}
writeFileSync(
  `${folder}/preview-metadata.json`,
  JSON.stringify(metadata, null, 2),
);
