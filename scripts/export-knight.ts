import { spawnSync } from "node:child_process";
const blender =
  process.env.BLENDER || "/Applications/Blender.app/Contents/MacOS/Blender";
const result = spawnSync(
  blender,
  ["--background", "--python", "scripts/author-knight.py"],
  { stdio: "inherit" },
);
if (result.status !== 0)
  throw new Error(`Blender export failed: ${result.error ?? result.status}`);
