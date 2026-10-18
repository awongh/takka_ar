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
import { peekAnimal } from "./animalModel";
import { COUNTDOWN_SECONDS, COOLDOWN_SECONDS } from "./arSession";
import { AnimalTarget, LoadedAnimal } from "./AnimalTarget";
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

export type GameWorldHandle = {
  shoot: () => void;
  /** AR: true when live and aim is known but the animal is not mounted yet. */
  needsPlacement: () => boolean;
};

type GameWorldProps = {
  /** Null in AR until that animal's GLTF has been parsed. */
  selectedAnimal: AnimalId | null;
  animalHeight: number;
  mode: "preview" | "ar";
  projectile: ProjectileSettings;
  showFloor: boolean;
  /**
   * Preview: reports phase to App.
   * AR: unused — the session controller owns the HUD phase.
   */
  onPhaseChange: (phase: GamePhase, countdown: number | null) => void;
  /** AR only: phase from the session projection. */
  phase?: GamePhase;
  /** AR only: notify the session that a hit occurred. */
  onHit?: () => void;
};

export const GameWorld = forwardRef<GameWorldHandle, GameWorldProps>(
  function GameWorld(
    {
      selectedAnimal,
      animalHeight,
      mode,
      projectile,
      showFloor,
      onPhaseChange,
      phase: controlledPhase,
      onHit,
    },
    ref,
  ) {
    const camera = useThree((state) => state.camera);
    const arControlled = mode === "ar";

    const [previewPhase, setPreviewPhase] = useState<GamePhase>("countdown");
    const [countdown, setCountdown] = useState<number | null>(
      COUNTDOWN_SECONDS,
    );
    const [animalPos, setAnimalPos] = useState<[number, number, number] | null>(
      null,
    );
    const [alive, setAlive] = useState(false);
    const [projectiles, setProjectiles] = useState<ProjectileSpawn[]>([]);
    const [explosions, setExplosions] = useState<ExplosionSpawn[]>([]);
    const [targetCenter, setTargetCenter] = useState<Vector3 | null>(null);
    const [targetRadius, setTargetRadius] = useState(0.2);

    const phase = arControlled
      ? (controlledPhase ?? "idle")
      : previewPhase;

    const phaseRef = useRef(phase);
    const countdownRef = useRef(countdown);
    const countdownAcc = useRef(0);
    const cooldownAcc = useRef(0);
    const nextId = useRef(1);
    const aimRef = useRef<[number, number, number] | null>(null);
    const placedRef = useRef<[number, number, number] | null>(null);
    const aliveRef = useRef(alive);
    const cameraDir = useRef(new Vector3());
    const cameraPos = useRef(new Vector3());
    const floorLocked = useRef(mode !== "ar");
    const floorYRef = useRef(0);
    const [floorY, setFloorY] = useState(0);

    phaseRef.current = phase;
    countdownRef.current = countdown;

    const onPhaseChangeRef = useRef(onPhaseChange);
    onPhaseChangeRef.current = onPhaseChange;
    const onHitRef = useRef(onHit);
    onHitRef.current = onHit;

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

    const clearRound = useCallback(() => {
      setAlive(false);
      aliveRef.current = false;
      setAnimalPos(null);
      setTargetCenter(null);
      setProjectiles([]);
    }, []);

    const startPreviewCountdown = useCallback(() => {
      countdownAcc.current = 0;
      phaseRef.current = "countdown";
      countdownRef.current = COUNTDOWN_SECONDS;
      setCountdown(COUNTDOWN_SECONDS);
      setPreviewPhase("countdown");
      clearRound();
    }, [clearRound]);

    const onAimPosition = useCallback(
      (position: [number, number, number]) => {
        aimRef.current = position;
      },
      [],
    );

    // AR: snapshot the aim point during this render. setState here does not
    // commit under frameloop "never", so the mesh reads the ref directly.
    if (arControlled) {
      if (phase === "live") {
        if (!placedRef.current && aimRef.current) {
          const [x, y, z] = aimRef.current;
          placedRef.current = [x, y, z];
        }
      } else if (phase === "countdown" || phase === "idle") {
        placedRef.current = null;
      }
      aliveRef.current =
        phase === "live" &&
        placedRef.current !== null &&
        selectedAnimal !== null &&
        peekAnimal(selectedAnimal) !== null;
    } else {
      aliveRef.current = alive;
    }

    const arGltf =
      arControlled && selectedAnimal ? peekAnimal(selectedAnimal) : null;
    const arPlace = arControlled ? placedRef.current : null;

    // Keep sampling the floor until the animal is placed (ring only in countdown).
    const trackAim =
      arControlled &&
      (phase === "countdown" || (phase === "live" && placedRef.current === null));

    useFrame((_, delta) => {
      const hidden = document.visibilityState === "hidden";
      const raw = Number.isFinite(delta) ? Math.max(0, delta) : 0;
      const timersPaused = hidden || raw > 0.5;
      const step = timersPaused ? 0 : Math.min(0.05, raw);

      if (!floorLocked.current && !hidden) {
        aimCamera(camera).getWorldPosition(cameraPos.current);
        floorLocked.current = true;
        floorYRef.current = cameraPos.current.y - CAMERA_HEIGHT_ABOVE_FLOOR;
        setFloorY(floorYRef.current);
      }

      // Preview owns its match clock. AR clocks live in arSession.
      if (arControlled) {
        return;
      }

      if (phaseRef.current === "countdown") {
        countdownAcc.current += step;
        const remaining = Math.max(
          1,
          Math.ceil(COUNTDOWN_SECONDS - countdownAcc.current),
        );
        if (countdownAcc.current >= COUNTDOWN_SECONDS) {
          const pos = [0, 0, -ANIMAL_PLACE_DISTANCE] as [
            number,
            number,
            number,
          ];
          phaseRef.current = "live";
          countdownRef.current = null;
          aliveRef.current = true;
          setAnimalPos(pos);
          setAlive(true);
          setCountdown(null);
          setPreviewPhase("live");
        } else if (remaining !== countdownRef.current) {
          countdownRef.current = remaining;
          setCountdown(remaining);
        }
      } else if (phaseRef.current === "cooldown") {
        cooldownAcc.current += step;
        if (cooldownAcc.current >= COOLDOWN_SECONDS) {
          startPreviewCountdown();
        }
      }

      publish(phaseRef.current, countdownRef.current);
    });

    useImperativeHandle(ref, () => ({
      shoot: () => {
        if (phaseRef.current !== "live" || !aliveRef.current) {
          return;
        }
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
      needsPlacement: () =>
        arControlled &&
        phaseRef.current === "live" &&
        aimRef.current !== null &&
        (placedRef.current === null ||
          selectedAnimal === null ||
          peekAnimal(selectedAnimal) === null),
    }));

    const onBounds = useCallback((center: Vector3, radius: number) => {
      setTargetCenter(center.clone());
      setTargetRadius(radius);
    }, []);

    const handleHit = useCallback(
      (position: [number, number, number]) => {
        setProjectiles([]);
        setAlive(false);
        aliveRef.current = false;
        placedRef.current = null;
        setAnimalPos(null);
        setTargetCenter(null);
        const id = nextId.current++;
        playDestroySound();
        setExplosions((list) => [...list, { id, position }]);

        if (arControlled) {
          onHitRef.current?.();
          return;
        }

        cooldownAcc.current = 0;
        phaseRef.current = "cooldown";
        countdownRef.current = null;
        setPreviewPhase("cooldown");
      },
      [arControlled],
    );

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
          active={trackAim}
          visible={mode === "ar" && phase === "countdown"}
          floorYRef={floorYRef}
          onPosition={onAimPosition}
        />

        {arControlled && phase === "live" && arPlace && arGltf ? (
          <LoadedAnimal
            gltf={arGltf}
            height={animalHeight}
            position={arPlace}
            onBounds={onBounds}
          />
        ) : null}

        {!arControlled && alive && animalPos && selectedAnimal ? (
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
