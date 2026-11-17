import "./style.css";
import * as T from "three";
import { readSettings } from "./config";
import { AsciiRenderer } from "./rendering/AsciiRenderer";
import { World } from "./world/World";
import { Knight } from "./character/Knight";
import { CharacterController } from "./character/CharacterController";
import { CameraController } from "./camera/CameraController";
import { CinematicSystem } from "./cinematic/CinematicSystem";
import { AudioManager } from "./audio/AudioManager";
import { Input } from "./systems/Input";
import { InteractionSystem } from "./systems/InteractionSystem";
import { QuestProgression } from "./systems/QuestProgression";
import { terrainMaterial } from "./world/terrain";
import { UI, type Screen } from "./ui/UI";

function boot() {
  const settings = readSettings(),
    ui = new UI(settings);
  const renderer = new AsciiRenderer(ui.viewport, settings),
    world = new World(),
    knight = new Knight(),
    player = new CharacterController();
  world.scene.add(knight.root);
  knight.root.position.copy(player.position);
  knight.root.rotation.y = player.rotation;
  const camera = new CameraController(player.position, world.obstacles),
    cinematic = new CinematicSystem(),
    audio = new AudioManager(settings),
    input = new Input(renderer.renderer.domElement),
    interactions = new InteractionSystem(),
    quest = new QuestProgression();
  let gettingUp = 0;
  let screen: Screen = "menu",
    beforePause: Screen = "playing";
  let previous = performance.now(),
    time = 0,
    playingTime = 0,
    frameCount = 0,
    frameTimer = 0,
    fps = 60,
    frameMs = 16.7;
  const forward = new T.Vector3();
  const setScreen = (next: Screen) => {
    screen = next;
    ui.screen(next);
    input.clear();
    audio.setPaused(next === "paused");
    if (next !== "playing") document.exitPointerLock?.();
  };
  const returnToPlay = () => {
    gettingUp = Math.min(7.5, cinematic.time);
    cinematic.stop();
    player.stop();
    setScreen("playing");
  };
  const pause = () => {
    if (screen === "playing" || screen === "cinematic") {
      beforePause = screen;
      setScreen("paused");
    } else if (screen === "paused") setScreen(beforePause);
  };
  interactions.interactions.push({
    id: "hilltop",
    label: "Press E to Rest",
    position: world.rest,
    radius: 4.2,
    action: () => {
      player.stop();
      cinematic.start(player.position, 0);
      quest.rest();
      ui.objective(quest.objective);
      setScreen("cinematic");
      audio.bell();
    },
  });
  ui.onBegin = () => {
    void audio.unlock().catch(() => {
      ui.diagnosticsText("Audio unavailable; the journey can continue.");
    });
    setScreen("playing");
    input.lock();
  };
  ui.onResume = () => setScreen(beforePause);
  ui.onMenu = () => {
    cinematic.stop();
    setScreen("menu");
  };
  ui.onReturn = returnToPlay;
  ui.onSettings = () => {
    renderer.resize();
    audio.applySettings();
  };
  ui.onFullscreen = () => {
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen().catch(() => {});
  };
  document.querySelector("#pause-button")!.addEventListener("click", pause);
  addEventListener("keydown", (e) => {
    if (e.code === "Escape" && !ui.modalOpen) {
      pause();
    }
    if (e.code === "KeyF" && !ui.modalOpen) ui.onFullscreen();
    if (e.code === "Backquote") ui.toggleDiagnostics();
    if (e.code === "KeyH" && screen === "playing") ui.toggleHelp();
  });
  addEventListener("resize", () => {
    renderer.resize();
    camera.resize();
  });
  document.addEventListener("visibilitychange", () => {
    previous = performance.now();
    if (document.hidden && (screen === "playing" || screen === "cinematic"))
      pause();
  });
  ui.screen("menu");
  function frame(now: number) {
    requestAnimationFrame(frame);
    const raw = (now - previous) / 1000;
    previous = now;
    const dt = Math.min(0.05, Math.max(0.0001, raw));
    if (screen !== "paused" && !ui.modalOpen) {
      time += dt;
      world.update(time);
      if (screen === "playing") {
        playingTime += dt;
        if (playingTime > 12) ui.hideHint();
        camera.orbit(input.mouseX, input.mouseY, settings.sensitivity);
        gettingUp = Math.max(0, gettingUp - dt * 2);
        if (gettingUp === 0)
          player.update(dt, input, camera.yaw, world.obstacles);
        else player.stop();
        interactions.update(player.position);
        ui.restPrompt(!!interactions.active && gettingUp === 0);
        if (input.consume("KeyE") && gettingUp === 0) interactions.interact();
      }
      if (screen === "cinematic") {
        cinematic.update(dt);
        const turn = Math.atan2(
          Math.sin(Math.PI - player.rotation),
          Math.cos(Math.PI - player.rotation),
        );
        player.rotation += turn * (1 - Math.exp(-2 * dt));
        camera.cinematic(dt, cinematic.position, cinematic.target);
        ui.cinematicTime(cinematic.time);
      } else camera.update(dt, player.position, screen === "menu", time);
      knight.root.position.copy(player.position);
      knight.root.rotation.y = screen === "menu" ? -0.35 : player.rotation;
      knight.update(
        dt,
        time,
        screen === "playing" ? player.speed : 0,
        screen === "cinematic"
          ? cinematic.time
          : gettingUp > 0
            ? gettingUp
            : null,
        player.dodge,
      );
      if (screen !== "menu") {
        camera.camera.getWorldDirection(forward);
        audio.update(
          dt,
          time,
          player.speed,
          terrainMaterial(player.position.x, player.position.z) === "stone",
          screen === "cinematic" ? cinematic.time : null,
          camera.camera.position,
          forward,
        );
      }
    }
    renderer.render(world.scene, camera.camera);
    input.endFrame();
    frameCount++;
    frameTimer += raw;
    frameMs = frameMs * 0.95 + raw * 1000 * 0.05;
    if (frameTimer > 0.5) {
      fps = Math.round(frameCount / frameTimer);
      frameCount = 0;
      frameTimer = 0;
      ui.diagnosticsText(
        `${fps} FPS · ${frameMs.toFixed(1)} ms\n${renderer.drawCalls} scene calls\nASCII ${renderer.columns} × ${renderer.rows}\n${screen} · ${player.speed.toFixed(1)} m/s`,
      );
    }
  }
  requestAnimationFrame(frame);
  // Read-only diagnostic snapshot for browser smoke tests and future engine tooling.
  if (
    import.meta.env.DEV ||
    new URLSearchParams(location.search).has("diagnostics")
  ) {
    Object.defineProperty(window, "__lastBell", {
      value: {
        snapshot: () => ({
          screen,
          position: player.position.toArray(),
          speed: player.speed,
          rotation: player.rotation,
          rest: world.rest.toArray(),
          restAvailable: !!interactions.active,
          cinematicTime: cinematic.time,
          hipsY: knight.hips.position.y,
          hipsRotation: knight.hips.rotation.x,
          camera: camera.camera.position.toArray(),
          fps,
          drawCalls: renderer.drawCalls,
          columns: renderer.columns,
          rows: renderer.rows,
          audioUnlocked: audio.unlocked,
          audioContextState: audio.contextState,
          audio: audio.diagnostics,
          settings: { ...settings },
        }),
      },
      configurable: false,
    });
  }
}
try {
  boot();
} catch (error) {
  console.error(error);
  const el = document.querySelector<HTMLElement>("#error");
  if (el) {
    el.hidden = false;
    el.textContent =
      "The journey could not begin. This game requires WebGL2. Try an up-to-date Chrome, Edge, Firefox or Safari with hardware acceleration enabled. " +
      String(error);
  }
}
