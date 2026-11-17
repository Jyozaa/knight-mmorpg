import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { heightAt, type Obstacle } from "./terrain";
import { tagAsciiSurface, SURFACE_TAG } from "../rendering/SurfaceStyle";
/** A small number of authored path/ridge landmarks; four nearest lights, no shadow maps. */
export class LampPosts {
  readonly group = new T.Group();
  readonly positions: T.Vector3[] = [];
  readonly flames: T.Mesh[] = [];
  private lights = Array.from(
    { length: 4 },
    () => new T.PointLight("#ffb54e", 0, 5.5, 2),
  );
  private nearest: number[] = [];
  constructor(scene: T.Scene, obstacles: Obstacle[]) {
    this.group.name = "Old hillside lantern posts";
    scene.add(this.group, ...this.lights);
    const iron = new T.MeshStandardMaterial({
      color: "#777a73",
      roughness: 0.85,
      metalness: 0.4,
    });
    const amber = new T.MeshBasicMaterial({ color: "#e89a35", fog: false });
    tagAsciiSurface(amber, SURFACE_TAG.lamp);
    const locations = [
      [-3.8, 5],
      [4.3, -6],
      [-5.8, -23],
      [9, -40],
      [1.7, -61],
      [12, -83],
      [-14, -13],
      [-27, -34],
      [-39, -58],
      [22, -17],
      [33, -42],
      [46, -68],
      [12, 24],
      [-11, 38],
      [-32, 14],
    ];
    const parts: T.BufferGeometry[] = [];
    const add = (
      g: T.BufferGeometry,
      x: number,
      y: number,
      z: number,
      rotation = 0,
    ) => {
      g.rotateZ(rotation);
      g.translate(x, y, z);
      parts.push(g);
    };
    add(new T.CylinderGeometry(0.035, 0.065, 2.85, 7), 0, 1.425, 0);
    add(new T.CylinderGeometry(0.13, 0.16, 0.18, 8), 0, 0.09, 0);
    add(new T.TorusGeometry(0.22, 0.023, 5, 12, Math.PI), 0.21, 2.78, 0, -0.1);
    add(new T.CylinderGeometry(0.014, 0.014, 0.22, 5), 0.43, 2.59, 0);
    for (const y of [2.12, 2.43])
      add(new T.BoxGeometry(0.25, 0.035, 0.25), 0.43, y, 0);
    add(new T.ConeGeometry(0.19, 0.14, 4), 0.43, 2.51, 0);
    for (const x of [-0.105, 0.105])
      for (const z of [-0.105, 0.105])
        add(new T.CylinderGeometry(0.012, 0.012, 0.32, 4), 0.43 + x, 2.27, z);
    const postGeometry = mergeGeometries(parts)!;
    parts.forEach((g) => g.dispose());
    const posts = new T.InstancedMesh(postGeometry, iron, locations.length),
      dummy = new T.Object3D();
    posts.name = "Forged iron posts and hanging lantern cages";
    for (let i = 0; i < locations.length; i++) {
      const [x, z] = locations[i],
        scale = 0.92 + (i % 4) * 0.075,
        yaw = (i * 2.17) % (Math.PI * 2);
      dummy.position.set(x, heightAt(x, z), z);
      dummy.rotation.set(0, yaw, Math.sin(i * 3.1) * 0.025);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      posts.setMatrixAt(i, dummy.matrix);
      const position = new T.Vector3(0.43, 2.28, 0).applyMatrix4(dummy.matrix);
      this.positions.push(position);
      this.nearest.push(i);
      const flame = new T.Mesh(
        new T.OctahedronGeometry(0.125, 0),
        amber.clone(),
      );
      tagAsciiSurface(flame.material, SURFACE_TAG.lamp);
      flame.position.copy(position);
      flame.scale.set(0.65, 1.45, 0.65);
      flame.name = `Amber lantern ${i + 1}`;
      this.flames.push(flame);
      this.group.add(flame);
      obstacles.push({ x, z, radius: 0.16, height: 3.4 * scale });
    }
    posts.instanceMatrix.needsUpdate = true;
    posts.computeBoundingSphere();
    this.group.add(posts);
  }
  update(time: number, actor: T.Vector3) {
    this.nearest.sort(
      (a, b) =>
        this.positions[a].distanceToSquared(actor) -
        this.positions[b].distanceToSquared(actor),
    );
    for (let i = 0; i < this.flames.length; i++) {
      const flicker =
        0.94 +
        0.045 * Math.sin(time * 8.1 + i * 2.3) +
        0.025 * Math.sin(time * 13.7 + i * 0.9);
      (this.flames[i].material as T.MeshBasicMaterial).color.setRGB(
        1.0 * flicker,
        0.38 * flicker,
        0.075 * flicker,
      );
    }
    for (let i = 0; i < this.lights.length; i++) {
      const index = this.nearest[i],
        light = this.lights[i];
      light.position.copy(this.positions[index]);
      light.intensity =
        3.6 *
        (0.94 +
          0.045 * Math.sin(time * 8.1 + index * 2.3) +
          0.025 * Math.sin(time * 13.7 + index * 0.9));
    }
  }
}
