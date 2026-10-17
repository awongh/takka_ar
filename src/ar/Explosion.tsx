import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { Color, Vector3 } from "three";
import type { ExplosionSpawn } from "./gameTypes";

const DURATION = 0.45;
const PARTICLE_COUNT = 18;

type ExplosionProps = {
  spawn: ExplosionSpawn;
  onDone: (id: number) => void;
};

export function Explosion({ spawn, onDone }: ExplosionProps) {
  const groupRef = useRef<Group>(null);
  const age = useRef(0);
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, () => {
      const dir = new Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 0.2,
        Math.random() * 2 - 1,
      ).normalize();
      return {
        dir,
        speed: 0.8 + Math.random() * 1.4,
        color: new Color().setHSL(0.05 + Math.random() * 0.08, 1, 0.55),
      };
    });
  }, []);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) {
      return;
    }
    age.current += delta;
    const t = age.current / DURATION;
    group.children.forEach((child, index) => {
      const p = particles[index];
      if (!p) {
        return;
      }
      child.position.addScaledVector(p.dir, p.speed * delta);
      child.scale.setScalar(Math.max(0.01, 1 - t));
    });
    if (age.current >= DURATION) {
      onDone(spawn.id);
    }
  });

  return (
    <group ref={groupRef} position={spawn.position}>
      {particles.map((p, index) => (
        <mesh key={index}>
          <sphereGeometry args={[0.04, 6, 6]} />
          <meshBasicMaterial color={p.color} />
        </mesh>
      ))}
    </group>
  );
}
