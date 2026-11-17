import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { random } from "../config";
import { heightAt, terrainMaterial } from "./terrain";
import {
  WindSystem,
  WIND_GLSL as SHARED_WIND_GLSL,
} from "../environment/WindSystem";
import { tagAsciiSurface, SURFACE_TAG } from "../rendering/SurfaceStyle";
export const WIND_GLSL =
  SHARED_WIND_GLSL +
  `
vec3 bendGrass(vec3 p,vec3 world,vec3 actor,vec3 axisX,vec3 axisZ){
 float h=max(0.,p.y),anchor=clamp(h/1.25,0.,1.);
 // Sample the actual blade position, so a tuft's tips don't march in rigid lockstep.
 vec2 fieldPosition=world.xz+axisX.xz*p.x+axisZ.xz*p.z;
 vec3 field=sharedWind(fieldPosition);
 float bend=pow(anchor,1.65);
 vec3 force=vec3(windDirection.x,0.,windDirection.y)*field.x*bend*.72;
 vec3 crossWind=vec3(-windDirection.y,0.,windDirection.x);
 force+=crossWind*field.z*bend*.26;
 p.y-=field.x*bend*h*.21;
 float proximity=1.-smoothstep(.25,.9,distance(world.xz,actor.xz));
 force+=vec3(world.x-actor.x,0.,world.z-actor.z)*proximity*anchor*.18;
 p.x+=dot(force,axisX);p.z+=dot(force,axisZ);
 return p;
}
`;
/** Curved, tapered blades are authored into five different coherent tufts. */
export function grassTemplate(variant: number, sparse = false) {
  const rng = random(315 + variant * 97),
    parts: T.BufferGeometry[] = [];
  const count = sparse ? 4 : 7 + variant * 2;
  for (let blade = 0; blade < count; blade++) {
    const height = 0.58 + rng() * 0.78,
      width = 0.005 + rng() * 0.009,
      bend = 0.19 + rng() * 0.47,
      angle = rng() * Math.PI * 2;
    const ox = (rng() - 0.5) * 0.2,
      oz = (rng() - 0.5) * 0.2;
    const vertices: number[] = [],
      indices: number[] = [];
    for (let row = 0; row <= 6; row++) {
      const t = row / 6,
        c = Math.pow(t, 1.5) * bend,
        w = width * Math.pow(1 - t, 0.7);
      for (const side of [-1, 1]) {
        const bx = side * w + Math.sin(t * 2 + variant) * 0.025 * t;
        const bz = c;
        vertices.push(
          ox + Math.cos(angle) * bx + Math.sin(angle) * bz,
          (t - 0.18 * t * t * t) * height,
          oz - Math.sin(angle) * bx + Math.cos(angle) * bz,
        );
      }
      if (row) {
        const k = row * 2;
        indices.push(k - 2, k - 1, k, k - 1, k + 1, k);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    parts.push(g);
  }
  const geometry = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  if (!geometry) throw new Error("Grass template merge failed");
  return geometry;
}
export class Grass {
  readonly group = new T.Group();
  readonly batches: T.InstancedMesh[] = [];

  private actor = { value: new T.Vector3() };
  visibleInstances = 0;
  constructor(
    scene: T.Scene,
    readonly wind: WindSystem = new WindSystem(),
  ) {
    this.group.name = "Clustered bent meadow grass";
    scene.add(this.group);
    const rng = random(84751),
      dummy = new T.Object3D(),
      color = new T.Color();
    const material = new T.MeshStandardMaterial({
      color: "#9da49c",
      roughness: 0.96,
      metalness: 0,
      side: T.DoubleSide,
    });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.wind.uniforms);
      shader.uniforms.actor = this.actor;
      shader.vertexShader =
        "uniform vec3 actor;\n" + WIND_GLSL + "\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        mat4 grassWorld=modelMatrix*instanceMatrix;
        vec3 base=(grassWorld*vec4(0.,0.,0.,1.)).xyz;
        transformed=bendGrass(transformed,base,actor,normalize(grassWorld[0].xyz),normalize(grassWorld[2].xyz));
      `,
      );
    };
    tagAsciiSurface(material, SURFACE_TAG.grass);
    // Tiles allow camera-distance culling and coarse outer tufts without changing thousands of transforms per frame.
    for (let tx = -5; tx <= 5; tx++)
      for (let tz = -5; tz <= 5; tz++) {
        const cx = tx * 12,
          cz = tz * 12,
          outer = Math.hypot(cx, cz) > 35,
          capacity = outer ? 90 : 230;
        const variant = (((tx * 7 + tz * 3) % 5) + 5) % 5;
        const mesh = new T.InstancedMesh(
          grassTemplate(variant, outer),
          material,
          capacity,
        );
        mesh.name = `Grass tile ${tx},${tz}`;
        let count = 0;
        // Blades grow around shared tussock centers; low-frequency field makes clearings and dense banks.
        for (let patch = 0; patch < capacity / 5; patch++) {
          const px = cx + (rng() - 0.5) * 12,
            pz = cz + (rng() - 0.5) * 12;
          const coverage =
            0.5 +
            0.3 * Math.sin(px * 0.19 + pz * 0.07) +
            0.2 * Math.cos(pz * 0.23 - px * 0.1);
          if (rng() > coverage) continue;
          const tufts = 3 + Math.floor(rng() * 4);
          for (let j = 0; j < tufts && count < capacity; j++) {
            const a = rng() * Math.PI * 2,
              r = Math.sqrt(rng()) * 0.75,
              x = px + Math.cos(a) * r,
              z = pz + Math.sin(a) * r;
            if (terrainMaterial(x, z) === "stone" && rng() > 0.13) continue;
            dummy.position.set(x, heightAt(x, z) - 0.012, z);
            dummy.rotation.set(0, rng() * Math.PI * 2, 0);
            const h = 0.65 + rng() * 0.55;
            dummy.scale.set(0.7 + rng() * 0.7, h, 0.7 + rng() * 0.7);
            dummy.updateMatrix();
            mesh.setMatrixAt(count, dummy.matrix);
            color.setScalar(0.55 + rng() * 0.45);
            mesh.setColorAt(count, color);
            count++;
          }
        }
        mesh.count = count;
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingBox();
        mesh.computeBoundingSphere();
        mesh.userData.center = new T.Vector2(cx, cz);
        this.batches.push(mesh);
        this.group.add(mesh);
      }
  }
  update(time: number, actor: T.Vector3, camera: T.Vector3) {
    void time;
    this.actor.value.copy(actor);
    this.visibleInstances = 0;
    for (const batch of this.batches) {
      const center = batch.userData.center as T.Vector2;
      const d = Math.hypot(center.x - camera.x, center.y - camera.z);
      const nearActor = Math.hypot(center.x - actor.x, center.y - actor.z) < 20;
      batch.visible = d < 65 || (nearActor && camera.distanceTo(actor) > 40);
      if (batch.visible) this.visibleInstances += batch.count;
    }
  }
}
