import { advance, createRoot } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { AnimalId } from "../animals";
import type { XR8Api } from "../xr8";
import { loadXr8, stopXr8 } from "./bootXr8";
import type { GamePhase } from "./gameTypes";
import {
  GameWorld,
  SuppressR3fRender,
  type GameWorldHandle,
} from "./GameWorld";

type EighthWallCanvasProps = {
  selectedAnimal: AnimalId;
  onPhaseChange: (phase: GamePhase, countdown: number | null) => void;
  worldRef: RefObject<GameWorldHandle | null>;
  onRunningChange: (running: boolean) => void;
  onError: (message: string) => void;
};

type R3fRoot = ReturnType<typeof createRoot>;

function ArBridge({
  selectedAnimal,
  onPhaseChange,
  worldRef,
}: {
  selectedAnimal: AnimalId;
  onPhaseChange: (phase: GamePhase, countdown: number | null) => void;
  worldRef: RefObject<GameWorldHandle | null>;
}) {
  return (
    <>
      <SuppressR3fRender />
      <GameWorld
        ref={worldRef}
        selectedAnimal={selectedAnimal}
        mode="ar"
        onPhaseChange={onPhaseChange}
      />
    </>
  );
}

export function EighthWallCanvas({
  selectedAnimal,
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
  phaseCbRef.current = onPhaseChange;
  worldHandleRef.current = worldRef;

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

        XR8.XrController.configure({});

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

        modules.push({
          name: "takka-r3f",
          onStart: ({ canvas: xrCanvas }) => {
            if (!XR8) {
              return;
            }
            const { scene, camera, renderer } = XR8.Threejs.xrScene();
            camera.position.set(0, 2, 2);
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
                selectedAnimal={selectedAnimal}
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
            advance(performance.now(), true);
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
    // Session boots once; animal updates re-render via the effect below.
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
        onPhaseChange={(phase, countdown) =>
          phaseCbRef.current(phase, countdown)
        }
        worldRef={worldHandleRef.current}
      />,
    );
  }, [selectedAnimal]);

  return <canvas ref={canvasRef} id="camerafeed" className="camera-feed" />;
}
