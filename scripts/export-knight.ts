import { writeFileSync, mkdirSync } from "node:fs";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { Knight } from "../src/character/Knight";
// GLTFExporter only needs FileReader's Blob-to-ArrayBuffer path for this texture-free asset.
class BinaryReader {
  result: ArrayBuffer | null = null;
  onloadend: (() => void) | null = null;
  async readAsArrayBuffer(blob: Blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend?.();
  }
}
Object.defineProperty(globalThis, "FileReader", {
  value: BinaryReader,
  configurable: true,
});
const knight = new Knight();
knight.root.updateMatrixWorld(true);
const result = await new GLTFExporter().parseAsync(knight.root, {
  binary: true,
  onlyVisible: true,
});
if (!(result instanceof ArrayBuffer)) throw new Error("Expected a binary GLB");
mkdirSync("public/models", { recursive: true });
writeFileSync("public/models/nameless-knight.glb", Buffer.from(result));
console.log(
  `Exported original ${knight.mesh.skeleton.bones.length}-joint knight: ${(result.byteLength / 1024 / 1024).toFixed(2)} MiB`,
);
