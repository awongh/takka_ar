import { useFrame, useThree } from "@react-three/fiber";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Vector3 } from "three";
import type { AnimalId } from "../animals";
import { playDestroySound, playFireSound } from "../audio";
import { AnimalTarget } from "./AnimalTarget";
import { Explosion } from "./Explosion";
import { FloorMarker } from "./FloorMarker";
import { FloorReticle } from "./FloorReticle";
import type {
  ExplosionSpawn,
  GamePhase,
  ProjectileSettings,
  ProjectileSpawn,
} from "./gameTypes";
import {
  ANIMAL_PLACE_DISTANCE,
  CAMERA_HEIGHT_ABOVE_FLOOR,
  PROJECTILE_SPAWN_DISTANCE,
} from "./gameTypes";
import { Projectile } from "./Projectile";
import { aimCamera, cameraAimRay } from "./screenRay";

const COUNTDOWN_SECONDS = 3;
const COOLDOWN_SECONDS = 2;

export type GameWorldHandle = {
  shoot: () => void;
};

type GameWorldProps = {
  selectedAnimal: AnimalId;
  animalHeight: number;
  mode: "preview" | "ar";
  projectile: ProjectileSettings;
  showFloor: boolean;
  onPhaseChange: (phase: GamePhase, countdown: number | null) => void;
};

