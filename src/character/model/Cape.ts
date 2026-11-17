import * as T from "three";
import type { Rig } from "./buildArmor";
import { WindSystem, type WindSample } from "../../environment/WindSystem";
import { tagAsciiSurface, SURFACE_TAG } from "../../rendering/SurfaceStyle";
import { heightAt } from "../../world/terrain";
interface Ribbon {
  mesh: T.Mesh<T.BufferGeometry, T.MeshStandardMaterial>;
  points: T.Vector3[];
  previous: T.Vector3[];
  length: number;
  width: number;
  offset: T.Vector3;
  root: T.Bone;
  strength: number;
  gravity: number;
  seed: number;
  widthAngle: number;
}
/** Narrow ragged scarf: fixed-step Verlet ribbons, neck attachment and terrain/body constraints.
 * The same solver also supports heavier, restrained hip/belt rags. */
export class Cape {
  readonly meshes: T.Mesh[] = [];
  readonly ribbons: Ribbon[] = [];
  readonly garments: Ribbon[] = [];
  private cloths: Ribbon[] = [];
  private anchor = new T.Vector3();
  private up = new T.Vector3(0, 1, 0);
  private previousRoot = new T.Vector3();
  private movement = new T.Vector3();
  private movementReady = false;
  private delta = new T.Vector3();
  private temp = new T.Vector3();
  private local = new T.Vector3();
  private worldQ = new T.Quaternion();
  private sample: WindSample = {
    strength: 0,
    gust: 0,
    turbulence: 0,
    rustle: 0,
  };
  private lastTime: number | null = null;
  private accumulator = 0;
  private initialized = false;
  private colliders: {
    bone: T.Bone;
    center: T.Vector3;
    radii: T.Vector3;
    inverse: T.Matrix4;
    world: T.Matrix4;
    waistOnly: boolean;
  }[] = [];
  constructor(
    private rig: Rig,
    readonly wind: WindSystem = new WindSystem(),
  ) {
    this.colliders = [
      {
        bone: rig.head,
        center: new T.Vector3(0, 0.075, 0.015),
        radii: new T.Vector3(0.145, 0.15, 0.175),
      },
      {
        bone: rig.chest,
        center: new T.Vector3(0, -0.015, 0.015),
        radii: new T.Vector3(0.25, 0.2, 0.2),
      },
      ...rig.arms.map((bone, i) => ({
        bone,
        center: new T.Vector3((i === 0 ? -1 : 1) * 0.07, -0.035, 0),
        radii: new T.Vector3(0.13, 0.17, 0.17),
      })),
    ].map((c) => ({
      ...c,
      inverse: new T.Matrix4(),
      world: new T.Matrix4(),
      waistOnly: false,
    }));
    for (const c of [
      {
        bone: rig.hips,
        center: new T.Vector3(0, -0.1, 0),
        radii: new T.Vector3(0.255, 0.18, 0.2),
      },
      ...rig.thighs.map((bone) => ({
        bone,
        center: new T.Vector3(0, -0.22, 0.005),
        radii: new T.Vector3(0.115, 0.25, 0.105),
      })),
    ])
      this.colliders.push({
        ...c,
        inverse: new T.Matrix4(),
        world: new T.Matrix4(),
        waistOnly: true,
      });
    const material = new T.MeshStandardMaterial({
      color: "#9b1026",
      roughness: 0.94,
      fog: false,
      side: T.DoubleSide,
    });
    tagAsciiSurface(material, SURFACE_TAG.cloth);
    for (let layer = 0; layer < 2; layer++) {
      const positions: number[] = [],
        indices: number[] = [];
      for (let row = 0; row < 4; row++)
        for (let j = 0; j <= 48; j++) {
          const angle = (j / 48) * Math.PI * 2,
            t = row / 3,
            fold = Math.sin(angle * 7 + layer) * 0.009;
          positions.push(
            Math.sin(angle) * (0.139 + layer * 0.012 + fold),
            0.195 + layer * 0.037 + t * 0.05 + Math.sin(angle + layer) * 0.018,
            Math.cos(angle) * (0.112 + layer * 0.013 + fold),
          );
          if (row && j) {
            const k = row * 49 + j;
            indices.push(k, k - 1, k - 50, k, k - 50, k - 49);
          }
        }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute(
        "position",
        new T.Float32BufferAttribute(positions, 3),
      );
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const wrap = new T.Mesh(geometry, material);
      wrap.name = "Layered asymmetric scarf wrap";
      rig.chest.add(wrap);
      this.meshes.push(wrap);
    }
    for (let strip = 0; strip < 3; strip++) {
      const length = [1.38, 1.1, 0.76][strip],
        width = [0.17, 0.115, 0.075][strip],
        count = 19;
      const g = new T.BufferGeometry(),
        p = new Float32Array(count * 2 * 3),
        indices: number[] = [];
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        for (let side = 0; side < 2; side++) {
          const k = (i * 2 + side) * 3;
          p[k] = (side - 0.5) * width;
          p[k + 1] = -0.12 - t * 0.3;
          p[k + 2] = -0.17 - t * length;
        }
        if (i) {
          const k = i * 2;
          indices.push(k - 2, k - 1, k, k - 1, k + 1, k);
        }
      }
      g.setAttribute(
        "position",
        new T.BufferAttribute(p, 3).setUsage(T.DynamicDrawUsage),
      );
      g.setIndex(indices);
      g.computeVertexNormals();
      const mesh = new T.Mesh(g, material);
      mesh.name = `Torn crimson scarf ribbon ${strip + 1}`;
      mesh.frustumCulled = false;
      // World-space simulation is converted into the chest's local coordinates only at upload.
      rig.chest.add(mesh);
      this.meshes.push(mesh);
      this.ribbons.push({
        mesh,
        root: rig.chest,
        strength: 1,
        gravity: 4,
        seed: strip,
        widthAngle: 0,
        length,
        width,
        offset: new T.Vector3((strip - 1) * 0.065, 0.23 - strip * 0.018, -0.14),
        points: Array.from({ length: count }, () => new T.Vector3()),
        previous: Array.from({ length: count }, () => new T.Vector3()),
      });
    }
    for (let i = 0; i < 4; i++) {
      const length = [0.28, 0.22, 0.31, 0.24][i],
        width = [0.09, 0.075, 0.095, 0.065][i],
        count = 9;
      const positions = new Float32Array(count * 6),
        indices: number[] = [];
      for (let n = 0; n < count; n++) {
        const t = n / (count - 1);
        for (let side = 0; side < 2; side++) {
          positions[n * 6 + side * 3] = (side - 0.5) * width;
          positions[n * 6 + side * 3 + 1] = -t * length;
        }
        if (n) {
          const k = n * 2;
          indices.push(k - 2, k - 1, k, k - 1, k + 1, k);
        }
      }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute(
        "position",
        new T.BufferAttribute(positions, 3).setUsage(T.DynamicDrawUsage),
      );
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const m = new T.MeshStandardMaterial({
        color: i % 2 ? "#666b60" : "#6b4949",
        roughness: 1,
        fog: false,
        side: T.DoubleSide,
      });
      tagAsciiSurface(m, SURFACE_TAG.cloth);
      const mesh = new T.Mesh(geometry, m);
      mesh.name = `Weighted weathered belt cloth ${i + 1}`;
      mesh.frustumCulled = false;
      rig.hips.add(mesh);
      this.meshes.push(mesh);
      this.garments.push({
        mesh,
        length,
        width,
        root: rig.hips,
        strength: 0.26 + i * 0.025,
        gravity: 7.5,
        seed: i + 7,
        widthAngle: i < 2 ? Math.PI / 2 : 0,
        offset:
          i < 2
            ? new T.Vector3((i === 0 ? -1 : 1) * 0.267, -0.145, 0.09)
            : new T.Vector3((i === 2 ? -1 : 1) * 0.11, -0.15, -0.216),
        points: Array.from({ length: count }, () => new T.Vector3()),
        previous: Array.from({ length: count }, () => new T.Vector3()),
      });
    }
    this.cloths = [...this.ribbons, ...this.garments];
  }
  update(time: number, _speed: number, _rest: number) {
    this.rig.chest.updateWorldMatrix(true, false);
    for (const c of this.colliders) {
      c.bone.updateWorldMatrix(true, false);
      c.world.copy(c.bone.matrixWorld);
      c.inverse.copy(c.world).invert();
    }
    const dt =
      this.lastTime === null
        ? 1 / 60
        : T.MathUtils.clamp(time - this.lastTime, 0, 0.05);
    this.lastTime = time;
    this.rig.hips.parent!.getWorldPosition(this.temp);
    if (this.movementReady && dt > 0) {
      this.delta.subVectors(this.temp, this.previousRoot).divideScalar(dt);
      this.delta.y = 0;
      this.delta.clampLength(0, 12);
      this.movement.lerp(this.delta, 1 - Math.exp(-8 * dt));
    }
    this.previousRoot.copy(this.temp);
    this.movementReady = true;
    if (!this.initialized) {
      for (const r of this.cloths) {
        this.anchor.copy(r.offset);
        r.root.localToWorld(this.anchor);
        r.root.getWorldQuaternion(this.worldQ);
        for (let i = 0; i < r.points.length; i++) {
          r.points[i]
            .copy(this.anchor)
            .add(
              r.strength === 1
                ? new T.Vector3(i * 0.035, -i * 0.012, -i * 0.045)
                : new T.Vector3(
                    0,
                    (-i * r.length) / (r.points.length - 1),
                    -0.008 * i,
                  ).applyQuaternion(this.worldQ),
            );
          r.previous[i].copy(r.points[i]);
        }
      }
      this.initialized = true;
    }
    this.accumulator += dt;
    const step = 1 / 120;
    while (this.accumulator >= step) {
      this.simulate(step);
      this.accumulator -= step;
    }
    for (let strip = 0; strip < this.cloths.length; strip++) {
      const r = this.cloths[strip],
        p = r.mesh.geometry.attributes.position;
      r.root.getWorldQuaternion(this.worldQ);
      for (let i = 0; i < r.points.length; i++) {
        const t = i / (r.points.length - 1),
          fray = 1 - 0.48 * t * t + 0.18 * Math.sin(i * 3.7 + strip);
        // Unequal serrated edges and a taper split the silhouette into torn tails.
        for (let side = 0; side < 2; side++) {
          this.local
            .set(
              (side - 0.5) * r.width * fray,
              Math.sin(i * 2.8 + strip) * 0.013 * t +
                (side - 0.5) *
                  r.width *
                  Math.sin(this.wind.uniforms.windTime.value * 5 - i * 0.55) *
                  t *
                  (r.strength === 1 ? 0.65 : 0.22),
              0,
            )
            .applyAxisAngle(this.up, r.widthAngle)
            .applyQuaternion(this.worldQ)
            .add(r.points[i]);
          r.root.worldToLocal(this.local);
          p.setXYZ(i * 2 + side, this.local.x, this.local.y, this.local.z);
        }
      }
      p.needsUpdate = true;
      r.mesh.geometry.computeVertexNormals();
    }
  }
  private simulate(dt: number) {
    for (const r of this.cloths) {
      this.anchor.copy(r.offset);
      r.root.localToWorld(this.anchor);
      r.points[0].copy(this.anchor);
      r.previous[0].copy(this.anchor);
      for (let i = 1; i < r.points.length; i++) {
        const p = r.points[i],
          old = r.previous[i];
        this.wind.sample(p.x, p.z, this.sample);
        this.delta
          .subVectors(p, old)
          .multiplyScalar(r.strength === 1 ? 0.985 : 0.975);
        old.copy(p);
        p.add(this.delta);
        p.x +=
          (this.wind.parameters.directionX *
            (3.2 + this.sample.strength * 9.6) -
            this.wind.parameters.directionZ * this.sample.turbulence * 12 -
            this.movement.x * 1.5) *
          dt *
          dt *
          r.strength;
        p.z +=
          (this.wind.parameters.directionZ *
            (3.2 + this.sample.strength * 9.6) +
            this.wind.parameters.directionX * this.sample.turbulence * 12 -
            this.movement.z * 1.5) *
          dt *
          dt *
          r.strength;
        p.y +=
          (-r.gravity +
            this.sample.gust * 3 * r.strength +
            this.sample.turbulence * 9 * r.strength +
            Math.sin(
              this.wind.uniforms.windTime.value * 7 - i * 0.65 + r.seed,
            ) *
              this.sample.strength *
              12 *
              r.strength) *
          dt *
          dt;
      }
      const segment = r.length / (r.points.length - 1);
      for (
        let iteration = 0;
        iteration < (r.strength === 1 ? 7 : 16);
        iteration++
      ) {
        r.points[0].copy(this.anchor);
        for (let i = 1; i < r.points.length; i++) {
          const a = r.points[i - 1],
            b = r.points[i];
          this.delta.subVectors(b, a);
          const d = this.delta.length();
          this.delta.multiplyScalar((d - segment) / Math.max(d, 0.00001));
          if (i === 1) b.sub(this.delta);
          else {
            a.addScaledVector(this.delta, 0.5);
            b.addScaledVector(this.delta, -0.5);
          }
          // Keep fabric on the outside of the cuirass, with planted ground contact during rest.
          for (const c of this.colliders) {
            if (c.waistOnly && r.strength === 1) continue;
            this.temp
              .copy(b)
              .applyMatrix4(c.inverse)
              .sub(c.center)
              .divide(c.radii);
            const radius = this.temp.length();
            if (radius < 1) {
              this.temp
                .multiplyScalar(1 / Math.max(radius, 0.001))
                .multiply(c.radii)
                .add(c.center)
                .applyMatrix4(c.world);
              b.copy(this.temp);
            }
          }
          b.y = Math.max(b.y, heightAt(b.x, b.z) + 0.035);
        }
      }
    }
  }
  get diagnostics() {
    return {
      kind: "three torn scarf ribbons",
      tips: this.ribbons.map((r) => r.points.at(-1)!.toArray()),
      roots: this.ribbons.map((r) => r.points[0].toArray()),
      garments: {
        tips: this.garments.map((r) => r.points.at(-1)!.toArray()),
        roots: this.garments.map((r) => r.points[0].toArray()),
      },
    };
  }
}
