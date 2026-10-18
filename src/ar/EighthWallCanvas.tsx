import { advance, createRoot, extend, flushSync } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { AnimalId } from "../animals";
import type { XR8Api } from "../xr8";
import {
  createSessionState,
  forceOverlayClear,
  project,
  projectionsEqual,
  reduce,
  type SessionFact,
  type SessionProjection,
} from "./arSession";
import { loadXr8, markXr8SessionLive, releaseXr8Session } from "./bootXr8";
import type { GamePhase, ProjectileSettings } from "./gameTypes";
import {
  GameWorld,
  SuppressR3fRender,
  type GameWorldHandle,
} from "./GameWorld";
import { loadAnimal, peekAnimal } from "./animalModel";
import { isLoadingOverlayVisible, watchLoadingOverlay } from "./loadingOverlay";

type EighthWallCanvasProps = {
  selectedAnimal: AnimalId;
  animalHeight: number;
  projectile: ProjectileSettings;
  showFloor: boolean;
  onPhaseChange: (phase: GamePhase, countdown: number | null) => void;
  worldRef: RefObject<GameWorldHandle | null>;
  onRunningChange: (running: boolean) => void;
  onError: (message: string) => void;
  onModelError: (message: string | null) => void;
};

type R3fRoot = ReturnType<typeof createRoot>;

// `<Canvas>` registers every THREE class when it mounts. `createRoot` does not.
// The catalogue is process-global, so without this call a cold AR start throws
// "Mesh is not part of the THREE namespace" and the animal never mounts.
// Opening the desktop preview first hid that: its canvas ran `extend(THREE)`.
// The namespace also exports non-constructors; the runtime call ignores those.
extend(
  THREE as unknown as Record<string, new (...args: never[]) => object>,
);

function ArBridge({
  mountWorld,
  phase,
  readyAnimal,
  animalHeight,
  projectile,
  showFloor,
  onHit,
  worldRef,
}: {
  mountWorld: boolean;
  phase: GamePhase;
  readyAnimal: AnimalId | null;
  animalHeight: number;
  projectile: ProjectileSettings;
  showFloor: boolean;
  onHit: () => void;
  worldRef: RefObject<GameWorldHandle | null>;
}) {
  return (
    <>
      <SuppressR3fRender />
      {mountWorld ? (
        <GameWorld
          ref={worldRef}
          selectedAnimal={readyAnimal}
          animalHeight={animalHeight}
          mode="ar"
          projectile={projectile}
          showFloor={showFloor}
          phase={phase}
          onHit={onHit}
          onPhaseChange={() => {
            // AR HUD phase is owned by the session controller.
          }}
        />
      ) : null}
    </>
  );
}

