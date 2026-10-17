import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";
import { Vector3 } from "three";
import type { ProjectileSpawn } from "./gameTypes";

const SPEED = 6;
const MAX_LIFE = 2.5;

type ProjectileProps = {
  spawn: ProjectileSpawn;
  targetCenter: Vector3 | null;
  targetRadius: number;
  onHit: (position: [number, number, number]) => void;
  onMiss: (id: number) => void;
};

export function Projectile({
  spawn,
  targetCenter,
  targetRadius,
  onHit,
  onMiss,
}: ProjectileProps) {
  const meshRef = useRef<Mesh>(null);
  const velocity = useRef(
    new Vector3(...spawn.direction).normalize().multiplyScalar(SPEED),
  );
  const age = useRef(0);
  const alive = useRef(true);

  useFrame((_, delta) => {
    if (!alive.current || !meshRef.current) {
      return;
    }

    age.current += delta;
    meshRef.current.position.addScaledVector(velocity.current, delta);

    if (targetCenter) {
      const dist = meshRef.current.position.distanceTo(targetCenter);
      if (dist <= targetRadius + 0.06) {
        alive.current = false;
        const { x, y, z } = meshRef.current.position;
        onHit([x, y, z]);
        return;
      }
    }

    if (age.current > MAX_LIFE) {
      alive.current = false;
      onMiss(spawn.id);
    }
  });

  return (
    <mesh ref={meshRef} position={spawn.origin} castShadow>
      <sphereGeometry args={[0.05, 12, 12]} />
      <meshStandardMaterial
        color="#ffcf33"
        emissive="#ff9a1f"
        emissiveIntensity={0.6}
      />
    </mesh>
  );
}
