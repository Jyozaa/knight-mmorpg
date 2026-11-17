import * as T from "three";
import { heightAt, type Obstacle } from "./terrain";

/** One source of truth for the visible instance and its collision footprint. */
export function populateRocks(
  rocks: T.InstancedMesh,
  rng: () => number,
  obstacles: Obstacle[],
) {
  const dummy = new T.Object3D();
  for (let i = 0; i < rocks.count; i++) {
    let x = (rng() - 0.5) * 260;
    const z = (rng() - 0.5) * 250;
    if (Math.hypot(x, z) < 9) x += 12;
    const scale = 0.3 + rng() * 2;
    dummy.position.set(x, heightAt(x, z) + scale * 0.16, z);
    dummy.rotation.set(rng(), rng() * 6.28, rng());
    dummy.scale.set(scale, scale * 0.65, scale * 0.8);
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
    obstacles.push({ x, z, radius: scale * 0.8, height: scale * 1.5 });
  }
  rocks.instanceMatrix.needsUpdate = true;
  rocks.computeBoundingSphere();
}
