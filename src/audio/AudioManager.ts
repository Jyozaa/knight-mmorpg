import { GrassFoley } from "./GrassFoley";
import { WindSystem } from "../environment/WindSystem";
import type { Settings } from "../config";
import type { Vector3 } from "three";
export class AudioManager {
  private ctx: AudioContext | null = null;
  private recordingBus: MediaStreamAudioDestinationNode | null = null;
  captureStream() {
    if (!this.ctx || !this.buses.master) return null;
    if (!this.recordingBus) {
      this.recordingBus = this.ctx.createMediaStreamDestination();
      this.buses.master.connect(this.recordingBus);
    }
    return this.recordingBus.stream;
  }
  private buses = {} as Record<
    "master" | "ambience" | "sfx" | "music" | "cinematic",
    GainNode
  >;
  private analyser: AnalyserNode | null = null;
  private samples = new Float32Array(256);
  private noise: AudioBuffer | null = null;
  private wind: GainNode | null = null;
  private breath: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private rustleFilter: BiquadFilterNode | null = null;
  private rustle: GainNode | null = null;
  private windPan: StereoPannerNode | null = null;
  private footfallCount = 0;
  private foley: GrassFoley | null = null;
  private recordedRustle = false;
  private birdClock = 6;
  private bellClock = 18;
  private musicClock = 2;
  private paused = false;
  unlocked = false;
  get contextState() {
    return this.ctx?.state ?? "locked";
  }
  get diagnostics() {
    let rms = 0;
    if (this.analyser) {
      this.analyser.getFloatTimeDomainData(this.samples);
      for (const sample of this.samples) rms += sample * sample;
    }
    return {
      rms: Math.sqrt(rms / this.samples.length),
      wind: this.wind?.gain.value ?? 0,
      breathing: this.breath?.gain.value ?? 0,
      master: this.buses.master?.gain.value ?? 0,
      windTarget: this.windSystem.audio.gain,
      windFilter: this.windFilter?.frequency.value ?? 0,
      windFilterTarget: this.windSystem.audio.cutoff,
      rustle: this.rustle?.gain.value ?? 0,
      rustleTarget: this.windSystem.audio.rustleGain,
      gust: this.windSystem.atActor.gust,
      footfallCount: this.footfallCount,
      foley: this.foley?.diagnostics ?? null,
      recordedRustle: this.recordedRustle,
      windPan: this.windPan?.pan.value ?? 0,
      listener: this.ctx
        ? [
            this.ctx.listener.positionX.value,
            this.ctx.listener.positionY.value,
            this.ctx.listener.positionZ.value,
          ]
        : null,
      bellPosition: this.bellPosition?.toArray() ?? [-35, 18, -82],
    };
  }
  constructor(
    private settings: Settings,
    readonly windSystem: WindSystem = new WindSystem(),
    readonly bellPosition?: Vector3,
  ) {}
  async unlock() {
    if (this.ctx) {
      await this.ctx.resume();
      return;
    }
    this.ctx = new AudioContext();
    const c = this.ctx;
    for (const name of [
      "master",
      "ambience",
      "sfx",
      "music",
      "cinematic",
    ] as const)
      this.buses[name] = c.createGain();
    this.buses.master.connect(c.destination);
    this.analyser = c.createAnalyser();
    this.analyser.fftSize = 256;
    this.buses.master.connect(this.analyser);
    for (const name of ["ambience", "sfx", "music", "cinematic"] as const)
      this.buses[name].connect(this.buses.master);
    this.noise = c.createBuffer(1, c.sampleRate * 4, c.sampleRate);
    const data = this.noise.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      last = (last + Math.random() * 0.1 - 0.05) / 1.015;
      data[i] = last * 3;
    }
    this.foley = new GrassFoley(c, this.buses.sfx);
    await c.resume();
    await this.foley.load();
    const source = c.createBufferSource();
    source.buffer = this.noise;
    source.loop = true;
    const filter = c.createBiquadFilter();
    this.windFilter = filter;
    filter.type = "lowpass";
    filter.frequency.value = this.windSystem.audio.cutoff;
    this.wind = c.createGain();
    this.wind.gain.value = this.windSystem.audio.gain;
    this.windPan = c.createStereoPanner();
    source
      .connect(filter)
      .connect(this.wind)
      .connect(this.windPan)
      .connect(this.buses.ambience);
    const rustleSource = c.createBufferSource();
    const recorded = this.foley.rustleBuffer();
    this.recordedRustle = !!recorded;
    rustleSource.buffer = recorded ?? this.noise;
    rustleSource.loop = true;
    this.rustleFilter = c.createBiquadFilter();
    this.rustleFilter.type = "bandpass";
    this.rustleFilter.frequency.value = this.windSystem.audio.rustleCutoff;
    this.rustleFilter.Q.value = 0.55;
    this.rustle = c.createGain();
    this.rustle.gain.value = this.windSystem.audio.rustleGain;
    rustleSource
      .connect(this.rustleFilter)
      .connect(this.rustle)
      .connect(this.buses.ambience);
    rustleSource.start(c.currentTime, 1.3);
    source.start();
    const breathSource = c.createBufferSource();
    breathSource.buffer = this.noise;
    breathSource.loop = true;
    const breathFilter = c.createBiquadFilter();
    breathFilter.type = "bandpass";
    breathFilter.frequency.value = 450;
    breathFilter.Q.value = 0.8;
    this.breath = c.createGain();
    this.breath.gain.value = 0;
    breathSource
      .connect(breathFilter)
      .connect(this.breath)
      .connect(this.buses.cinematic);
    breathSource.start();
    this.applySettings();
    await c.resume();
    this.unlocked = true;
  }
  applySettings() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const name of ["master", "ambience", "sfx", "music"] as const)
      this.buses[name].gain.setTargetAtTime(
        name === "master" && this.paused
          ? this.settings.master * 0.15
          : this.settings[name],
        t,
        0.12,
      );
    this.buses.cinematic.gain.value = 0.6;
  }
  setPaused(paused: boolean) {
    this.paused = paused;
    this.applySettings();
  }
  private tone(
    frequency: number,
    duration: number,
    gain: number,
    bus: "sfx" | "ambience" | "music" | "cinematic",
    pan = 0,
  ) {
    if (!this.ctx) return;
    const c = this.ctx,
      t = c.currentTime,
      o = c.createOscillator(),
      g = c.createGain(),
      p = c.createStereoPanner();
    o.type = "sine";
    o.frequency.value = frequency;
    p.pan.value = pan;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(g).connect(p).connect(this.buses[bus]);
    o.start();
    o.stop(t + duration + 0.05);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
      p.disconnect();
    };
  }
  bell(position = this.bellPosition) {
    if (!this.ctx) return;
    const c = this.ctx,
      t = c.currentTime,
      panner = c.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = 18;
    panner.maxDistance = 400;
    panner.rolloffFactor = 0.7;
    panner.positionX.value = position?.x ?? -35;
    panner.positionY.value = position?.y ?? 18;
    panner.positionZ.value = position?.z ?? -82;
    panner.connect(this.buses.cinematic);
    for (const [f, a] of [
      [220, 0.25],
      [440, 0.13],
      [598, 0.08],
      [883, 0.04],
      [1140, 0.025],
    ]) {
      const o = c.createOscillator(),
        g = c.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(a, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 8);
      o.connect(g).connect(panner);
      o.start();
      o.stop(t + 8.1);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
      };
    }
    setTimeout(() => panner.disconnect(), 8500);
  }
  update(
    dt: number,
    time: number,
    speed: number,
    _stone: boolean,
    cinematicTime: number | null,
    cameraPosition: Vector3,
    forward: Vector3,
    footfalls = 0,
  ) {
    if (!this.ctx || this.paused) return;
    const c = this.ctx,
      t = c.currentTime;
    const listener = c.listener;
    listener.positionX.value = cameraPosition.x;
    listener.positionY.value = cameraPosition.y;
    listener.positionZ.value = cameraPosition.z;
    listener.forwardX.value = forward.x;
    listener.forwardY.value = forward.y;
    listener.forwardZ.value = forward.z;
    listener.upX.value = 0;
    listener.upY.value = 1;
    listener.upZ.value = 0;
    const pullback =
      cinematicTime === null
        ? 0
        : Math.min(1, Math.max(0, (cinematicTime - 8) / 40));
    const wind = this.windSystem.audio;
    this.wind?.gain.setTargetAtTime(wind.gain, t, 0.1);
    this.windFilter?.frequency.setTargetAtTime(wind.cutoff, t, 0.1);
    this.rustle?.gain.setTargetAtTime(wind.rustleGain, t, 0.075);
    this.rustleFilter?.frequency.setTargetAtTime(wind.rustleCutoff, t, 0.1);
    this.windPan?.pan.setTargetAtTime(wind.pan, t, 0.2);
    this.breath?.gain.setTargetAtTime(
      cinematicTime === null
        ? 0.001
        : (0.01 + 0.012 * Math.max(0, Math.sin(time * 1.8))) * (1 - pullback),
      t,
      0.15,
    );
    if (footfalls >= 0) {
      if (footfalls & 1) {
        this.foley?.step(speed, 0);
        this.footfallCount++;
      }
      if (footfalls & 2) {
        this.foley?.step(speed, 1);
        this.footfallCount++;
      }
    }
    this.foley?.update(dt, speed);
    this.birdClock -= dt;
    if (this.birdClock < 0) {
      this.birdClock = 8 + Math.random() * 12;
      const pan = Math.sin(time);
      this.tone(1900 + Math.random() * 600, 0.3, 0.012, "ambience", pan);
      setTimeout(() => this.tone(2500, 0.23, 0.009, "ambience", pan), 180);
    }
    this.bellClock -= dt;
    if (this.bellClock < 0) {
      this.bellClock = 35 + Math.random() * 15;
      this.bell();
    }
    this.musicClock -= dt;
    if (this.musicClock < 0) {
      this.musicClock = 6.5;
      const notes = [110, 146.83, 164.81, 220];
      this.tone(notes[Math.floor(time / 6.5) % 4], 7, 0.025, "music", -0.2);
    }
  }
}
