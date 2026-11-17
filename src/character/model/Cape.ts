import * as T from "three";
import type { Rig } from "./buildArmor";
export class Cape {
  private time = { value: 0 };
  private speed = { value: 0 };
  private rest = { value: 0 };
  constructor(rig: Rig) {
    const g = new T.PlaneGeometry(0.48, 0.91, 14, 22);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        t = (0.455 - p.getY(i)) / 0.91;
      p.setXYZ(
        i,
        x * (0.88 + 0.26 * t),
        -t * 0.91,
        0.035 * Math.cos(x * 44) * (t * 0.75 + 0.25) - 0.03 - t * 0.1,
      );
    }
    g.computeVertexNormals();
    const m = new T.MeshStandardMaterial({
      color: "#626361",
      roughness: 1,
      side: T.DoubleSide,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.clothTime = this.time;
      shader.uniforms.clothSpeed = this.speed;
      shader.uniforms.restBlend = this.rest;
      shader.vertexShader =
        "uniform float clothTime, clothSpeed, restBlend;\n" +
        shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float hem=clamp(-position.y/.91,0.,1.);
        float wave=sin(clothTime*1.8+position.x*9.-hem*2.4)*.035+sin(clothTime*.7-hem*3.)*.018;
        transformed.z-=hem*hem*(.045+clothSpeed*.017)+wave*hem;
        transformed.z=mix(transformed.z,transformed.z*.17,restBlend);
        transformed.y+=sin(position.x*38.)*.013*hem*hem;
      `,
      );
    };
    const mesh = new T.Mesh(g, m);
    mesh.name = "Pleated wool shoulder mantle";
    mesh.position.set(0, 0.18, -0.14);
    mesh.castShadow = false;
    rig.chest.add(mesh);
    // Split, narrow cloth panels expose the leg armor and avoid the prototype's rectangular back.
    for (const side of [-1, 1]) {
      const tabard = new T.Mesh(new T.PlaneGeometry(0.13, 0.32, 3, 8), m);
      tabard.position.set(side * -0.04, -0.2, 0.14);
      tabard.rotation.x = 0.1;
      rig.thighs[side < 0 ? 0 : 1].add(tabard);
    }
  }
  update(time: number, speed: number, rest: number) {
    this.time.value = time;
    this.speed.value = speed;
    this.rest.value = rest;
  }
}
