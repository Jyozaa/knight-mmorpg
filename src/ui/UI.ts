import type { Settings } from "../config";
const bell = `<svg class="bell" viewBox="0 0 32 36" fill="none" aria-hidden="true"><path d="M7 26h18l-3-5v-8a6 6 0 0 0-12 0v8l-3 5ZM13 31h6M16 3v4" stroke="currentColor" stroke-width="1.2"/><path d="M3 12a13 13 0 0 1 3-6M29 12a13 13 0 0 0-3-6" stroke="currentColor" stroke-width=".7"/></svg>`;
export type Screen = "menu" | "playing" | "cinematic" | "paused";
export class UI {
  readonly viewport: HTMLElement;
  private menu: HTMLElement;
  private hud: HTMLElement;
  private modal: HTMLDialogElement;
  private pause: HTMLElement;
  private cinema: HTMLElement;
  private prompt: HTMLElement;
  private diagnostics: HTMLElement;
  private help: HTMLElement;
  onBegin = () => {};
  onResume = () => {};
  onMenu = () => {};
  onReturn = () => {};
  onSettings = () => {};
  onFullscreen = () => {};
  constructor(private settings: Settings) {
    document.querySelector("#app")!.innerHTML = `
    <main id="world"></main><div class="grain" aria-hidden="true"></div>
    <section id="menu" class="menu">
      <header class="masthead"><a class="brand" href="#" aria-label="The Last Bell home">${bell}<span>THE LAST BELL</span></a><span class="edition">A REAL-TIME ASCII JOURNEY <span class="dot">·</span> PRELUDE 01</span></header>
      <div class="menu-copy"><p class="eyebrow"><span></span> A WORLD WAITING TO BE HEARD</p><h1>THE LAST<br/><span>BELL</span><i>.</i></h1><p class="intro">The kingdom has fallen silent.<br/>One small sound might bring it back.</p>
      <div class="menu-actions"><button id="begin" class="primary"><span>Begin Journey</span><span aria-hidden="true">↗</span></button><div class="secondary"><button id="settings">Settings <span aria-hidden="true">↗</span></button><button id="credits">Credits <span aria-hidden="true">↗</span></button></div></div></div>
      <div class="scene-label"><span class="small-cross">+</span><div><span>THE QUIET FIELDS</span><p>Somewhere before the morning.</p></div></div>
      <footer class="menu-footer"><span>AN EXPLORATION IN STILLNESS</span><span class="sound-note"><span class="sound-bars">ıııı</span> BEST EXPERIENCED WITH HEADPHONES</span><span>3D WORLD. EVERY CHARACTER ALIVE.</span></footer>
    </section>
    <section id="hud" hidden><div class="chapter"><span class="eyebrow">CHAPTER I</span><h2>The Quiet Fields</h2><p id="objective">Find a moment of peace on the hill.</p></div><div class="hud-top-right"><button id="help-button" aria-label="Show controls">H <span>CONTROLS</span></button><button id="pause-button" aria-label="Pause game">Ⅱ</button></div><div class="compass"><span>W</span><span>·</span><span>·</span><span class="north">N</span><span>·</span><span>·</span><span>E</span><i>◆</i></div><div id="prompt" hidden><span>Press</span><kbd>E</kbd><span>to Rest</span><span class="prompt-line"></span></div><p class="hint" id="journey-hint">W A S D &nbsp; Move <span> / </span> Mouse &nbsp; Look <span> / </span> Shift &nbsp; Run</p></section>
    <section id="cinema" hidden><div class="letterbox top"></div><div class="letterbox bottom"></div><p id="quote">“Perhaps the world was only waiting<br/>for someone to listen.”</p><button id="return">Return to the fields <span aria-hidden="true">↗</span></button><span class="cinema-label">A MOMENT OF PEACE</span></section>
    <section id="pause" class="pause-screen" hidden><div><p class="eyebrow">A MOMENT BETWEEN MOMENTS</p><h2>Journey paused.</h2><button id="resume" class="primary">Continue Journey <span aria-hidden="true">↗</span></button><button id="pause-settings" class="text-button">Settings</button><button id="to-menu" class="text-button">Return to title</button></div></section>
    <aside id="help" hidden><p class="eyebrow">YOUR JOURNEY</p><h2>A few things to know.</h2><dl><dt>W A S D</dt><dd>Move</dd><dt>Mouse / Drag</dt><dd>Look around</dd><dt>Shift</dt><dd>Run</dd><dt>Space</dt><dd>Evade</dd><dt>E</dt><dd>Rest by the waystone</dd><dt>Escape</dt><dd>Pause / release mouse</dd><dt>F</dt><dd>Fullscreen</dd><dt>H</dt><dd>Close controls</dd><dt>Backquote</dt><dd>Performance display</dd></dl><p>Double-click the world to capture the mouse.<br/>Follow the ridge toward the small waystone.</p><button id="help-close" class="text-button">Close controls</button></aside>
    <dialog id="modal" aria-labelledby="modal-title"></dialog><div id="diagnostics" hidden></div><div id="error" hidden></div>`;
    this.viewport = document.querySelector("#world")!;
    this.menu = document.querySelector("#menu")!;
    this.hud = document.querySelector("#hud")!;
    this.pause = document.querySelector("#pause")!;
    this.cinema = document.querySelector("#cinema")!;
    this.modal = document.querySelector("#modal")!;
    this.prompt = document.querySelector("#prompt")!;
    this.diagnostics = document.querySelector("#diagnostics")!;
    this.help = document.querySelector("#help")!;
    this.click("begin", () => this.onBegin());
    this.click("settings", () => this.showSettings());
    this.click("pause-settings", () => this.showSettings());
    this.click("credits", () => this.credits());
    this.click("resume", () => this.onResume());
    this.click("to-menu", () => this.onMenu());
    this.click("return", () => this.onReturn());
    this.click("help-button", () => this.toggleHelp());
    this.click("help-close", () => this.toggleHelp());
    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) {
        const r = this.modal.getBoundingClientRect();
        if (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        )
          this.modal.close();
      }
    });
  }
  private click(id: string, cb: () => void) {
    document.getElementById(id)!.addEventListener("click", cb);
  }
  screen(screen: Screen) {
    this.menu.hidden = screen !== "menu";
    this.hud.hidden = screen !== "playing";
    this.pause.hidden = screen !== "paused";
    this.cinema.hidden = screen !== "cinematic";
    this.help.hidden = true;
    document.body.dataset.screen = screen;
  }
  showSettings() {
    document.exitPointerLock?.();
    this.modal.innerHTML = `<button class="close-modal" aria-label="Close settings">×</button><p class="eyebrow">MAKE YOURSELF AT HOME</p><h2 id="modal-title">Settings</h2><div class="settings-section">AUDIO</div>${this.range("master", "Master volume")}${this.range("music", "Music")}${this.range("ambience", "Environment")}${this.range("sfx", "Effects")}<div class="settings-section">DISPLAY & CONTROLS</div><label class="setting">ASCII density<select id="density"><option value="0.75">Spacious</option><option value="1">Detailed</option><option value="1.4">Fine</option></select></label><label class="setting">Rendering quality<select id="quality"><option value="0.5">Performance</option><option value="0.8">Balanced</option><option value="1">High</option></select></label>${this.range("sensitivity", "Mouse sensitivity", 0.25, 2, 0.05)}<button class="fullscreen-button text-button">Toggle fullscreen <span aria-hidden="true">↗</span></button><p class="setting-note">Your preferences are saved on this device.</p>`;
    this.modal
      .querySelector(".close-modal")!
      .addEventListener("click", () => this.modal.close());
    for (const key of Object.keys(this.settings) as (keyof Settings)[]) {
      const el = this.modal.querySelector<HTMLInputElement | HTMLSelectElement>(
        `#${key}`,
      );
      if (!el) continue;
      el.value = String(this.settings[key]);
      el.addEventListener("input", () => {
        this.settings[key] = Number(el.value);
        const output = this.modal.querySelector(`output[for="${key}"]`);
        if (output)
          output.textContent =
            key === "sensitivity"
              ? Number(el.value).toFixed(2)
              : `${Math.round(Number(el.value) * 100)}%`;
        try {
          localStorage.setItem(
            "last-bell-settings",
            JSON.stringify(this.settings),
          );
        } catch {
          /* Private browsing can disallow storage. */
        }
        this.onSettings();
      });
    }
    this.modal
      .querySelector(".fullscreen-button")!
      .addEventListener("click", () => this.onFullscreen());
    this.modal.showModal();
  }
  private range(
    key: keyof Settings,
    label: string,
    min = 0,
    max = 1,
    step = 0.01,
  ) {
    return `<label class="setting" for="${key}">${label}<span class="slider-group"><input id="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${this.settings[key]}"/><output for="${key}">${key === "sensitivity" ? this.settings[key].toFixed(2) : Math.round(this.settings[key] * 100) + "%"}</output></span></label>`;
  }
  private credits() {
    this.modal.innerHTML = `<button class="close-modal" aria-label="Close credits">×</button><p class="eyebrow">THE FIRST JOURNEY</p><h2 id="modal-title">The Last Bell</h2><p class="credits-copy">An original, real-time 3D ASCII fantasy.<br/><br/>World, articulated armor, glyph atlas and procedural sound created for this project. Built with Three.js, TypeScript and the Web Audio API.<br/><br/>Visual studies: the supplied ASCII hourglass, Crawlpedia and ASCII knight references. Reference media is not included in the game.<br/><br/>Prelude 01 — The Knight on the Hill.<br/>The five-chapter story is still to come.</p>`;
    this.modal
      .querySelector(".close-modal")!
      .addEventListener("click", () => this.modal.close());
    this.modal.showModal();
  }
  restPrompt(visible: boolean) {
    this.prompt.hidden = !visible;
  }
  cinematicTime(time: number) {
    document.querySelector("#quote")!.classList.toggle("visible", time > 38);
  }
  toggleHelp() {
    this.help.hidden = !this.help.hidden;
    if (!this.help.hidden) document.exitPointerLock?.();
  }
  toggleDiagnostics() {
    this.diagnostics.hidden = !this.diagnostics.hidden;
  }
  diagnosticsText(text: string) {
    this.diagnostics.textContent = text;
  }
  objective(text: string) {
    document.querySelector("#objective")!.textContent = text;
  }
  hideHint() {
    document.querySelector("#journey-hint")!.classList.add("faded");
  }
  get modalOpen() {
    return this.modal.open;
  }
}
