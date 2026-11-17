import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { random } from "../config";
import { heightAt } from "./terrain";
import {
  WindSystem,
  WIND_GLSL as SHARED_WIND_GLSL,
} from "../environment/WindSystem";
import { tagAsciiSurface, SURFACE_TAG } from "../rendering/SurfaceStyle";
export const WIND_GLSL =
  SHARED_WIND_GLSL +
  `
uniform float grassRest,grassIllustration;
uniform vec2 grassHeading;
vec3 bendGrass(vec3 p,vec3 world,vec3 actor,vec3 axisX,vec3 axisZ){
 float h=max(0.,p.y),anchor=clamp(h/1.15,0.,1.);
 vec2 fieldPosition=world.xz+axisX.xz*p.x+axisZ.xz*p.z;
 // Delayed sampling along the blade gives traveling bends and elastic-looking recovery.
 vec3 field=sharedWind(fieldPosition-windDirection*anchor*1.2);
 float bend=pow(anchor,1.65);
 float seed=fract(sin(dot(world.xz,vec2(12.7,8.3)))*4345.);
 float sway=sin(windTime*(1.05+seed*.35)-dot(fieldPosition,windDirection)*.19+seed*.5)*(.09+field.x*.10);
 float lateral=sin(windTime*1.13-dot(fieldPosition,vec2(.17,.23)))*(.025+field.x*.065);
 float flutter=sin(windTime*6.4-dot(fieldPosition,vec2(.71,.43))+h*8.)*field.x*.027;
 vec3 force=vec3(windDirection.x,0.,windDirection.y)*(field.x*1.02+sway+flutter)*bend;
 force+=vec3(-windDirection.y,0.,windDirection.x)*(field.z*.38+lateral+flutter)*bend;
 p.y-=field.x*bend*h*.24;
 float proximity=1.-smoothstep(.2,.65,distance(world.xz,actor.xz));
 force+=vec3(world.x-actor.x,0.,world.z-actor.z)*proximity*anchor*.28;
 if(grassIllustration>.5){
   vec2 relative=world.xz-actor.xz;
   vec2 closest=grassHeading*clamp(dot(relative,grassHeading),-1.2*grassRest,.65*grassRest);
   vec2 outward=relative-closest;
   float contact=1.-smoothstep(.23,.67+.93*grassRest,length(outward));
   vec2 flattened=normalize(outward+vec2(.001))*(.13+.42*grassRest)*contact*bend;
   force+=vec3(flattened.x,0.,flattened.y);
   p.y*=.78*(1.-(.42+.40*grassRest)*contact*anchor);
 }
 p.x+=dot(force,axisX);p.z+=dot(force,axisZ);return p;
}
`;
/** Shared authored blade fans. Coarse fans cover more ground, rather than leaving empty distant tiles. */
export function grassTemplate(
  variant: number,
  coarse: boolean | number = false,
) {
  const lod = Number(coarse),
    rng = random(315 + variant * 97 + lod * 143),
    parts: T.BufferGeometry[] = [];
  const count = lod === 0 ? 10 + variant : lod === 1 ? 7 : 5,
    segments = lod === 0 ? 5 : lod === 1 ? 3 : 2;
  for (let b = 0; b < count; b++) {
    const height = 0.48 + rng() * 0.67,
      width = (lod === 2 ? 0.018 : 0.007) + rng() * 0.012,
      bend = 0.16 + rng() * 0.46,
      angle = rng() * Math.PI * 2;
    const spread = lod === 0 ? 0.32 : lod === 1 ? 0.53 : 0.78,
      ox = (rng() - 0.5) * spread * 2,
      oz = (rng() - 0.5) * spread * 2;
    const vertices: number[] = [],
      uvs: number[] = [],
      indices: number[] = [];
    for (let row = 0; row <= segments; row++) {
      const t = row / segments,
        c = Math.pow(t, 1.7) * bend,
        w = width * Math.pow(1 - t, 0.65);
      for (const side of [-1, 1]) {
        const x = side * w + Math.sin(t * 3 + variant) * 0.035 * t;
        vertices.push(
          ox + Math.cos(angle) * x + Math.sin(angle) * c,
          (t - 0.08 * t * t * t) * height,
          oz - Math.sin(angle) * x + Math.cos(angle) * c,
        );
        uvs.push((side + 1) / 2, t);
      }
      if (row) {
        const k = row * 2;
        indices.push(k - 2, k - 1, k, k - 1, k + 1, k);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    parts.push(g);
  }
  const g = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  return g;
}
const TILE = 16,
  EXTENT = 13;
export interface GrassComposition {
  direction: T.Vector2;
  travel: number;
  rest: number;
  heading: number;
}
export class Grass {
  readonly group = new T.Group();
  readonly batches: T.InstancedMesh[] = [];
  private actor = { value: new T.Vector3() };
  private compositionUniforms = {
    grassRest: { value: 0 },
    grassIllustration: { value: 0 },
    grassHeading: { value: new T.Vector2(0, 1) },
  };
  visibleInstances = 0;
  constructor(
    scene: T.Scene,
    readonly wind: WindSystem = new WindSystem(),
  ) {
    this.group.name = "Continuous hillside meadow — three overlapping scales";
    scene.add(this.group);
    const material = new T.MeshStandardMaterial({
      color: "#a7ada0",
      roughness: 0.95,
      side: T.DoubleSide,
    });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.wind.uniforms);
      Object.assign(shader.uniforms, this.compositionUniforms);
      shader.uniforms.actor = this.actor;
      shader.vertexShader =
        "uniform vec3 actor;\nvarying float bladeHeight;\n" +
        WIND_GLSL +
        shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
    mat4 grassWorld=modelMatrix*instanceMatrix;vec3 base=(grassWorld*vec4(0.,0.,0.,1.)).xyz;
    bladeHeight=uv.y;
    transformed=bendGrass(transformed,base,actor,normalize(grassWorld[0].xyz),normalize(grassWorld[2].xyz));`,
      );
      shader.fragmentShader =
        "varying float bladeHeight;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        "#include <color_fragment>\n diffuseColor.rgb*=mix(.27,1.,sqrt(bladeHeight));",
      );
    };
    tagAsciiSurface(material, SURFACE_TAG.grass);
    const templates = Array.from({ length: 3 }, (_, l) =>
      Array.from({ length: 5 }, (_, v) => grassTemplate(v, l)),
    );
    const dummy = new T.Object3D(),
      color = new T.Color();
    for (let tx = -EXTENT; tx <= EXTENT; tx++)
      for (let tz = -EXTENT; tz <= EXTENT; tz++)
        for (let lod = 0; lod < 3; lod++) {
          // Every stratum is populated. No rejection, path exclusion or probabilistic clearing.
          const grid = [26, 16, 12][lod],
            rng = random((tx + 20) * 1719 + (tz + 20) * 631 + lod * 97),
            cx = tx * TILE,
            cz = tz * TILE;
          const variant = Math.abs(tx * 7 + tz * 3) % 5;
          const mesh = new T.InstancedMesh(
            templates[lod][variant],
            material,
            grid * grid,
          );
          mesh.name = `Meadow ${tx},${tz} LOD ${lod}`;
          for (let x = 0; x < grid; x++)
            for (let z = 0; z < grid; z++) {
              const px =
                  cx -
                  TILE / 2 +
                  ((x + 0.5 + (rng() - 0.5) * 0.42) * TILE) / grid,
                pz =
                  cz -
                  TILE / 2 +
                  ((z + 0.5 + (rng() - 0.5) * 0.42) * TILE) / grid;
              dummy.position.set(px, heightAt(px, pz) - 0.008, pz);
              dummy.rotation.set(0, rng() * Math.PI * 2, 0);
              const h = 0.68 + rng() * 0.48;
              dummy.scale.set(1, h, 1);
              dummy.updateMatrix();
              mesh.setMatrixAt(x * grid + z, dummy.matrix);
              color.setScalar((lod === 2 ? 0.52 : 0.72) + rng() * 0.28);
              mesh.setColorAt(x * grid + z, color);
            }
          mesh.instanceMatrix.needsUpdate = true;
          mesh.computeBoundingBox();
          mesh.computeBoundingSphere();
          mesh.boundingSphere!.radius += 1.8;
          mesh.userData = { center: new T.Vector2(cx, cz), lod, grid };
          this.batches.push(mesh);
          this.group.add(mesh);
        }
  }
  update(
    _time: number,
    actor: T.Vector3,
    camera: T.Vector3,
    composition?: GrassComposition,
  ) {
    this.actor.value.copy(actor);
    this.compositionUniforms.grassIllustration.value = composition ? 1 : 0;
    this.compositionUniforms.grassRest.value = composition?.rest ?? 0;
    this.compositionUniforms.grassHeading.value.set(
      Math.sin(composition?.heading ?? 0),
      Math.cos(composition?.heading ?? 0),
    );
    this.visibleInstances = 0;
    for (const b of this.batches) {
      const c = b.userData.center as T.Vector2,
        d = Math.hypot(c.x - camera.x, c.y - camera.z),
        nearActor = Math.hypot(c.x - actor.x, c.y - actor.z);
      if (composition) {
        const depth =
          (c.x - actor.x) * composition.direction.x +
          (c.y - actor.z) * composition.direction.y;
        const factor =
          depth > 2
            ? -0.014 * (1 - Math.exp(-(depth - 2) / 8))
            : 0.04 * (1 - Math.exp(Math.min(0, depth + 3) / 12));
        const shift = 0.65 * Math.tanh((composition.travel * factor) / 0.65);
        const sx = composition.direction.y * shift,
          sz = -composition.direction.x * shift;
        b.position.set(
          sx,
          heightAt(c.x + sx, c.y + sz) - heightAt(c.x, c.y),
          sz,
        );
      } else b.position.set(0, 0, 0);
      // The far layer is never distance-culled. Overlap at transitions prevents bare bands.
      b.visible =
        b.userData.lod === 2 ||
        (b.userData.lod === 1 && (d < 82 || nearActor < 26)) ||
        (b.userData.lod === 0 && (d < 29 || nearActor < 14));
      if (b.visible) this.visibleInstances += b.count;
    }
  }
  get diagnostics() {
    return {
      tiles: (EXTENT * 2 + 1) ** 2,
      extent: (EXTENT + 0.5) * TILE,
      spacing: [TILE / 26, TILE / 16, TILE / 12],
      coverage: "all strata populated; far layer retained",
    };
  }
}
