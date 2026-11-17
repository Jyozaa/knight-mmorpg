import "./style.css";
import * as T from "three";
import { WindSystem } from "./environment/WindSystem";
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
import { FramePacing } from "./diagnostics/FramePacing";
import { smoothstep } from "./config";
import { UI, type Screen } from "./ui/UI";

import { prepareArmor } from "./character/model/buildArmor";
import { prepareImportedAvatar } from "./character/model/ImportedAvatar";

async function boot() {
  const review = new URLSearchParams(location.search);
  const appearance =
    review.get("knight") === "authored" ? "authored" : "imported";
  const cameraMode = review.get("camera") === "legacy" ? "legacy" : "2p5d",
    illustrated = cameraMode === "2p5d",
    postureMode =
      review.get("posture") === "neutral"
        ? "neutral"
        : review.get("posture") === "weary"
          ? "weary"
          : illustrated
            ? "weary"
            : "neutral",
    projection = review.get("projection") === "weak" ? "weak" : "orthographic";
  await prepareArmor();
  if (appearance === "imported") await prepareImportedAvatar();
  const settings = readSettings(),
    ui = new UI(settings, illustrated);
  const wind = new WindSystem();
  const renderer = new AsciiRenderer(
      ui.viewport,
      settings,
      review.get("render") === "shaded",
      illustrated,
    ),
    world = new World(wind, illustrated),
    knight = new Knight(wind, appearance, postureMode, illustrated),
    player = new CharacterController(cameraMode);
  world.scene.add(knight.root);
  if (review.has("compare")) {
    const panel = document.createElement("nav");
    panel.setAttribute("aria-label", "Presentation comparison");
    panel.style.cssText =
      "position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:100;display:flex;flex-wrap:wrap;width:max-content;max-width:95vw;justify-content:center;gap:12px;background:#080808e8;padding:10px;font:12px monospace;border:1px solid #555";
    for (const [label, key, value] of [
      ["Legacy camera", "camera", "legacy"],
      ["2.5D camera", "camera", "2p5d"],
      ["Neutral posture", "posture", "neutral"],
      ["Weary posture", "posture", "weary"],
      ["Authored v0.5", "knight", "authored"],
      ["Supplied knight", "knight", "imported"],
      ["ASCII", "render", "ascii"],
      ["Shaded 3D", "render", "shaded"],
    ]) {
      const link = document.createElement("a"),
        params = new URLSearchParams(review);
      params.set(key, value);
      params.set("diagnostics", "");
      link.href = `?${params}`;
      link.textContent = label;
      link.style.color = "#ddd";
      panel.append(link);
    }
    document.body.append(panel);
  }
  knight.root.position.copy(player.position);
  knight.root.rotation.y = player.rotation;
  const camera = new CameraController(
      player.position,
      world.obstacles,
      cameraMode,
      projection,
    ),
    cinematic = new CinematicSystem(cameraMode),
    audio = new AudioManager(settings, wind, world.bell),
    input = new Input(renderer.renderer.domElement),
    interactions = new InteractionSystem(),
    quest = new QuestProgression();
  let gettingUp = 0;
  let animationCpuMs = 0,
    cameraCpuMs = 0;
  const pacing = new FramePacing();
  let visualYaw = illustrated ? Math.PI : -0.35;
  let screen: Screen = "menu",
    beforePause: Screen = "playing";
  let previous = performance.now(),
    time = 0,
    playingTime = 0,
    frameCount = 0,
    frameTimer = 0,
    fps = 60,
    frameMs = 16.7;
  let pacingActive = false;
  const forward = new T.Vector3();
  const setScreen = (next: Screen) => {
    screen = next;
    ui.screen(next);
    input.clear();
    audio.setPaused(next === "paused");
    if (next !== "playing") document.exitPointerLock?.();
  };
  const returnToPlay = () => {
    gettingUp = Math.min(10, cinematic.time);
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
      audio.bell(world.bell);
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
    if (e.code === "Backquote") {
      ui.toggleDiagnostics();
      renderer.profiler.enabled = !renderer.profiler.enabled;
    }
    if (e.code === "KeyH" && screen === "playing") ui.toggleHelp();
  });
  renderer.renderer.domElement.addEventListener(
    "wheel",
    (e) => {
      if (screen === "playing") {
        e.preventDefault();
        camera.zoom(e.deltaY);
      }
    },
    { passive: false },
  );
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
    const frameStart = performance.now();
    requestAnimationFrame(frame);
    const raw = (now - previous) / 1000;
    previous = now;
    const dt = Math.min(0.05, Math.max(0.0001, raw));
    if (screen !== "paused" && !ui.modalOpen) {
      time += dt;

      if (screen === "playing") {
        playingTime += dt;
        if (playingTime > 12) ui.hideHint();
        camera.orbit(input.mouseX, input.mouseY, settings.sensitivity);
        gettingUp = Math.max(0, gettingUp - dt * 1.6);
        if (gettingUp === 0)
          player.update(dt, input, camera.yaw, world.obstacles);
        else player.stop();
        interactions.update(player.position);
        ui.restPrompt(!!interactions.active && gettingUp === 0);
        if (input.consume("KeyE") && gettingUp === 0) interactions.interact();
      }
      const cameraStart = performance.now();
      if (screen === "cinematic") {
        cinematic.update(dt);
        const turn = Math.atan2(
          Math.sin(Math.PI - player.rotation),
          Math.cos(Math.PI - player.rotation),
        );
        player.rotation += turn * (1 - Math.exp(-2 * dt));
        camera.cinematic(
          dt,
          cinematic.position,
          cinematic.target,
          cinematic.viewHeight,
        );
        ui.cinematicTime(cinematic.time);
      } else
        camera.update(
          dt,
          player.position,
          screen === "menu",
          time,
          player.speed,
          player.velocity,
        );
      cameraCpuMs = cameraCpuMs * 0.9 + (performance.now() - cameraStart) * 0.1;
      knight.root.position.copy(player.position);
      const targetYaw =
        screen === "menu" ? (illustrated ? Math.PI : -0.35) : player.rotation;
      const yawDelta = Math.atan2(
        Math.sin(targetYaw - visualYaw),
        Math.cos(targetYaw - visualYaw),
      );
      visualYaw += yawDelta * (1 - Math.exp(-14 * dt));
      knight.root.rotation.y = visualYaw;
      camera.camera.getWorldDirection(forward);
      wind.update(dt, player.position, camera.listeningPosition, forward);
      const restTime =
        screen === "cinematic"
          ? cinematic.time
          : gettingUp > 0
            ? gettingUp
            : null;
      world.update(
        time,
        player.position,
        camera.camera.position,
        camera.composition
          ? {
              ...camera.composition,
              rest: smoothstep(4, 9, restTime ?? 0),
              heading: visualYaw,
            }
          : undefined,
      );
      const animationStart = performance.now();
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
        player.turnRate,
      );
      animationCpuMs =
        animationCpuMs * 0.9 + (performance.now() - animationStart) * 0.1;
      if (screen !== "menu") {
        camera.camera.getWorldDirection(forward);
        audio.update(
          dt,
          time,
          player.speed,
          terrainMaterial(player.position.x, player.position.z) === "stone",
          screen === "cinematic" ? cinematic.time : null,
          camera.listeningPosition,
          forward,
          knight.consumeFootfalls(),
        );
      }
    }
    renderer.render(
      world.scene,
      camera.camera,
      dt,
      world.grass.group,
      knight.root,
    );
    input.endFrame();
    const active =
      (screen === "playing" || screen === "cinematic") && !ui.modalOpen;
    if (active && pacingActive)
      pacing.observe(raw, performance.now() - frameStart);
    pacingActive = active;
    frameCount++;
    frameTimer += raw;
    frameMs = frameMs * 0.95 + raw * 1000 * 0.05;
    if (frameTimer > 0.5) {
      fps = Math.round(frameCount / frameTimer);
      frameCount = 0;
      frameTimer = 0;
      ui.diagnosticsText(
        `${fps} FPS · ${frameMs.toFixed(1)} ms\n${renderer.drawCalls} scene calls\nASCII ${renderer.columns} × ${renderer.rows}\n${screen} · ${player.speed.toFixed(1)} m/s\nCPU animation ${animationCpuMs.toFixed(2)} · camera ${cameraCpuMs.toFixed(2)} ms\nCPU scene ${renderer.sceneCpuMs.toFixed(2)} · ASCII ${renderer.asciiCpuMs.toFixed(2)} ms\nGrass pass ${renderer.grassCpuMs.toFixed(2)} ms CPU\nFrame p95 ${pacing.diagnostics.p95.toFixed(1)} · p99 ${pacing.diagnostics.p99.toFixed(1)} ms · >33ms ${pacing.diagnostics.over33}\nGPU scene ${renderer.profiler.milliseconds.scene?.toFixed(2) ?? "n/a"} · ASCII ${renderer.profiler.milliseconds.ascii?.toFixed(2) ?? "n/a"} · grass ${renderer.profiler.milliseconds.grass?.toFixed(2) ?? "n/a"} ms`,
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
        inspectCharacter: () => knight.imported?.inspectSurfaces() ?? null,
        captureStream: () => {
          const stream = renderer.renderer.domElement.captureStream(60),
            sound = audio.captureStream();
          for (const track of sound?.getAudioTracks() ?? [])
            stream.addTrack(track);
          return stream;
        },
        snapshot: () => ({
          screen,
          cameraMode,
          postureMode,
          composition: camera.diagnostics,
          history: renderer.historyDiagnostics,
          position: player.position.toArray(),
          speed: player.speed,
          rotation: player.rotation,
          rest: world.rest.toArray(),
          restAvailable: !!interactions.active,
          cinematicTime: cinematic.time,
          hipsY: knight.hips.position.y,
          hipsRotation: knight.hips.rotation.x,
          chestRotation:
            knight.rig.spine.rotation.x + knight.rig.chest.rotation.x,
          animation: knight.diagnostics,
          performance: {
            pacing: pacing.diagnostics,
            animationCpuMs,
            cameraCpuMs,
            sceneCpuMs: renderer.sceneCpuMs,
            asciiCpuMs: renderer.asciiCpuMs,
            grassCpuMs: renderer.grassCpuMs,
            gpu: { ...renderer.profiler.milliseconds },
          },
          grassInstances: world.grass.visibleInstances,
          glyphs: renderer.glyphCharacters,
          camera: camera.camera.position.toArray(),
          fps,
          drawCalls: renderer.drawCalls,
          columns: renderer.columns,
          rows: renderer.rows,
          audioUnlocked: audio.unlocked,
          audioContextState: audio.contextState,
          audio: audio.diagnostics,
          wind: wind.diagnostics,
          environment: {
            trees: 0,
            lamps: 0,
            shield: false,
            obstacles: world.obstacles.length,
            grass: world.grass.diagnostics,
          },
          sharedWind:
            world.grass.wind === wind &&
            knight.cape.wind === wind &&
            audio.windSystem === wind,
          settings: { ...settings },
        }),
      },
      configurable: false,
    });
  }
}
void boot().catch((error) => {
  console.error(error);
  const el = document.querySelector<HTMLElement>("#error");
  if (el) {
    el.hidden = false;
    el.textContent =
      "The journey could not begin. A WebGL2 browser and the bundled knight model are required. " +
      String(error);
  }
});
