import * as T from "three";
import type { Settings } from "../config";

const vertex = `varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,0.,1.);}`;
const historyFragment = `
precision highp float;
uniform sampler2D sceneTex, previous, depthTex;
uniform vec2 cells, texel;
uniform float initialized;
varying vec2 vUv;
void main(){
 vec2 p=(floor(vUv*cells)+.5)/cells;
 vec2 d=.24/cells;
 vec3 c=(texture2D(sceneTex,p+vec2(d.x,d.y)).rgb+texture2D(sceneTex,p-d).rgb+texture2D(sceneTex,p+vec2(-d.x,d.y)).rgb+texture2D(sceneTex,p+vec2(d.x,-d.y)).rgb)*.25;
 float lum=dot(c,vec3(.299,.587,.114));
 // A small depth discontinuity boosts narrow silhouettes, never a visible polygon layer.
 float z=texture2D(depthTex,p).x;
 float edge=abs(z-texture2D(depthTex,p+vec2(1./cells.x,0.)).x);
 lum=clamp(pow(lum*3.2,.60)+min(edge*8.,.045),0.,1.);
 vec4 old=texture2D(previous,p);
 float stable=mix(old.a,lum,.62);
 if(abs(lum-old.a)<.024) stable=old.a;
 gl_FragColor=vec4(c,mix(lum,stable,initialized));
}`;
const glyphFragment = `
precision highp float;
uniform sampler2D field, atlas;
uniform vec2 cells, resolution;
varying vec2 vUv;
void main(){
 vec2 cell=floor(vUv*cells), local=fract(vUv*cells);
 vec4 s=texture2D(field,(cell+.5)/cells);
 float index=min(15.,floor(s.a*16.));
 float glyph=texture2D(atlas,vec2((index+local.x)/16.,local.y)).r;
 vec3 tint=s.rgb/(max(dot(s.rgb,vec3(.299,.587,.114)),.08));
 tint=mix(vec3(.88,.91,.93),tint,.32);
 float ink=mix(.06,1.25,pow(s.a,1.6));
 vec2 uv=vUv-.5;
 float vignette=1.-.58*dot(uv,uv);
 gl_FragColor=vec4(vec3(.012,.016,.019)+glyph*ink*tint*vignette,1.);
}`;
export class AsciiRenderer {
  readonly renderer: T.WebGLRenderer;
  private target = new T.WebGLRenderTarget(1, 1, { depthBuffer: true });
  private history = [
    new T.WebGLRenderTarget(1, 1),
    new T.WebGLRenderTarget(1, 1),
  ];
  private passScene = new T.Scene();
  private camera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private quad: T.Mesh<T.PlaneGeometry, T.ShaderMaterial>;
  private updateMaterial: T.ShaderMaterial;
  private glyphMaterial: T.ShaderMaterial;
  private index = 0;
  columns = 0;
  rows = 0;
  drawCalls = 0;
  constructor(
    container: HTMLElement,
    private settings: Settings,
  ) {
    this.renderer = new T.WebGLRenderer({
      antialias: false,
      powerPreference: "high-performance",
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = T.LinearSRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.renderer.info.autoReset = false;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Real-time 3D ASCII landscape",
    );
    container.appendChild(this.renderer.domElement);
    this.target.depthTexture = new T.DepthTexture(1, 1);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 48;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 512, 48);
    ctx.font = "bold 35px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    Array.from(" .,:;i+*ox%&#@MW").forEach((c, i) =>
      ctx.fillText(c, i * 32 + 16, 25),
    );
    const atlas = new T.CanvasTexture(canvas);
    atlas.minFilter = T.LinearFilter;
    atlas.magFilter = T.LinearFilter;
    this.updateMaterial = new T.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: historyFragment,
      uniforms: {
        sceneTex: { value: this.target.texture },
        previous: { value: null },
        depthTex: { value: this.target.depthTexture },
        cells: { value: new T.Vector2() },
        texel: { value: new T.Vector2() },
        initialized: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.glyphMaterial = new T.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: glyphFragment,
      uniforms: {
        field: { value: null },
        atlas: { value: atlas },
        cells: { value: new T.Vector2() },
        resolution: { value: new T.Vector2() },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new T.Mesh(new T.PlaneGeometry(2, 2), this.updateMaterial);
    this.passScene.add(this.quad);
    this.resize();
  }
  resize() {
    const w = innerWidth,
      h = innerHeight;
    this.renderer.setSize(w, h);
    this.target.setSize(
      Math.round(w * this.settings.quality),
      Math.round(h * this.settings.quality),
    );
    this.columns = Math.max(80, Math.floor((w / 5.4) * this.settings.density));
    this.rows = Math.max(40, Math.floor((h / 8.5) * this.settings.density));
    for (const target of this.history) target.setSize(this.columns, this.rows);
    this.updateMaterial.uniforms.cells.value.set(this.columns, this.rows);
    this.updateMaterial.uniforms.texel.value.set(
      1 / this.target.width,
      1 / this.target.height,
    );
    this.updateMaterial.uniforms.initialized.value = 0;
    this.glyphMaterial.uniforms.cells.value.set(this.columns, this.rows);
    this.glyphMaterial.uniforms.resolution.value.set(w, h);
  }
  render(scene: T.Scene, camera: T.Camera) {
    this.renderer.info.reset();
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(scene, camera);
    this.drawCalls = this.renderer.info.render.calls;
    const next = 1 - this.index;
    this.updateMaterial.uniforms.previous.value =
      this.history[this.index].texture;
    this.quad.material = this.updateMaterial;
    this.renderer.setRenderTarget(this.history[next]);
    this.renderer.render(this.passScene, this.camera);
    this.glyphMaterial.uniforms.field.value = this.history[next].texture;
    this.quad.material = this.glyphMaterial;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.passScene, this.camera);
    this.index = next;
    this.updateMaterial.uniforms.initialized.value = 1;
  }
}
