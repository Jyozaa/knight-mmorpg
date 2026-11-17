import * as T from "three";
import type { Rig } from "./buildArmor";
import { WindSystem, WIND_GLSL } from "../../environment/WindSystem";
import { tagAsciiSurface, SURFACE_TAG } from "../../rendering/SurfaceStyle";
export class Cape {
  private speed = { value: 0 };
  private rest = { value: 0 };
  readonly meshes: T.Mesh[] = [];
  constructor(
    rig: Rig,
    readonly wind: WindSystem = new WindSystem(),
  ) {
    const g = new T.PlaneGeometry(0.72, 1.19, 20, 30),
      p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        t = (0.595 - p.getY(i)) / 1.19;
      p.setXYZ(
        i,
        x * (0.64 + 0.65 * t),
        -t * 1.19,
        Math.cos(x * 37) * (0.024 + 0.03 * t) - 0.025 - t * 0.065,
      );
      if (t > 0.96)
        p.setY(
          i,
          p.getY(i) + 0.023 * Math.sin(x * 73) + 0.012 * Math.sin(x * 113),
        );
    }
    g.computeVertexNormals();
    const material = new T.MeshStandardMaterial({
      color: "#871522",
      roughness: 0.95,
      fog: false,
      side: T.DoubleSide,
    });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.wind.uniforms);
      shader.uniforms.clothSpeed = this.speed;
      shader.uniforms.restBlend = this.rest;
      shader.vertexShader =
        "uniform float clothSpeed,restBlend;\n" +
        WIND_GLSL +
        "\n" +
        shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float hem=1.-uv.y;
        vec3 fieldPosition=(modelMatrix*vec4(position,1.)).xyz;
        vec3 field=sharedWind(fieldPosition.xz);
        float fold=cos(position.x*37.-hem*1.4);
        transformed.z=mix(position.z,-.02+fold*.018,restBlend);
        vec3 force=vec3(windDirection.x,0.,windDirection.y)*(field.x*.23+field.y*.13)*hem*hem;
        force+=vec3(-windDirection.y,0.,windDirection.x)*field.z*hem*.13;
        force.y=abs(field.z)*hem*.05;
        mat3 basis=mat3(modelMatrix);
        vec3 localForce=vec3(dot(force,normalize(basis[0])),dot(force,normalize(basis[1])),dot(force,normalize(basis[2])));
        transformed+=localForce;
        transformed.z-=clothSpeed*.012*hem*hem*(1.-restBlend);
      `,
      );
    };
    tagAsciiSurface(material, SURFACE_TAG.cloth);
    const cape = new T.Mesh(g, material);
    cape.name = "Crimson wool cloak — shared wind";
    cape.position.set(0, 0.18, -0.16);
    cape.castShadow = false;
    rig.chest.add(cape);
    this.meshes.push(cape);
    for (const side of [-1, 1]) {
      const panel = new T.Mesh(
        new T.PlaneGeometry(0.16, 0.38, 4, 12),
        material,
      );
      panel.name = "Split crimson tabard";
      panel.position.set(side * -0.035, -0.2, 0.155);
      panel.rotation.x = 0.1;
      rig.thighs[side < 0 ? 0 : 1].add(panel);
      this.meshes.push(panel);
    }
  }
  update(_time: number, speed: number, rest: number) {
    this.speed.value = speed;
    this.rest.value = rest;
  }
}