export const GameWorld = forwardRef<GameWorldHandle, GameWorldProps>(
  function GameWorld(
    { selectedAnimal, animalHeight, mode, projectile, showFloor, onPhaseChange },
    ref,
  ) {
    const camera = useThree((state) => state.camera);
    const [phase, setPhase] = useState<GamePhase>("countdown");
    const [countdown, setCountdown] = useState<number | null>(
      COUNTDOWN_SECONDS,
    );
    const [placePos, setPlacePos] = useState<[number, number, number]>([
      0,
      0,
      -ANIMAL_PLACE_DISTANCE,
    ]);
    const [animalPos, setAnimalPos] = useState<[number, number, number] | null>(
      null,
    );
    const [alive, setAlive] = useState(false);
    const [projectiles, setProjectiles] = useState<ProjectileSpawn[]>([]);
    const [explosions, setExplosions] = useState<ExplosionSpawn[]>([]);
    const [targetCenter, setTargetCenter] = useState<Vector3 | null>(null);
    const [targetRadius, setTargetRadius] = useState(0.2);

    const phaseRef = useRef(phase);
    const countdownRef = useRef(countdown);
    const countdownAcc = useRef(0);
    const cooldownAcc = useRef(0);
    const nextId = useRef(1);
    const placePosRef = useRef(placePos);
    const aliveRef = useRef(alive);
    const cameraDir = useRef(new Vector3());
    const cameraPos = useRef(new Vector3());
    const floorLocked = useRef(mode !== "ar");
    const [floorY, setFloorY] = useState(0);

    phaseRef.current = phase;
    countdownRef.current = countdown;
    placePosRef.current = placePos;
    aliveRef.current = alive;

    const onPhaseChangeRef = useRef(onPhaseChange);
    onPhaseChangeRef.current = onPhaseChange;
    const reportedRef = useRef<{
      phase: GamePhase;
      countdown: number | null;
    } | null>(null);

    const publish = useCallback(
      (nextPhase: GamePhase, nextCountdown: number | null) => {
        const prev = reportedRef.current;
        if (
          prev &&
          prev.phase === nextPhase &&
          prev.countdown === nextCountdown
        ) {
          return;
        }
        reportedRef.current = {
          phase: nextPhase,
          countdown: nextCountdown,
        };
        onPhaseChangeRef.current(nextPhase, nextCountdown);
      },
      [],
    );

    const startCountdown = useCallback(() => {
      countdownAcc.current = 0;
      phaseRef.current = "countdown";
      countdownRef.current = COUNTDOWN_SECONDS;
      setCountdown(COUNTDOWN_SECONDS);
      setPhase("countdown");
      setAlive(false);
      setAnimalPos(null);
      setTargetCenter(null);
      setProjectiles([]);
    }, []);

    useFrame((_, delta) => {
      // A permission prompt or app switch can deliver one huge step, or keep
      // frames running while the page is covered. Don't spend the countdown
      // on time the player can't see.
      const hidden = document.visibilityState === "hidden";
      const raw = Number.isFinite(delta) ? Math.max(0, delta) : 0;
      const timersPaused = hidden || raw > 0.5;
      const step = timersPaused ? 0 : Math.min(0.05, raw);

      if (!floorLocked.current && !hidden) {
        aimCamera(camera).getWorldPosition(cameraPos.current);
        floorLocked.current = true;
        setFloorY(cameraPos.current.y - CAMERA_HEIGHT_ABOVE_FLOOR);
      }

      if (phaseRef.current === "countdown") {
        countdownAcc.current += step;
        const remaining = Math.max(
          1,
          Math.ceil(COUNTDOWN_SECONDS - countdownAcc.current),
        );
        if (countdownAcc.current >= COUNTDOWN_SECONDS) {
          const pos =
            mode === "preview"
              ? ([0, 0, -ANIMAL_PLACE_DISTANCE] as [number, number, number])
              : placePosRef.current;
          phaseRef.current = "live";
          countdownRef.current = null;
          aliveRef.current = true;
          setAnimalPos(pos);
          setAlive(true);
          setCountdown(null);
          setPhase("live");
        } else if (remaining !== countdownRef.current) {
          countdownRef.current = remaining;
          setCountdown(remaining);
        }
      } else if (phaseRef.current === "cooldown") {
        cooldownAcc.current += step;
        if (cooldownAcc.current >= COOLDOWN_SECONDS) {
          startCountdown();
        }
      }

      // Report from the frame loop. The R3F tree is a separate root, and its
      // passive effects can be dropped while 8th Wall is starting the camera.
      publish(phaseRef.current, countdownRef.current);
    });

    useImperativeHandle(ref, () => ({
      shoot: () => {
        if (phaseRef.current !== "live" || !aliveRef.current) {
          return;
        }
        // Along the camera's optical axis, same as the desktop preview.
        const aimed = aimCamera(camera);
        if (!cameraAimRay(aimed, cameraPos.current, cameraDir.current)) {
          return;
        }

        const origin = cameraPos.current
          .clone()
          .addScaledVector(cameraDir.current, PROJECTILE_SPAWN_DISTANCE);
        const id = nextId.current++;
        playFireSound();
        setProjectiles((list) => [
          ...list,
          {
            id,
            origin: [origin.x, origin.y, origin.z],
            direction: [
              cameraDir.current.x,
              cameraDir.current.y,
              cameraDir.current.z,
            ],
          },
        ]);
      },
    }));

    const onBounds = useCallback((center: Vector3, radius: number) => {
      setTargetCenter(center.clone());
      setTargetRadius(radius);
    }, []);

    const handleHit = useCallback((position: [number, number, number]) => {
      setProjectiles([]);
      setAlive(false);
      setAnimalPos(null);
      setTargetCenter(null);
      const id = nextId.current++;
      playDestroySound();
      setExplosions((list) => [...list, { id, position }]);
      cooldownAcc.current = 0;
      phaseRef.current = "cooldown";
      countdownRef.current = null;
      setPhase("cooldown");
    }, []);

    const handleMiss = useCallback((id: number) => {
      setProjectiles((list) => list.filter((p) => p.id !== id));
    }, []);

    const handleExplosionDone = useCallback((id: number) => {
      setExplosions((list) => list.filter((e) => e.id !== id));
    }, []);

    return (
      <>
        <ambientLight intensity={0.85} />
        <directionalLight intensity={1.1} position={[3, 6, 2]} castShadow />

        <FloorMarker visible={showFloor} height={floorY} />

        <FloorReticle
          visible={mode === "ar" && phase === "countdown"}
          floorY={floorY}
          onPosition={setPlacePos}
        />

        {alive && animalPos ? (
          <AnimalTarget
            animal={selectedAnimal}
            height={animalHeight}
            position={animalPos}
            onBounds={onBounds}
          />
        ) : null}

        {projectiles.map((spawn) => (
          <Projectile
            key={spawn.id}
            spawn={spawn}
            size={projectile.size}
            speed={projectile.speed}
            gravityRatio={projectile.gravityRatio}
            tailLength={projectile.tailLength}
            targetCenter={targetCenter}
            targetRadius={targetRadius}
            onHit={handleHit}
            onMiss={handleMiss}
          />
        ))}

        {explosions.map((spawn) => (
          <Explosion
            key={spawn.id}
            spawn={spawn}
            onDone={handleExplosionDone}
          />
        ))}
      </>
    );
  },
);

/** Disables R3F auto-render so XR8.Threejs owns drawing the shared scene. */
export function SuppressR3fRender() {
  useFrame(() => {}, 1);
  return null;
}
