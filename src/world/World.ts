import * as T from "three";
import { heightAt, terrainMaterial, type Obstacle } from "./terrain";
import { random } from "../config";
export class World {
  readonly scene = new T.Scene();
  readonly obstacles: Obstacle[] = [];
  readonly rest = new T.Vector3(0, heightAt(0, -3), -3);
  private wind = { value: 0 };
  private motes: T.Points;
  constructor() {
    const scene = this.scene;
    scene.background = new T.Color("#10171b");
    scene.fog = new T.FogExp2("#151b20", 0.0055);
    scene.add(new T.HemisphereLight("#b7c6d6", "#33312b", 2.0));
    const sun = new T.DirectionalLight("#ffe1ad", 3.8);
    sun.position.set(-40, 45, -35);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -55;
    sun.shadow.camera.right = 55;
    sun.shadow.camera.top = 55;
    sun.shadow.camera.bottom = -55;
    sun.shadow.camera.far = 180;
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.04;
    scene.add(sun);
    const rim = new T.DirectionalLight("#c4daef", 1.5);
    rim.position.set(20, 12, 30);
    scene.add(rim);
    const sky = new T.Mesh(
      new T.SphereGeometry(600, 32, 24),
      new T.ShaderMaterial({
        side: T.BackSide,
        depthWrite: false,
        uniforms: {},
        vertexShader: `varying vec3 dir;void main(){dir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `varying vec3 dir;void main(){vec3 d=normalize(dir);float horizon=pow(1.-abs(d.y),5.);vec3 c=mix(vec3(.018,.028,.042),vec3(.055,.065,.075),horizon);float s=pow(max(0.,dot(d,normalize(vec3(-.43,.19,-.85)))),2800.);float glow=pow(max(0.,dot(d,normalize(vec3(-.43,.19,-.85)))),25.);c+=vec3(.09,.07,.04)*glow+vec3(1.,.85,.57)*s;gl_FragColor=vec4(c,1.);}`,
      }),
    );
    scene.add(sky);
    const geometry = new T.PlaneGeometry(430, 430, 220, 220);
    geometry.rotateX(-Math.PI / 2);
    const pos = geometry.attributes.position;
    const colors = [];
    const c = new T.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        z = pos.getZ(i);
      const y = heightAt(x, z);
      pos.setY(i, y);
      const path = terrainMaterial(x, z) === "stone";
      c.set(path ? "#58544b" : "#454941");
      const shade =
        0.75 +
        0.22 * Math.sin(x * 0.34) * Math.cos(z * 0.31) +
        0.14 * Math.sin(x * 0.72 + z * 0.23);
      c.multiplyScalar(shade);
      colors.push(c.r, c.g, c.b);
    }
    geometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const ground = new T.Mesh(
      geometry,
      new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
    );
    ground.receiveShadow = true;
    scene.add(ground);
    const rng = random(9218);
    const dummy = new T.Object3D();
    const grassGeo = new T.PlaneGeometry(0.1, 0.65, 1, 3);
    grassGeo.translate(0, 0.325, 0);
    const blades = grassGeo.attributes.position;
    for (let i = 0; i < blades.count; i++)
      blades.setX(i, blades.getX(i) * (1 - blades.getY(i) / 0.65));
    const grassMat = new T.MeshStandardMaterial({
      color: "#747363",
      roughness: 1,
      side: T.DoubleSide,
    });
    grassMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.wind;
      shader.vertexShader = "uniform float uTime;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
      float gust=sin(uTime*1.1+instanceMatrix[3].x*.19+instanceMatrix[3].z*.13);
      transformed.x+=gust*.22*pow(position.y,2.)+sin(uTime*2.+instanceMatrix[3].z)*.06*position.y;
    `,
      );
    };
    const grass = new T.InstancedMesh(grassGeo, grassMat, 28000);
    grass.frustumCulled = false;
    for (let i = 0; i < 28000; i++) {
      const r = Math.sqrt(rng()) * (i < 10000 ? 28 : 115),
        a = rng() * Math.PI * 2,
        x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      dummy.position.set(x, heightAt(x, z) - 0.05, z);
      dummy.rotation.set(0, rng() * 6.28, 0);
      const s = 0.4 + rng() * 1.15;
      dummy.scale.set(1, s, 1);
      if (terrainMaterial(x, z) === "stone") dummy.scale.setScalar(0.12);
      dummy.updateMatrix();
      grass.setMatrixAt(i, dummy.matrix);
      c.setHSL(0.13, 0.09, 0.23 + rng() * 0.18);
      grass.setColorAt(i, c);
    }
    scene.add(grass);
    const rockGeo = new T.DodecahedronGeometry(1, 0),
      rockMat = new T.MeshStandardMaterial({
        color: "#747570",
        roughness: 0.9,
        flatShading: true,
      });
    const rocks = new T.InstancedMesh(rockGeo, rockMat, 200);
    for (let i = 0; i < 200; i++) {
      let x = (rng() - 0.5) * 260,
        z = (rng() - 0.5) * 250;
      if (Math.hypot(x, z) < 9) x += 12;
      const s = 0.3 + rng() * 2;
      dummy.position.set(x, heightAt(x, z) + s * 0.16, z);
      dummy.rotation.set(rng(), rng() * 6.28, rng());
      dummy.scale.set(s, s * 0.65, s * 0.8);
      dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);
      this.obstacles.push({ x, z, radius: s * 0.8, height: s * 1.5 });
    }
    rocks.castShadow = true;
    rocks.receiveShadow = true;
    scene.add(rocks);
    const trunks = new T.InstancedMesh(
      new T.CylinderGeometry(0.22, 0.4, 4, 5),
      new T.MeshStandardMaterial({ color: "#3c3d3a" }),
      180,
    );
    const leaves = new T.InstancedMesh(
      new T.ConeGeometry(2.8, 8, 7),
      new T.MeshStandardMaterial({ color: "#303d3b", flatShading: true }),
      540,
    );
    for (let i = 0; i < 180; i++) {
      const a = rng() * Math.PI * 2,
        r = 38 + rng() * 120,
        x = Math.cos(a) * r,
        z = Math.sin(a) * r - 25,
        s = 0.5 + rng();
      dummy.position.set(x, heightAt(x, z) + 2 * s, z);
      dummy.rotation.set(0, rng() * 6, 0);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      for (let j = 0; j < 3; j++) {
        dummy.position.y = heightAt(x, z) + (4 + j * 1.9) * s;
        dummy.scale.set(
          s * (1 - j * 0.18),
          s * (1 - j * 0.15),
          s * (1 - j * 0.18),
        );
        dummy.updateMatrix();
        leaves.setMatrixAt(i * 3 + j, dummy.matrix);
      }
      this.obstacles.push({ x, z, radius: 0.45 * s, height: 11 * s });
    }
    trunks.castShadow = true;
    leaves.castShadow = true;
    scene.add(trunks, leaves);
    // Distant silhouettes are actual geometry and remain visible in the pullback.
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2,
        r = 230 + rng() * 70,
        h = 35 + rng() * 70;
      const peak = new T.Mesh(
        new T.ConeGeometry(35 + rng() * 45, h, 6),
        new T.MeshStandardMaterial({
          color: i % 2 ? "#59626a" : "#444e59",
          flatShading: true,
        }),
      );
      const verts = peak.geometry.attributes.position;
      for (let j = 0; j < verts.count; j++) {
        const vx = verts.getX(j),
          vy = verts.getY(j),
          vz = verts.getZ(j);
        verts.setXYZ(
          j,
          vx * (1 + 0.25 * Math.sin(vz * 0.11 + i)),
          vy + 6 * Math.sin(vx * 0.09 + i) * Math.cos(vz * 0.07),
          vz,
        );
      }
      peak.geometry.computeVertexNormals();
      peak.position.set(Math.cos(a) * r, h * 0.18 - 4, Math.sin(a) * r);
      peak.rotation.y = rng() * 6;
      scene.add(peak);
    }
    this.tower(-35, -82);
    // A small weathered waystone marks the rest point, without a floating game marker.
    const marker = new T.Mesh(new T.BoxGeometry(0.4, 1.1, 0.25), rockMat);
    marker.position.copy(this.rest).add(new T.Vector3(2.4, 0.5, 0));
    marker.rotation.z = -0.13;
    scene.add(marker);
    const ring = new T.Mesh(
      new T.TorusGeometry(0.18, 0.025, 5, 20),
      new T.MeshBasicMaterial({ color: "#a59167" }),
    );
    ring.position.copy(marker.position).add(new T.Vector3(0, 0.15, 0.15));
    scene.add(ring);
    const pts = new Float32Array(160 * 3);
    for (let i = 0; i < 160; i++) {
      pts[i * 3] = (rng() - 0.5) * 80;
      pts[i * 3 + 1] = 10 + rng() * 18;
      pts[i * 3 + 2] = (rng() - 0.5) * 80;
    }
    this.motes = new T.Points(
      new T.BufferGeometry().setAttribute(
        "position",
        new T.BufferAttribute(pts, 3),
      ),
      new T.PointsMaterial({
        color: "#b5ab91",
        size: 0.075,
        transparent: true,
        opacity: 0.55,
      }),
    );
    scene.add(this.motes);
  }
  private tower(x: number, z: number) {
    const group = new T.Group();
    group.position.set(x, heightAt(x, z), z);
    this.scene.add(group);
    const stone = new T.MeshStandardMaterial({
      color: "#89877e",
      roughness: 1,
      flatShading: true,
    });
    const box = (
      w: number,
      h: number,
      d: number,
      px: number,
      py: number,
      pz: number,
    ) => {
      const m = new T.Mesh(new T.BoxGeometry(w, h, d), stone);
      m.position.set(px, py, pz);
      group.add(m);
      return m;
    };
    box(6, 2, 6, 0, 1, 0);
    box(5, 9, 5, 0, 5, 0);
    for (const a of [-1, 1])
      for (const b of [-1, 1]) box(0.85, 7, 0.85, a * 2.1, 12.5, b * 2.1);
    box(5.4, 0.7, 5.4, 0, 16, 0);
    box(1.1, 2, 0.9, -2, 17, -2);
    box(0.8, 1.2, 0.8, 2, 16.6, 2);
    for (let i = 0; i < 7; i++) box(0.6, 0.5, 0.8, -2 + i * 0.7, 16.6, 2.2);
    const bell = new T.Mesh(
      new T.CylinderGeometry(0.7, 1.2, 1.5, 14, 1, true),
      new T.MeshStandardMaterial({
        color: "#b59a62",
        metalness: 0.4,
        side: T.DoubleSide,
      }),
    );
    bell.position.y = 13.4;
    group.add(bell);
    box(0.12, 2, 0.12, 0, 14.7, 0);
    this.obstacles.push({ x, z, radius: 4.1, height: 18 });
    // Broken walls and fallen stones around the tower.
    for (let i = 0; i < 12; i++) {
      const m = box(
        1.5,
        1,
        1.2,
        Math.sin(i * 2.4) * 8,
        0.4,
        Math.cos(i * 1.8) * 8,
      );
      m.rotation.set(0.2, i, 0.3);
    }
  }
  update(time: number) {
    this.wind.value = time;
    this.motes.rotation.y = Math.sin(time * 0.015) * 0.1;
    this.motes.position.y = Math.sin(time * 0.2) * 0.3;
  }
}
