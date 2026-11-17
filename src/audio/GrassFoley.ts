export const FOLEY_FILES = {
  grass: Array.from({ length: 5 }, (_, i) => `footstep_grass_00${i}.ogg`),
  soft: Array.from({ length: 3 }, (_, i) => `impactSoft_heavy_00${i}.ogg`),
  dry: Array.from({ length: 3 }, (_, i) => `footstep_carpet_00${i}.ogg`),
  armor: Array.from({ length: 3 }, (_, i) => `impactMetal_light_00${i}.ogg`),
};
type Layer = keyof typeof FOLEY_FILES;
/** Recorded CC0 foley layers; no oscillator is part of a footstep. */
export class GrassFoley {
  private buffers = new Map<Layer, AudioBuffer[]>();
  private last = new Map<Layer, number>();
  private distance = 0;
  private played = 0;
  private brushes = 0;
  private failures: string[] = [];
  private history: string[] = [];
  constructor(
    private context: AudioContext,
    private bus: AudioNode,
    private random = Math.random,
  ) {}
  async load() {
    await Promise.all(
      (Object.entries(FOLEY_FILES) as [Layer, string[]][]).map(
        async ([layer, files]) => {
          const loaded = await Promise.all(
            files.map(async (file) => {
              try {
                const response = await fetch(
                  `${import.meta.env.BASE_URL}audio/grass/${file}`,
                );
                if (!response.ok) throw new Error(String(response.status));
                return await this.context.decodeAudioData(
                  await response.arrayBuffer(),
                );
              } catch {
                this.failures.push(file);
                return null;
              }
            }),
          );
          this.buffers.set(
            layer,
            loaded.filter((b): b is AudioBuffer => !!b),
          );
        },
      ),
    );
  }
  private play(
    layer: Layer,
    gain: number,
    rate: number,
    pan: number,
    tail = false,
  ) {
    const bank = this.buffers.get(layer);
    if (!bank?.length) return;
    const previous = this.last.get(layer) ?? -1;
    let index = Math.floor(
      this.random() * (bank.length - (previous < 0 ? 0 : 1)),
    );
    if (previous >= 0 && index >= previous) index++;
    index %= bank.length;
    this.last.set(layer, index);
    const source = this.context.createBufferSource(),
      volume = this.context.createGain(),
      stereo = this.context.createStereoPanner();
    source.buffer = bank[index];
    source.playbackRate.value = rate * (0.965 + this.random() * 0.07);
    stereo.pan.value = pan;
    const start = this.context.currentTime,
      offset = tail ? Math.min(0.18, source.buffer.duration * 0.32) : 0,
      duration = (source.buffer.duration - offset) / source.playbackRate.value;
    volume.gain.setValueAtTime(0, start);
    volume.gain.linearRampToValueAtTime(
      gain * (0.9 + this.random() * 0.2),
      start + 0.006,
    );
    volume.gain.setTargetAtTime(0, start + duration * 0.72, 0.035);
    source.connect(volume).connect(stereo).connect(this.bus);
    source.start(start, offset);
    source.stop(start + duration);
    source.onended = () => {
      source.disconnect();
      volume.disconnect();
      stereo.disconnect();
    };
    if (layer === "grass" && !tail) {
      this.history.push(FOLEY_FILES.grass[index]);
      if (this.history.length > 12) this.history.shift();
    }
  }
  step(speed: number, foot: number) {
    const run = Math.max(0, Math.min(1, (speed - 1.35) / 2.25)),
      pan = foot === 0 ? -0.16 : 0.16;
    this.play("grass", 0.28 + run * 0.13, 1 + run * 0.1, pan);
    this.play("soft", 0.085 + run * 0.08, 0.9 + run * 0.12, pan);
    this.play("dry", 0.035 + run * 0.018, 0.92 + run * 0.1, -pan);
    this.play("armor", 0.012 + run * 0.008, 0.82 + run * 0.1, pan);
    this.played++;
  }
  update(dt: number, speed: number) {
    this.distance += dt * speed;
    if (speed < 0.15) {
      this.distance = 0;
      return;
    }
    if (this.distance > 0.48) {
      this.distance %= 0.48;
      this.play(
        "grass",
        0.035 + speed * 0.009,
        0.83,
        Math.sin(this.played) * 0.15,
        true,
      );
      this.brushes++;
    }
  }
  rustleBuffer() {
    const bank = this.buffers.get("grass");
    if (!bank?.length) return null;
    const rate = this.context.sampleRate,
      overlap = Math.round(rate * 0.045),
      tails = bank.map((b) =>
        b.getChannelData(0).subarray(Math.floor(b.length * 0.38)),
      );
    const result = this.context.createBuffer(
        1,
        tails.reduce((n, a) => n + a.length - overlap, overlap),
        rate,
      ),
      out = result.getChannelData(0);
    let cursor = 0;
    for (const data of tails) {
      for (let i = 0; i < data.length; i++) {
        const fade = Math.min(1, i / overlap, (data.length - 1 - i) / overlap);
        out[cursor + i] += data[i] * fade;
      }
      cursor += data.length - overlap;
    }
    return result;
  }
  get diagnostics() {
    return {
      loaded: [...this.buffers.values()].reduce((n, b) => n + b.length, 0),
      failures: [...this.failures],
      steps: this.played,
      brushes: this.brushes,
      lastGrass: [...this.history],
      source: "Kenney Impact Sounds CC0 recorded foley samples",
    };
  }
}
