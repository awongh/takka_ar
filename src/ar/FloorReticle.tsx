import { useFrame } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import type { Mesh } from "three";
import { Vector3 } from "three";
import { ANIMAL_PLACE_DISTANCE } from "./gameTypes";
import { aimCamera, cameraAimRay } from "./screenRay";

const FORWARD = new Vector3();
const FLAT = new Vector3();
const ORIGIN = new Vector3();
const POS = new Vector3();
const WORLD_UP = new Vector3(0, 1, 0);

type FloorReticleProps = {
  /** Update the aim point each frame (may run with the ring hidden). */
  active: boolean;
  visible: boolean;
  floorYRef: RefObject<number>;
  onPosition: (position: [number, number, number]) => void;
};

/** Ground point ANIMAL_PLACE_DISTANCE in front of the camera, on the floor. */
export function FloorReticle({
  active,
  visible,
  floorYRef,
  onPosition,
}: FloorReticleProps) {
  const meshRef = useRef<Mesh>(null);

  useFrame(({ camera }) => {
    if (!active) {
      return;
    }

    const aimed = aimCamera(camera);
    if (!cameraAimRay(aimed, ORIGIN, FORWARD)) {
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

    const floorY = floorYRef.current;
    POS.set(
      ORIGIN.x + FLAT.x * ANIMAL_PLACE_DISTANCE,
      floorY,
      ORIGIN.z + FLAT.z * ANIMAL_PLACE_DISTANCE,
    );

    onPosition([POS.x, floorY, POS.z]);

    if (visible && meshRef.current) {
      meshRef.current.position.copy(POS);
      meshRef.current.position.y = floorY + 0.01;
    }
  });

  if (!active) {
    return null;
  }

  // Always mount while tracking so useFrame keeps writing the aim ref.
  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      visible={visible}
    >
      <ringGeometry args={[0.12, 0.18, 32]} />
      <meshBasicMaterial color="#4dffb5" transparent opacity={0.85} />
    </mesh>
  );
}
