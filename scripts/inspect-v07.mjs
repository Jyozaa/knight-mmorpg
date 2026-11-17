/** Measure native capture cadence and master-bus signal separately from clean game frame pacing. */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const folder = "test-results/v07",
  results = [];
function command(bin, args) {
  const r = spawnSync(bin, args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (r.status !== 0) throw new Error(`${bin}: ${r.stderr}`);
  return r.stdout;
}
for (const name of ["legacy-ascii", "2p5d-ascii", "2p5d-shaded"]) {
  const path = `${folder}/${name}.webm`,
    probe = JSON.parse(
      command("ffprobe", [
        "-v",
        "error",
        "-show_streams",
        "-show_format",
        "-of",
        "json",
        path,
      ]),
    );
  const times = command("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "frame=best_effort_timestamp_time",
    "-of",
    "csv=p=0",
    path,
  ])
    .trim()
    .split("\n")
    .map(parseFloat)
    .filter(Number.isFinite);
  const intervals = times
      .slice(1)
      .map((t, i) => (t - times[i]) * 1000)
      .sort((a, b) => a - b),
    at = (p) => intervals[Math.ceil(intervals.length * p) - 1];
  const video = {
    frames: times.length,
    duration: +probe.format.duration,
    averageFps: (times.length - 1) / (times.at(-1) - times[0]),
    p50: at(0.5),
    p95: at(0.95),
    p99: at(0.99),
    maxGap: at(1),
    gapsOver25: intervals.filter((x) => x > 25).length,
    gapsOver50: intervals.filter((x) => x > 50).length,
  };
  command("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    path,
    "-vn",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-f",
    "s16le",
    `${folder}/${name}.pcm`,
  ]);
  const bytes = readFileSync(`${folder}/${name}.pcm`);
  let sumL = 0,
    sumR = 0,
    powerL = 0,
    powerR = 0,
    cross = 0,
    peak = 0,
    clipped = 0;
  const windows = {
    idle: { start: 0, end: 2, power: 0, count: 0 },
    travel: { start: 2, end: 17, power: 0, count: 0 },
    rest: { start: 30, end: 40, power: 0, count: 0 },
  };
  for (let i = 0; i < bytes.length; i += 4) {
    const l = bytes.readInt16LE(i) / 32768,
      r = bytes.readInt16LE(i + 2) / 32768,
      t = i / 4 / 48000;
    sumL += l;
    sumR += r;
    powerL += l * l;
    powerR += r * r;
    cross += l * r;
    peak = Math.max(peak, Math.abs(l), Math.abs(r));
    if (Math.abs(l) >= 0.9999 || Math.abs(r) >= 0.9999) clipped++;
    for (const w of Object.values(windows))
      if (t >= w.start && t < w.end) {
        w.power += l * l + r * r;
        w.count += 2;
      }
  }
  const n = bytes.length / 4,
    audio = {
      channels: 2,
      sampleRate: 48000,
      rms: Math.sqrt((powerL + powerR) / (2 * n)),
      peak,
      peakDb: 20 * Math.log10(peak),
      clippedFrames: clipped,
      dc: [sumL / n, sumR / n],
      stereoCorrelation:
        (cross - (sumL * sumR) / n) /
        Math.sqrt((powerL - (sumL * sumL) / n) * (powerR - (sumR * sumR) / n)),
      windows: Object.fromEntries(
        Object.entries(windows).map(([k, w]) => [
          k,
          Math.sqrt(w.power / w.count),
        ]),
      ),
    };
  assert.ok(video.averageFps > 45);
  assert.ok(audio.rms > 1e-5);
  assert.equal(clipped, 0);
  const recording = JSON.parse(readFileSync(`${folder}/${name}.json`));
  const end = recording.checkpoints.end;
  results.push({
    name,
    video,
    audio,
    footfalls: end.audio.footfallCount,
    foley: end.audio.foley,
    errors: recording.errors,
  });
  console.log(name, video, audio);
}
writeFileSync(
  `${folder}/capture-inspection.json`,
  JSON.stringify(results, null, 2),
);
