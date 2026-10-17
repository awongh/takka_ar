import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";
import { Vector3 } from "three";

const FORWARD = new Vector3();
const POS = new Vector3();

type FloorReticleProps = {
  visible: boolean;
  placeDistance?: number;
  onPosition: (position: [number, number, number]) => void;
};

/** Projects a point along the camera forward onto the y=0 ground plane. */
export function FloorReticle({
  visible,
  placeDistance = 1.4,
  onPosition,
}: FloorReticleProps) {
  const meshRef = useRef<Mesh>(null);

  useFrame(({ camera }) => {
    if (!visible || !meshRef.current) {
      return;
    }

    camera.getWorldDirection(FORWARD);
    // Prefer looking at the ground; if nearly horizontal, still project.
    const origin = camera.position;
    let t: number;
    if (Math.abs(FORWARD.y) > 0.001) {
      t = -origin.y / FORWARD.y;
      if (t < 0.3 || t > 8) {
        // Fall back to a fixed distance ahead on the ground.
        POS.set(
          origin.x + FORWARD.x * placeDistance,
          0,
          origin.z + FORWARD.z * placeDistance,
        );
      } else {
        POS.copy(origin).addScaledVector(FORWARD, t);
        POS.y = 0;
      }
    } else {
      POS.set(
        origin.x + FORWARD.x * placeDistance,
        0,
        origin.z + FORWARD.z * placeDistance,
      );
    }

    meshRef.current.position.copy(POS);
    meshRef.current.position.y = 0.01;
    onPosition([POS.x, 0, POS.z]);
  });

  if (!visible) {
    return null;
  }

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.12, 0.18, 32]} />
      <meshBasicMaterial color="#4dffb5" transparent opacity={0.85} />
    </mesh>
  );
}