export function EighthWallCanvas({
  selectedAnimal,
  animalHeight,
  projectile,
  showFloor,
  onPhaseChange,
  worldRef,
  onRunningChange,
  onError,
  onModelError,
}: EighthWallCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<R3fRoot | null>(null);
  const startedRef = useRef(false);
  const generationRef = useRef(0);
  const sessionRef = useRef(createSessionState(0));
  const lastProjectionRef = useRef<SessionProjection | null>(null);
  const pipelineStartedAtRef = useRef<number | null>(null);
  const overlayWatchRef = useRef<{ stop: () => void } | null>(null);

  const phaseCbRef = useRef(onPhaseChange);
  const runningCbRef = useRef(onRunningChange);
  const errorCbRef = useRef(onError);
  const modelErrorCbRef = useRef(onModelError);
  const worldHandleRef = useRef(worldRef);
  const animalHeightRef = useRef(animalHeight);
  const projectileRef = useRef(projectile);
  const showFloorRef = useRef(showFloor);

  phaseCbRef.current = onPhaseChange;
  runningCbRef.current = onRunningChange;
  errorCbRef.current = onError;
  modelErrorCbRef.current = onModelError;
  worldHandleRef.current = worldRef;
  animalHeightRef.current = animalHeight;
  projectileRef.current = projectile;
  showFloorRef.current = showFloor;

  const lastErrorRef = useRef<string | null>(null);
  const lastModelErrorRef = useRef<string | null>(null);

  const publishProjectionRef = useRef<(proj: SessionProjection) => void>(
    () => {},
  );
  publishProjectionRef.current = (proj) => {
    const prev = lastProjectionRef.current;
    if (prev && projectionsEqual(prev, proj)) {
      return;
    }
    lastProjectionRef.current = proj;

    phaseCbRef.current(proj.phase, proj.countdown);
    runningCbRef.current(proj.running);
    if (proj.error && proj.error !== lastErrorRef.current) {
      lastErrorRef.current = proj.error;
      errorCbRef.current(proj.error);
    }
    if (proj.modelError !== lastModelErrorRef.current) {
      lastModelErrorRef.current = proj.modelError;
      modelErrorCbRef.current(proj.modelError);
    }
  };

  const renderBridgeRef = useRef<() => void>(() => {});
  renderBridgeRef.current = () => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const proj = project(sessionRef.current);
    const draw = () => {
      root.render(
        <ArBridge
          mountWorld={proj.mountWorld}
          phase={proj.phase}
          readyAnimal={proj.readyAnimal}
          animalHeight={animalHeightRef.current}
          projectile={projectileRef.current}
          showFloor={showFloorRef.current}
          onHit={() => {
            applyFactRef.current({
              type: "hit",
              generation: generationRef.current,
            });
          }}
          worldRef={worldHandleRef.current}
        />,
      );
    };
    // Arming gameplay goes through updateContainer, which is async. Flush so
    // GameWorld mounts on this frame even if a dialog starved the queue.
    try {
      flushSync(draw);
    } catch (error) {
      // A suspended child used to be swallowed here, and frameloop "never"
      // never retries it. Resume once that promise settles.
      if (
        error &&
        typeof error === "object" &&
        "then" in error &&
        typeof (error as { then: unknown }).then === "function"
      ) {
        void (error as Promise<unknown>).then(() => {
          renderBridgeRef.current();
        });
        return;
      }
      // Re-entering draw() rethrows. A missing THREE catalogue used to do
      // that on every frame and leave the scene empty.
      console.error(error);
    }
  };

  const applyFactRef = useRef<(fact: SessionFact) => void>(() => {});
  applyFactRef.current = (fact) => {
    if (fact.generation !== generationRef.current) {
      return;
    }
    const prev = project(sessionRef.current);
    sessionRef.current = reduce(sessionRef.current, fact);
    const proj = project(sessionRef.current);

    // Re-render when the mounted scene or the cached animal changes.
    if (
      rootRef.current &&
      (proj.mountWorld !== prev.mountWorld ||
        proj.phase !== prev.phase ||
        proj.readyAnimal !== prev.readyAnimal ||
        fact.type === "pipeline-started")
    ) {
      renderBridgeRef.current();
    }

    publishProjectionRef.current(proj);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || startedRef.current) {
      return;
    }
    startedRef.current = true;

    const generation = generationRef.current + 1;
    generationRef.current = generation;
    sessionRef.current = createSessionState(generation);
    lastProjectionRef.current = null;
    pipelineStartedAtRef.current = null;

    let XR8: XR8Api | null = null;
    window.THREE = THREE;

    const onVisibility = () => {
      applyFactRef.current({
        type: "page-visible",
        generation: generationRef.current,
        visible: document.visibilityState !== "hidden",
      });
    };
    document.addEventListener("visibilitychange", onVisibility);

    overlayWatchRef.current = watchLoadingOverlay({
      onChange: (visible) => {
        applyFactRef.current({
          type: "overlay",
          generation: generationRef.current,
          visible,
        });
      },
      onStuck: () => {
        sessionRef.current = forceOverlayClear(sessionRef.current);
        const proj = project(sessionRef.current);
        if (rootRef.current) {
          renderBridgeRef.current();
        }
        publishProjectionRef.current(proj);
      },
      getPipelineStartedAt: () => pipelineStartedAtRef.current,
    });

    void (async () => {
      try {
        XR8 = await loadXr8();
        if (generationRef.current !== generation || !canvasRef.current) {
          return;
        }

        applyFactRef.current({ type: "engine-ready", generation });

        const extras = window.XRExtras;
        const landing = window.LandingPage;

        // Absolute scale → world units are meters, so animal height is real-world size.
        XR8.XrController.configure({ scale: "absolute" });

        const modules = [
          XR8.GlTextureRenderer.pipelineModule(),
          XR8.Threejs.pipelineModule(),
          XR8.XrController.pipelineModule(),
        ];
        if (landing?.pipelineModule) {
          modules.push(landing.pipelineModule());
        }
        if (extras?.FullWindowCanvas) {
          modules.push(extras.FullWindowCanvas.pipelineModule());
        }
        if (extras?.Loading) {
          modules.push(extras.Loading.pipelineModule());
        }
        if (extras?.RuntimeError) {
          modules.push(extras.RuntimeError.pipelineModule());
        }

        // R3F `advance(timestamp)` in frameloop="never" uses timestamp as seconds.
        // performance.now() is milliseconds, so passing it raw made every AR
        // frame ~16 "seconds" and projectiles left the view instantly.
        let simTime = 0;
        let lastFrameMs = performance.now();

        modules.push({
          name: "takka-r3f",
          onStart: ({ canvas: xrCanvas }) => {
            if (!XR8 || generationRef.current !== generation) {
              return;
            }
            const { scene, camera, renderer } = XR8.Threejs.xrScene();
            // R3F would otherwise rebuild a centered frustum and wipe the
            // phone intrinsics XR writes every frame.
            (camera as THREE.PerspectiveCamera & { manual?: boolean }).manual =
              true;
            // Keep the session origin at the phone. The ground is placed
            // CAMERA_HEIGHT_ABOVE_FLOOR below this pose, not at y = 0.
            camera.position.set(0, 0, 0);
            XR8.XrController.updateCameraProjectionMatrix({
              origin: camera.position,
              facing: camera.quaternion,
            });

            const root = createRoot(xrCanvas);
            rootRef.current = root;
            void root.configure({
              gl: renderer,
              // XR8 owns a PerspectiveCamera; cast for R3F's CameraProps union.
              camera: camera as THREE.PerspectiveCamera,
              scene,
              frameloop: "never",
              size: {
                width: xrCanvas.clientWidth,
                height: xrCanvas.clientHeight,
                top: 0,
                left: 0,
              },
              dpr: Math.min(window.devicePixelRatio, 2),
            });

            pipelineStartedAtRef.current = performance.now();
            // Sample before latching so we don't clear a loading screen that
            // exists but has not yet been observed by the MutationObserver.
            applyFactRef.current({
              type: "overlay",
              generation,
              visible: isLoadingOverlayVisible(),
            });
            applyFactRef.current({ type: "pipeline-started", generation });

            xrCanvas.addEventListener(
              "touchmove",
              (event) => {
                event.preventDefault();
              },
              { passive: false },
            );
          },
          onCameraStatusChange: ({ status, reason }) => {
            if (generationRef.current !== generation) {
              return;
            }
            if (
              status === "requesting" ||
              status === "hasStream" ||
              status === "hasVideo" ||
              status === "failed"
            ) {
              applyFactRef.current({
                type: "camera",
                generation,
                status,
                reason,
              });
            }
          },
          onUpdate: () => {
            if (generationRef.current !== generation) {
              return;
            }
            const now = performance.now();
            const dt = Math.max(0, (now - lastFrameMs) / 1000);
            lastFrameMs = now;
            // Match clock uses the raw gap (session clamps / pauses).
            applyFactRef.current({ type: "frame", generation, dt });
            // Scene sim still needs a capped step so projectiles stay readable.
            const simDt = Math.min(0.05, dt);
            simTime += simDt;
            advance(simTime, true);
            // Reticle may write aimRef during advance after phase went live.
            if (worldHandleRef.current.current?.needsPlacement()) {
              renderBridgeRef.current();
            }
          },
        });

        // Drop a pipeline left behind by Stop AR. Modules are keyed by name,
        // and a second add of `takka-r3f` would be ignored.
        releaseXr8Session();
        if (generationRef.current !== generation || !canvasRef.current) {
          return;
        }

        XR8.addCameraPipelineModules(modules);
        markXr8SessionLive();
        XR8.run({ canvas });
      } catch (error) {
        if (generationRef.current !== generation) {
          return;
        }
        const message =
          error instanceof Error ? error.message : "Failed to start AR";
        errorCbRef.current(message);
        runningCbRef.current(false);
      }
    })();

    return () => {
      const gen = generationRef.current;
      applyFactRef.current({ type: "stopped", generation: gen });
      generationRef.current = gen + 1;
      pipelineStartedAtRef.current = null;
      overlayWatchRef.current?.stop();
      overlayWatchRef.current = null;
      document.removeEventListener("visibilitychange", onVisibility);
      runningCbRef.current(false);
      // Stop the camera and unregister modules before the root tears down, so
      // a late frame cannot draw with this session's closure.
      releaseXr8Session();
      try {
        rootRef.current?.unmount();
      } catch {
        // ignore
      }
      rootRef.current = null;
      startedRef.current = false;
    };
    // Session boots once; prop updates re-render via the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const generation = generationRef.current;
    const animal = selectedAnimal;
    let cancelled = false;

    applyFactRef.current({
      type: "model",
      generation,
      status: "loading",
      animal,
    });

    const finishReady = () => {
      if (cancelled || generationRef.current !== generation) {
        return;
      }
      applyFactRef.current({
        type: "model",
        generation,
        status: "ready",
        animal,
      });
    };

    if (peekAnimal(animal)) {
      finishReady();
    } else {
      void loadAnimal(animal)
        .then(finishReady)
        .catch((error: unknown) => {
          if (cancelled || generationRef.current !== generation) {
            return;
          }
          const reason =
            error instanceof Error ? error.message : `Could not load ${animal}`;
          applyFactRef.current({
            type: "model",
            generation,
            status: "failed",
            animal,
            reason,
          });
        });
    }

    return () => {
      cancelled = true;
    };
  }, [selectedAnimal]);

  useEffect(() => {
    renderBridgeRef.current();
  }, [animalHeight, projectile, showFloor]);

  return <canvas ref={canvasRef} id="camerafeed" className="camera-feed" />;
}
