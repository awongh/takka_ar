import { advance, createRoot } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { AnimalId } from "../animals";
import type { XR8Api } from "../xr8";
import { loadXr8, stopXr8 } from "./bootXr8";
import type { GamePhase, ProjectileSettings } from "./gameTypes";
import {
  GameWorld,
  SuppressR3fRender,
  type GameWorldHandle,
} from "./GameWorld";

type EighthWallCanvasProps = {
  selectedAnimal: AnimalId;
  animalHeight: number;
  projectile: ProjectileSettings;
  showFloor: boolean;
  onPhaseChange: (phase: GamePhase, countdown: number | null) => void;
  worldRef: RefObject<GameWorldHandle | null>;
  onRunningChange: (running: boolean) => void;
  onError: (message: string) => void;
};

type R3fRoot = ReturnType<typeof createRoot>;

function ArBridge({
  selectedAnimal,
  animalHeight,
  projectile,
  showFloor,
  onPhaseChange,
  worldRef,
}: {
  selectedAnimal: AnimalId;
  animalHeight: number;
  projectile: ProjectileSettings;
  showFloor: boolean;
  onPhaseChange: (phase: GamePhase, countdown: number | null) => void;
  worldRef: RefObject<GameWorldHandle | null>;
}) {
  return (
    <>
      <SuppressR3fRender />
      <GameWorld
        ref={worldRef}
        selectedAnimal={selectedAnimal}
        animalHeight={animalHeight}
        mode="ar"
        projectile={projectile}
        showFloor={showFloor}
        onPhaseChange={onPhaseChange}
      />
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
}: EighthWallCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<R3fRoot | null>(null);
  const startedRef = useRef(false);
  const phaseCbRef = useRef(onPhaseChange);
  const worldHandleRef = useRef(worldRef);
  const animalRef = useRef(selectedAnimal);
  const animalHeightRef = useRef(animalHeight);
  const projectileRef = useRef(projectile);
  const showFloorRef = useRef(showFloor);
  phaseCbRef.current = onPhaseChange;
  worldHandleRef.current = worldRef;
  animalRef.current = selectedAnimal;
  animalHeightRef.current = animalHeight;
  projectileRef.current = projectile;
  showFloorRef.current = showFloor;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || startedRef.current) {
      return;
    }
    startedRef.current = true;

    let cancelled = false;
    let XR8: XR8Api | null = null;

    window.THREE = THREE;

    void (async () => {
      try {
        XR8 = await loadXr8();
        if (cancelled || !canvasRef.current) {
          return;
        }

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
            if (!XR8) {
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

            root.render(
              <ArBridge
                selectedAnimal={animalRef.current}
                animalHeight={animalHeightRef.current}
                projectile={projectileRef.current}
                showFloor={showFloorRef.current}
                onPhaseChange={(phase, countdown) =>
                  phaseCbRef.current(phase, countdown)
                }
                worldRef={worldHandleRef.current}
              />,
            );

            xrCanvas.addEventListener(
              "touchmove",
              (event) => {
                event.preventDefault();
              },
              { passive: false },
            );

            onRunningChange(true);
          },
          onUpdate: () => {
            const now = performance.now();
            const dt = Math.min(0.05, Math.max(0, (now - lastFrameMs) / 1000));
            lastFrameMs = now;
            simTime += dt;
            advance(simTime, true);
          },
        });

        XR8.addCameraPipelineModules(modules);
        XR8.run({ canvas });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to start AR";
        onError(message);
        onRunningChange(false);
      }
    })();

    return () => {
      cancelled = true;
      onRunningChange(false);
      try {
        rootRef.current?.unmount();
      } catch {
        // ignore
      }
      rootRef.current = null;
      void stopXr8();
      startedRef.current = false;
    };
    // Session boots once; prop updates re-render via the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    root.render(
      <ArBridge
        selectedAnimal={selectedAnimal}
        animalHeight={animalHeight}
        projectile={projectile}
        showFloor={showFloor}
        onPhaseChange={(phase, countdown) =>
          phaseCbRef.current(phase, countdown)
        }
        worldRef={worldHandleRef.current}
      />,
    );
  }, [selectedAnimal, animalHeight, projectile, showFloor]);

  return <canvas ref={canvasRef} id="camerafeed" className="camera-feed" />;
}
