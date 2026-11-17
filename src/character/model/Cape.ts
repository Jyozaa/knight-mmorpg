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
}
/** Narrow ragged scarf: fixed-step Verlet ribbons, neck attachment and terrain/body constraints.
 * The legacy class name is retained for the prototype/shared-wind integration. */
export class Cape {
  readonly meshes: T.Mesh[] = [];
  readonly ribbons: Ribbon[] = [];
  private anchor = new T.Vector3();
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
  constructor(
    private rig: Rig,
    readonly wind: WindSystem = new WindSystem(),
  ) {
    const material = new T.MeshStandardMaterial({
      color: "#9b1026",
      roughness: 0.94,
      fog: false,
      side: T.DoubleSide,
    });
    tagAsciiSurface(material, SURFACE_TAG.cloth);
    const collar = new T.Mesh(
      new T.TorusGeometry(0.135, 0.047, 7, 30),
      material,
    );
    collar.name = "Crimson scarf neck wrap";
    collar.rotation.x = Math.PI / 2;
    collar.scale.set(1, 1, 0.72);
    collar.position.set(0, 0.245, 0);
    rig.chest.add(collar);
    this.meshes.push(collar);
    for (let strip = 0; strip < 3; strip++) {
      const length = [1.38, 1.1, 0.76][strip],
        width = [0.135, 0.09, 0.065][strip],
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
        length,
        width,
        offset: new T.Vector3((strip - 1) * 0.065, 0.23 - strip * 0.018, -0.14),
        points: Array.from({ length: count }, () => new T.Vector3()),
        previous: Array.from({ length: count }, () => new T.Vector3()),
      });
    }
  }
  update(time: number, _speed: number, _rest: number) {
    this.rig.chest.updateWorldMatrix(true, false);
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
      for (const r of this.ribbons) {
        this.anchor.copy(r.offset);
        this.rig.chest.localToWorld(this.anchor);
        for (let i = 0; i < r.points.length; i++) {
          r.points[i]
            .copy(this.anchor)
            .add(new T.Vector3(i * 0.035, -i * 0.012, -i * 0.045));
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
    this.rig.chest.getWorldQuaternion(this.worldQ);
    for (let strip = 0; strip < this.ribbons.length; strip++) {
      const r = this.ribbons[strip],
        p = r.mesh.geometry.attributes.position;
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
                  0.65,
              0,
            )
            .applyQuaternion(this.worldQ)
            .add(r.points[i]);
          this.rig.chest.worldToLocal(this.local);
          p.setXYZ(i * 2 + side, this.local.x, this.local.y, this.local.z);
        }
      }
      p.needsUpdate = true;
      r.mesh.geometry.computeVertexNormals();
    }
  }
  private simulate(dt: number) {
    const root = this.rig.hips.parent!;
    for (const r of this.ribbons) {
      this.anchor.copy(r.offset);
      this.rig.chest.localToWorld(this.anchor);
      r.points[0].copy(this.anchor);
      r.previous[0].copy(this.anchor);
      for (let i = 1; i < r.points.length; i++) {
        const p = r.points[i],
          old = r.previous[i];
        this.wind.sample(p.x, p.z, this.sample);
        this.delta.subVectors(p, old).multiplyScalar(0.985);
        old.copy(p);
        p.add(this.delta);
        p.x +=
          (this.wind.parameters.directionX *
            (3.2 + this.sample.strength * 9.6) -
            this.wind.parameters.directionZ * this.sample.turbulence * 12 -
            this.movement.x * 1.5) *
          dt *
          dt;
        p.z +=
          (this.wind.parameters.directionZ *
            (3.2 + this.sample.strength * 9.6) +
            this.wind.parameters.directionX * this.sample.turbulence * 12 -
            this.movement.z * 1.5) *
          dt *
          dt;
        p.y +=
          (-4 +
            this.sample.gust * 3 +
            this.sample.turbulence * 9 +
            Math.sin(this.wind.uniforms.windTime.value * 7 - i * 0.65) *
              this.sample.strength *
              12) *
          dt *
          dt;
      }
      const segment = r.length / (r.points.length - 1);
      for (let iteration = 0; iteration < 7; iteration++) {
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
          this.temp.copy(b);
          root.worldToLocal(this.temp);
          if (this.temp.y > 0.55 && this.temp.y < 1.45) {
            const radius = Math.hypot(this.temp.x, this.temp.z);
            if (radius < 0.255) {
              this.temp.x *= 0.255 / Math.max(radius, 0.001);
              this.temp.z *= 0.255 / Math.max(radius, 0.001);
              root.localToWorld(this.temp);
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
    };
  }
}
