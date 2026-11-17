import { test } from "node:test";
import assert from "node:assert/strict";
import { Vector3, Scene } from "three";
import {
  WindSystem,
  DEFAULT_WIND,
  sampleWind,
  windAudioTargets,
  WIND_GLSL,
  type WindSample,
} from "../src/environment/WindSystem.ts";
import { Grass } from "../src/world/Grass.ts";
import { Knight } from "../src/character/Knight.ts";
import { AudioManager } from "../src/audio/AudioManager.ts";
import { heightAt } from "../src/world/terrain.ts";
import { defaults } from "../src/config.ts";
import { mapArmorLuminance, mapLuminance } from "../src/rendering/AsciiMath.ts";
const sample = (): WindSample => ({
  strength: 0,
  gust: 0,
  turbulence: 0,
  rustle: 0,
});
function correlation(a: number[], b: number[]) {
  const ma = a.reduce((s, v) => s + v, 0) / a.length,
    mb = b.reduce((s, v) => s + v, 0) / b.length;
  let x = 0,
    aa = 0,
    bb = 0;
  for (let i = 0; i < a.length; i++) {
    const da = a[i] - ma,
      db = b[i] - mb;
    x += da * db;
    aa += da * da;
    bb += db * db;
  }
  return x / Math.sqrt(aa * bb);
}
test("the same gust propagates downwind at the declared speed, without random envelopes", () => {
  const p = { ...DEFAULT_WIND, turbulence: 0 },
    a = sample(),
    b = sample();
  const dt = 2,
    dx = p.directionX * p.speed * dt,
    dz = p.directionZ * p.speed * dt;
  sampleWind(4, 9, 10, p, a);
  sampleWind(4 + dx, 9 + dz, 12, p, b);
  assert.ok(Math.abs(a.gust - b.gust) < 1e-6);
  assert.ok(Math.abs(a.strength - b.strength) < 1e-6);
  const again = sample();
  sampleWind(4, 9, 10, p, again);
  assert.deepEqual(a, again);
});
test("grass, scarf, audio and field uniforms share one WindSystem instance", () => {
  const wind = new WindSystem(),
    grass = new Grass(new Scene(), wind),
    knight = new Knight(wind),
    audio = new AudioManager({ ...defaults }, wind);
  assert.equal(grass.wind, wind);
  assert.equal(knight.cape.wind, wind);
  assert.equal(audio.windSystem, wind);
  wind.update(1.25, new Vector3(0, 0, 7), new Vector3(2, 2, 10));
  assert.equal(
    grass.wind.uniforms.windTime.value,
    knight.cape.wind.uniforms.windTime.value,
  );
  assert.equal(knight.mesh.skeleton.bones.length, 18);
  assert.equal(WIND_GLSL.includes("Math.random"), false);
});
test("visible gust strength drives correlated wind, filtering and grass rustle targets", () => {
  const p = { ...DEFAULT_WIND, turbulence: 0.03 },
    gusts: number[] = [],
    gains: number[] = [],
    filters: number[] = [],
    rustles: number[] = [];
  const field = sample(),
    mix = { gain: 0, cutoff: 0, rustleGain: 0, rustleCutoff: 0, pan: 0 };
  for (let i = 0; i < 1200; i++) {
    sampleWind(0, 7, i / 60, p, field);
    windAudioTargets(field, field, 3, p, mix);
    gusts.push(field.gust);
    gains.push(mix.gain);
    filters.push(mix.cutoff);
    rustles.push(mix.rustleGain);
  }
  assert.ok(correlation(gusts, gains) > 0.99);
  assert.ok(correlation(gusts, filters) > 0.99);
  assert.ok(correlation(gusts, rustles) > 0.99);
});
test("wind simulation is frame-rate independent and freezes when its update is paused", () => {
  const values = [30, 60, 144].map((hz) => {
    const wind = new WindSystem();
    for (let i = 0; i < hz * 8; i++)
      wind.update(1 / hz, new Vector3(2, 0, 8), new Vector3(3, 1, 10));
    return wind;
  });
  assert.ok(
    Math.abs(values[0].atActor.strength - values[2].atActor.strength) < 1e-10,
  );
  const before = values[0].diagnostics;
  values[0].update(0, new Vector3(2, 0, 8), new Vector3(3, 1, 10));
  assert.deepEqual(values[0].diagnostics, before);
});
test("selective armor mapping reveals steel without lifting black scenery or closed visor gaps", () => {
  assert.equal(mapArmorLuminance(0), 0);
  assert.equal(mapArmorLuminance(0.005), 0);
  assert.equal(mapLuminance(0), 0);
  assert.ok(mapArmorLuminance(0.1) > 0.42);
  assert.ok(mapArmorLuminance(0.1) > mapLuminance(0.1) * 2);
  assert.ok(mapArmorLuminance(0.8) > mapArmorLuminance(0.1));
});

test("heavy boot events occur on actual stance entry, not an unrelated sound timer", () => {
  const knight = new Knight();
  knight.root.rotation.y = Math.PI;
  let events = 0,
    contacts = 0;
  const previous = [true, true];
  for (let frame = 0; frame < 360; frame++) {
    knight.root.position.z -= 1.65 / 60;
    knight.root.position.y = heightAt(0, knight.root.position.z);
    knight.update(1 / 60, frame / 60, 1.65, null, 0);
    const mask = knight.consumeFootfalls();
    assert.equal(knight.consumeFootfalls(), 0);
    for (let i = 0; i < 2; i++) {
      if (mask & (1 << i)) {
        events++;
        assert.equal(knight.animator.feet[i].contact, true);
      }
      if (knight.animator.feet[i].contact && !previous[i]) contacts++;
      previous[i] = knight.animator.feet[i].contact;
    }
  }
  assert.equal(events, contacts);
  assert.ok(events >= 14 && events <= 20);
});
