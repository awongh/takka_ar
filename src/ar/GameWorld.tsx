import { useFrame } from "@react-three/fiber";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Vector3 } from "three";
import type { AnimalId } from "../animals";
import { AnimalTarget } from "./AnimalTarget";
import { Explosion } from "./Explosion";
import { FloorReticle } from "./FloorReticle";
import type {
  ExplosionSpawn,
  GamePhase,
  ProjectileSpawn,
} from "./gameTypes";
import { Projectile } from "./Projectile";

const COUNTDOWN_SECONDS = 3;
const COOLDOWN_SECONDS = 2;

export type GameWorldHandle = {
  shoot: () => void;
};

type GameWorldProps = {
  selectedAnimal: AnimalId;
  mode: "preview" | "ar";
  onPhaseChange: (phase: GamePhase, countdown: number | null) => void;
};

export const GameWorld = forwardRef<GameWorldHandle, GameWorldProps>(
  function GameWorld({ selectedAnimal, mode, onPhaseChange }, ref) {
    const [phase, setPhase] = useState<GamePhase>("countdown");
    const [countdown, setCountdown] = useState<number | null>(
      COUNTDOWN_SECONDS,
    );
    const [placePos, setPlacePos] = useState<[number, number, number]>([
      0, 0, -1.2,
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

    phaseRef.current = phase;
    countdownRef.current = countdown;
    placePosRef.current = placePos;
    aliveRef.current = alive;

    useEffect(() => {
      onPhaseChange(phase, countdown);
    }, [phase, countdown, onPhaseChange]);

    const startCountdown = useCallback(() => {
      countdownAcc.current = 0;
      setCountdown(COUNTDOWN_SECONDS);
      setPhase("countdown");
      setAlive(false);
      setAnimalPos(null);
      setTargetCenter(null);
      setProjectiles([]);
    }, []);

    useFrame((_, delta) => {
      const current = phaseRef.current;

      if (current === "countdown") {
        countdownAcc.current += delta;
        const remaining = Math.max(
          1,
          Math.ceil(COUNTDOWN_SECONDS - countdownAcc.current),
        );
        if (
          countdownAcc.current < COUNTDOWN_SECONDS &&
          remaining !== countdownRef.current
        ) {
          setCountdown(remaining);
        }
        if (countdownAcc.current >= COUNTDOWN_SECONDS) {
          const pos =
            mode === "preview"
              ? ([0, 0, 0] as [number, number, number])
              : placePosRef.current;
          setAnimalPos(pos);
          setAlive(true);
          setCountdown(null);
          setPhase("live");
        }
      }

      if (current === "cooldown") {
        cooldownAcc.current += delta;
        if (cooldownAcc.current >= COOLDOWN_SECONDS) {
          startCountdown();
        }
      }
    });

    useImperativeHandle(ref, () => ({
      shoot: () => {
        if (phaseRef.current !== "live" || !aliveRef.current) {
          return;
        }
        window.dispatchEvent(new CustomEvent("takka-shoot-request"));
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
      setExplosions((list) => [...list, { id, position }]);
      cooldownAcc.current = 0;
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

        <FloorReticle
          visible={mode === "ar" && phase === "countdown"}
          onPosition={setPlacePos}
        />

        {alive && animalPos ? (
          <AnimalTarget
            animal={selectedAnimal}
            position={animalPos}
            onBounds={onBounds}
          />
        ) : null}

        <ShootBridge
          enabled={phase === "live" && alive}
          onSpawn={(spawn) => setProjectiles((list) => [...list, spawn])}
          nextId={() => nextId.current++}
        />

        {projectiles.map((spawn) => (
          <Projectile
            key={spawn.id}
            spawn={spawn}
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

function ShootBridge({
  enabled,
  onSpawn,
  nextId,
}: {
  enabled: boolean;
  onSpawn: (spawn: ProjectileSpawn) => void;
  nextId: () => number;
}) {
  const cameraDir = useRef(new Vector3());
  const cameraPos = useRef(new Vector3());
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useFrame(({ camera }) => {
    camera.getWorldPosition(cameraPos.current);
    camera.getWorldDirection(cameraDir.current);
  });

  useEffect(() => {
    const onShoot = () => {
      if (!enabledRef.current) {
        return;
      }
      const origin = cameraPos.current
        .clone()
        .addScaledVector(cameraDir.current, 0.2);
      onSpawn({
        id: nextId(),
        origin: [origin.x, origin.y, origin.z],
        direction: [
          cameraDir.current.x,
          cameraDir.current.y,
          cameraDir.current.z,
        ],
      });
    };
    window.addEventListener("takka-shoot-request", onShoot);
    return () => window.removeEventListener("takka-shoot-request", onShoot);
  }, [nextId, onSpawn]);

  return null;
}

/** Disables R3F auto-render so XR8.Threejs owns drawing the shared scene. */
export function SuppressR3fRender() {
  useFrame(() => {}, 1);
  return null;
}
