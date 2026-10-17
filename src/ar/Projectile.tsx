import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";
import { Vector3 } from "three";
import type { ProjectileSpawn } from "./gameTypes";

const MAX_LIFE = 4;

type ProjectileProps = {
  spawn: ProjectileSpawn;
  size: number;
  speed: number;
  targetCenter: Vector3 | null;
  targetRadius: number;
  onHit: (position: [number, number, number]) => void;
  onMiss: (id: number) => void;
};

export function Projectile({
  spawn,
  size,
  speed,
  targetCenter,
  targetRadius,
  onHit,
  onMiss,
}: ProjectileProps) {
  const meshRef = useRef<Mesh>(null);
  const velocity = useRef(
    new Vector3(...spawn.direction).normalize().multiplyScalar(speed),
  );
  const age = useRef(0);
  const alive = useRef(true);
  const hitPadding = size * 1.2;

  useFrame((_, delta) => {
    if (!alive.current || !meshRef.current) {
      return;
    }

    const step = Math.min(delta, 0.05);
    age.current += step;
    meshRef.current.position.addScaledVector(velocity.current, step);

    // Grace period so we never despawn on the spawn frame.
    if (targetCenter && age.current > 0.08) {
      const dist = meshRef.current.position.distanceTo(targetCenter);
      if (dist <= targetRadius + hitPadding) {
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
    <mesh
      ref={meshRef}
      position={spawn.origin}
      frustumCulled={false}
      renderOrder={10}
    >
      <sphereGeometry args={[size, 20, 20]} />
      {/* Unlit + depth-tested so it reads clearly over the camera feed */}
      <meshBasicMaterial color="#ffe14a" depthTest depthWrite />
    </mesh>
  );
}
