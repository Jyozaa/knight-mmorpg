import * as T from "three";
import type { Settings } from "../config";
import {
  BLACK_LEVEL,
  HISTORY_DEADBAND,
  HISTORY_DEPTH_TOLERANCE,
} from "./AsciiMath";
import { createGlyphAtlas } from "./GlyphAtlas";
import { GpuProfiler } from "./GpuProfiler";
const vertex = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const historyFragment = `
precision highp float;
uniform sampler2D sceneTex,previous,depthTex;
uniform vec2 cells,texel;
uniform mat4 inverseVP,previousVP,inverseProjection;
uniform float initialized,deltaTime;
varying vec2 vUv;
float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
float tone(float v){return 1.-exp(-max(0.,v-${BLACK_LEVEL})*2.4);}
vec3 viewPosition(vec2 uv,float d){vec4 p=inverseProjection*vec4(uv*2.-1.,d*2.-1.,1.);return p.xyz/p.w;}
void main(){
 vec2 p=(floor(vUv*cells)+.5)/cells;
 vec2 d=.30/cells;
 vec3 center=texture2D(sceneTex,p).rgb;
 vec3 left=texture2D(sceneTex,p-vec2(d.x,0.)).rgb,right=texture2D(sceneTex,p+vec2(d.x,0.)).rgb;
 vec3 top=texture2D(sceneTex,p+vec2(0.,d.y)).rgb,bottom=texture2D(sceneTex,p-vec2(0.,d.y)).rgb;
 vec3 diagonal=(texture2D(sceneTex,p+d).rgb+texture2D(sceneTex,p-d).rgb+texture2D(sceneTex,p+vec2(d.x,-d.y)).rgb+texture2D(sceneTex,p+vec2(-d.x,d.y)).rgb)*.25;
 float mean=lum(center)*.24+(lum(left)+lum(right)+lum(top)+lum(bottom))*.14+lum(diagonal)*.20;
 float peak=max(lum(center),max(max(lum(left),lum(right)),max(lum(top),lum(bottom))));
 // Thin illuminated blades survive subcell averaging; darkness is never globally lifted.
 float value=tone(mix(mean,peak,.20));
 float depth=texture2D(depthTex,p).x;
 float dl=texture2D(depthTex,p-vec2(d.x,0.)).x,dr=texture2D(depthTex,p+vec2(d.x,0.)).x;
 float db=texture2D(depthTex,p-vec2(0.,d.y)).x,du=texture2D(depthTex,p+vec2(0.,d.y)).x;
 vec3 vp=viewPosition(p,depth);
 vec3 vx=viewPosition(p+vec2(d.x,0.),dr)-viewPosition(p-vec2(d.x,0.),dl);
 vec3 vy=viewPosition(p+vec2(0.,d.y),du)-viewPosition(p-vec2(0.,d.y),db);
 vec3 normal=normalize(cross(vx,vy)+vec3(0.,0.,.000001));
 vec2 gradient=vec2(lum(right)-lum(left),lum(top)-lum(bottom));
 float relativeEdge=length(gradient)/(peak+.02);
 // Surface normal curvature and luminance edges choose an oriented ASCII outline.
 float edge=step(.55,relativeEdge)*step(.12,value);
 float angle=atan(gradient.y,gradient.x)+1.5707963;
 float orientation=mod(floor(angle/.7853982+.5)+4.,4.);
 float detail=dot(abs(normal.xy),vec2(.025));
 value=clamp(value+detail*value,0.,1.);
 float encodedDepth=log2(max(.1,-vp.z)+1.)/10.;
 vec4 world=inverseVP*vec4(p*2.-1.,depth*2.-1.,1.);world/=world.w;
 vec4 oldClip=previousVP*world;vec2 oldUv=oldClip.xy/oldClip.w*.5+.5;
 vec4 old=texture2D(previous,oldUv);
 float motion=length((oldUv-p)*cells);
 float valid=initialized*step(0.,oldUv.x)*step(oldUv.x,1.)*step(0.,oldUv.y)*step(oldUv.y,1.);
 valid*=step(abs(encodedDepth-old.b),${HISTORY_DEPTH_TOLERANCE})*step(motion,7.)*step(abs(value-old.r),.22);
 float alpha=1.-exp(-22.*deltaTime);
 float stable=mix(old.r,value,alpha);
 if(abs(value-old.r)<${HISTORY_DEADBAND})stable=old.r;
 value=mix(value,stable,valid);
 // History stores luminance, oriented-edge classification, reprojection depth, and sparse brass tint.
 float warm=clamp((center.r-center.b)/max(.04,lum(center))*1.6,0.,1.);
 float edgeCode=(orientation+edge*4.)/8.;
 if(valid>.5&&motion<.7&&abs(value-old.r)<.035)edgeCode=old.g;
 gl_FragColor=vec4(value,edgeCode,encodedDepth,warm);
}`;
const glyphFragment = `
precision highp float;
uniform sampler2D field,atlas;uniform vec2 cells;
varying vec2 vUv;
void main(){
 vec2 cell=floor(vUv*cells),local=fract(vUv*cells);vec4 s=texture2D(field,(cell+.5)/cells);
 float classification=floor(s.g*8.+.5),edge=step(3.5,classification);
 float index=min(23.,floor(s.r*24.));
 if(edge>.5&&s.r<.67)index=24.+mod(classification,4.);
 float coverage=texture2D(atlas,vec2((index+local.x)/32.,local.y)).r;
 float ink=smoothstep(.005,.12,s.r)*mix(.28,1.15,pow(s.r,.65));
 vec3 tint=mix(vec3(.91,.94,.92),vec3(.91,.81,.59),s.a*.30);
 vec2 uv=vUv-.5;float vignette=1.-.45*dot(uv,uv);
 gl_FragColor=vec4(coverage*ink*tint*vignette,1.);
}`;
export class AsciiRenderer {
  readonly renderer: T.WebGLRenderer;
  readonly profiler: GpuProfiler;
  readonly glyphCharacters: string;
  private target = new T.WebGLRenderTarget(1, 1, {
    depthBuffer: true,
    type: T.HalfFloatType,
    minFilter: T.LinearFilter,
    magFilter: T.LinearFilter,
  });
  private history = [
    new T.WebGLRenderTarget(1, 1, {
      minFilter: T.NearestFilter,
      magFilter: T.NearestFilter,
    }),
    new T.WebGLRenderTarget(1, 1, {
      minFilter: T.NearestFilter,
      magFilter: T.NearestFilter,
    }),
  ];
  private passScene = new T.Scene();
  private camera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private quad: T.Mesh<T.PlaneGeometry, T.ShaderMaterial>;
  private updateMaterial: T.ShaderMaterial;
  private glyphMaterial: T.ShaderMaterial;
  private index = 0;
  private vp = new T.Matrix4();
  private previousVP = new T.Matrix4();
  private inverseVP = new T.Matrix4();
  columns = 0;
  rows = 0;
  drawCalls = 0;
  sceneCpuMs = 0;
  grassCpuMs = 0;
  asciiCpuMs = 0;
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
    this.renderer.toneMapping = T.NoToneMapping;
    this.renderer.info.autoReset = false;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Real-time 3D ASCII landscape",
    );
    container.appendChild(this.renderer.domElement);
    this.target.depthTexture = new T.DepthTexture(1, 1);
    this.profiler = new GpuProfiler(
      this.renderer.getContext() as WebGL2RenderingContext,
    );
    const atlas = createGlyphAtlas();
    this.glyphCharacters = atlas.characters;
    this.updateMaterial = new T.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: historyFragment,
      uniforms: {
        sceneTex: { value: this.target.texture },
        previous: { value: null },
        depthTex: { value: this.target.depthTexture },
        cells: { value: new T.Vector2() },
        texel: { value: new T.Vector2() },
        inverseVP: { value: this.inverseVP },
        previousVP: { value: this.previousVP },
        inverseProjection: { value: new T.Matrix4() },
        initialized: { value: 0 },
        deltaTime: { value: 1 / 60 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.glyphMaterial = new T.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: glyphFragment,
      uniforms: {
        field: { value: null },
        atlas: { value: atlas.atlas },
        cells: { value: new T.Vector2() },
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
    this.columns = Math.max(80, Math.floor((w / 4) * this.settings.density));
    this.rows = Math.max(40, Math.floor((h / 6.4) * this.settings.density));
    for (const target of this.history) target.setSize(this.columns, this.rows);
    this.updateMaterial.uniforms.cells.value.set(this.columns, this.rows);
    this.updateMaterial.uniforms.texel.value.set(
      1 / this.target.width,
      1 / this.target.height,
    );
    this.updateMaterial.uniforms.initialized.value = 0;
    this.glyphMaterial.uniforms.cells.value.set(this.columns, this.rows);
  }
  render(scene: T.Scene, camera: T.Camera, dt = 1 / 60, grass?: T.Group) {
    this.profiler.poll();
    this.renderer.info.reset();
    camera.updateMatrixWorld();
    this.vp.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    this.inverseVP.copy(this.vp).invert();
    this.updateMaterial.uniforms.inverseProjection.value.copy(
      camera.projectionMatrixInverse,
    );
    this.updateMaterial.uniforms.deltaTime.value = dt;
    let start = performance.now();
    this.profiler.begin("scene");
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(scene, camera);
    this.profiler.end();
    this.sceneCpuMs = this.sceneCpuMs * 0.9 + (performance.now() - start) * 0.1;
    this.drawCalls = this.renderer.info.render.calls;
    const next = 1 - this.index;
    this.updateMaterial.uniforms.previous.value =
      this.history[this.index].texture;
    this.quad.material = this.updateMaterial;
    start = performance.now();
    this.profiler.begin("ascii");
    this.renderer.setRenderTarget(this.history[next]);
    this.renderer.render(this.passScene, this.camera);
    this.glyphMaterial.uniforms.field.value = this.history[next].texture;
    this.quad.material = this.glyphMaterial;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.passScene, this.camera);
    this.profiler.end();
    this.asciiCpuMs = this.asciiCpuMs * 0.9 + (performance.now() - start) * 0.1;
    this.index = next;
    this.updateMaterial.uniforms.initialized.value = 1;
    this.previousVP.copy(this.vp);
    // Isolated diagnostic grass pass is opt-in and runs only every 120 frames.
    if (grass && this.profiler.enabled && ++this.profileFrame % 120 === 0) {
      const saved: T.Object3D[] = [];
      for (const child of scene.children)
        if (child !== grass && !(child instanceof T.Light) && child.visible) {
          child.visible = false;
          saved.push(child);
        }
      const shadows = this.renderer.shadowMap.enabled;
      this.renderer.shadowMap.enabled = false;
      const grassStart = performance.now();
      this.profiler.begin("grass");
      this.renderer.setRenderTarget(this.target);
      this.renderer.render(scene, camera);
      this.profiler.end();
      this.grassCpuMs = performance.now() - grassStart;
      this.renderer.shadowMap.enabled = shadows;
      for (const child of saved) child.visible = true;
      this.renderer.setRenderTarget(null);
    }
  }
  private profileFrame = 0;
}
