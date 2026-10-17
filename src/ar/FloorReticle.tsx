import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";
import { Vector3 } from "three";
import { ANIMAL_PLACE_DISTANCE } from "./gameTypes";
import { aimCamera, screenCenterRay } from "./screenRay";

const FORWARD = new Vector3();
const FLAT = new Vector3();
const ORIGIN = new Vector3();
const POS = new Vector3();
const WORLD_UP = new Vector3(0, 1, 0);

type FloorReticleProps = {
  visible: boolean;
  floorY: number;
  onPosition: (position: [number, number, number]) => void;
};

/** Ground point ANIMAL_PLACE_DISTANCE in front of the camera, on the floor. */
export function FloorReticle({
  visible,
  floorY,
  onPosition,
}: FloorReticleProps) {
  const meshRef = useRef<Mesh>(null);

  useFrame(({ camera }) => {
    if (!visible || !meshRef.current) {
      return;
    }

    const aimed = aimCamera(camera);
    if (!screenCenterRay(aimed, ORIGIN, FORWARD)) {
      return;
    }

    FLAT.set(FORWARD.x, 0, FORWARD.z);
    if (FLAT.lengthSq() < 1e-4) {
      // Looking straight up or down: step along the camera's right, flattened.
      FLAT.set(1, 0, 0).applyQuaternion(aimed.quaternion);
      FLAT.y = 0;
    }
    if (FLAT.lengthSq() < 1e-4) {
      FLAT.crossVectors(WORLD_UP, FORWARD);
    }
    FLAT.normalize();

    POS.set(
      ORIGIN.x + FLAT.x * ANIMAL_PLACE_DISTANCE,
      floorY,
      ORIGIN.z + FLAT.z * ANIMAL_PLACE_DISTANCE,
    );

    meshRef.current.position.copy(POS);
    meshRef.current.position.y = floorY + 0.01;
    onPosition([POS.x, floorY, POS.z]);
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
