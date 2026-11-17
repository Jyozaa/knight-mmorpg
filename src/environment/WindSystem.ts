import { Vector2, Vector3 } from "three";
export interface WindParameters {
  directionX: number;
  directionZ: number;
  intensity: number;
  gustStrength: number;
  turbulence: number;
  speed: number;
}
export interface WindSample {
  strength: number;
  gust: number;
  turbulence: number;
  rustle: number;
}
export interface WindAudio {
  gain: number;
  cutoff: number;
  rustleGain: number;
  rustleCutoff: number;
  pan: number;
}
export const DEFAULT_WIND: WindParameters = {
  directionX: Math.cos(0.35),
  directionZ: Math.sin(0.35),
  intensity: 0.34,
  gustStrength: 0.78,
  turbulence: 0.11,
  speed: 2.8,
};
export const WIND_WAVELENGTH = 8.5;
/** CPU and GLSL use the same traveling front and deterministic secondary field. */
export function sampleWind(
  x: number,
  z: number,
  time: number,
  p: WindParameters,
  out: WindSample,
): WindSample {
  const along = x * p.directionX + z * p.directionZ,
    cross = -x * p.directionZ + z * p.directionX;
  const phase = (along - time * p.speed) / WIND_WAVELENGTH;
  const gust = Math.pow(0.5 + 0.5 * Math.sin(phase), 5) * p.gustStrength;
  const turbulence =
    Math.sin(cross * 0.49 + time * 0.83) *
    Math.sin(along * 0.31 - time * 1.3) *
    p.turbulence;
  const strength = Math.max(0, p.intensity + gust * 0.83 + turbulence);
  out.strength = strength;
  out.gust = gust;
  out.turbulence = turbulence;
  out.rustle = strength * 0.65 + gust * 0.38 + Math.abs(turbulence) * 0.6;
  return out;
}
export function windAudioTargets(
  near: WindSample,
  listener: WindSample,
  distance: number,
  p: WindParameters,
  out: WindAudio,
): WindAudio {
  const proximity = 1 / (1 + distance * 0.055);
  const gust = near.gust * 0.78 + listener.gust * 0.22,
    strength = near.strength * 0.65 + listener.strength * 0.35;
  out.gain = 0.01 + strength * 0.032 + gust * 0.025;
  out.cutoff = 300 + strength * 750 + gust * 450;
  out.rustleGain = (0.004 + near.rustle * 0.034) * proximity;
  out.rustleCutoff = 650 + near.strength * 1100 + near.gust * 500;
  out.pan = -p.directionX * 0.35;
  return out;
}
export const WIND_GLSL = `
uniform float windTime,windIntensity,windGust,windTurbulence,windSpeed;
uniform vec2 windDirection;
vec3 sharedWind(vec2 p){
 float along=dot(p,windDirection),across=dot(p,vec2(-windDirection.y,windDirection.x));
 float phase=(along-windTime*windSpeed)/${WIND_WAVELENGTH.toFixed(1)};
 float gust=pow(.5+.5*sin(phase),5.)*windGust;
 float turbulence=sin(across*.49+windTime*.83)*sin(along*.31-windTime*1.3)*windTurbulence;
 return vec3(max(0.,windIntensity+gust*.83+turbulence),gust,turbulence);
}
`;
const emptySample = (): WindSample => ({
  strength: 0,
  gust: 0,
  turbulence: 0,
  rustle: 0,
});
export class WindSystem {
  readonly parameters = { ...DEFAULT_WIND };
  readonly uniforms = {
    windTime: { value: 0 },
    windIntensity: { value: DEFAULT_WIND.intensity },
    windGust: { value: DEFAULT_WIND.gustStrength },
    windTurbulence: { value: DEFAULT_WIND.turbulence },
    windSpeed: { value: DEFAULT_WIND.speed },
    windDirection: {
      value: new Vector2(DEFAULT_WIND.directionX, DEFAULT_WIND.directionZ),
    },
  };
  readonly atActor = emptySample();
  readonly atListener = emptySample();
  readonly audio: WindAudio = {
    gain: 0,
    cutoff: 0,
    rustleGain: 0,
    rustleCutoff: 0,
    pan: 0,
  };
  private actor = new Vector3();
  private listener = new Vector3();
  constructor() {
    this.update(0, this.actor, this.listener);
  }
  update(dt: number, actor: Vector3, listener: Vector3, forward?: Vector3) {
    this.uniforms.windTime.value += dt;
    const time = this.uniforms.windTime.value;
    // Slow direction/intensity drift changes the same field for every consumer.
    const angle = 0.35 + Math.sin(time * 0.035) * 0.15,
      p = this.parameters;
    p.directionX = Math.cos(angle);
    p.directionZ = Math.sin(angle);
    p.intensity = 0.31 + Math.sin(time * 0.07) * 0.035;
    this.uniforms.windDirection.value.set(p.directionX, p.directionZ);
    this.uniforms.windIntensity.value = p.intensity;
    this.uniforms.windGust.value = p.gustStrength;
    this.uniforms.windTurbulence.value = p.turbulence;
    this.uniforms.windSpeed.value = p.speed;
    this.actor.copy(actor);
    this.listener.copy(listener);
    sampleWind(actor.x, actor.z, time, p, this.atActor);
    sampleWind(listener.x, listener.z, time, p, this.atListener);
    windAudioTargets(
      this.atActor,
      this.atListener,
      actor.distanceTo(listener),
      p,
      this.audio,
    );
    if (forward)
      this.audio.pan =
        -(p.directionX * -forward.z + p.directionZ * forward.x) * 0.35;
  }
  sample(x: number, z: number, out: WindSample) {
    return sampleWind(x, z, this.uniforms.windTime.value, this.parameters, out);
  }
  get diagnostics() {
    return {
      time: this.uniforms.windTime.value,
      parameters: { ...this.parameters },
      actor: { ...this.atActor },
      listener: { ...this.atListener },
      audio: { ...this.audio },
    };
  }
}
