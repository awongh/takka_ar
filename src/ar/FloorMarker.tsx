import { DoubleSide } from "three";

type FloorMarkerProps = {
  visible: boolean;
  height: number;
};

/** Horizontal marker on the ground plane. Red is +X, blue is +Z. */
export function FloorMarker({ visible, height }: FloorMarkerProps) {
  if (!visible) {
    return null;
  }

  return (
    <group position={[0, height + 0.012, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4, 64]} />
        <meshBasicMaterial
          color="#4dffb5"
          transparent
          opacity={0.28}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.92, 4, 64]} />
        <meshBasicMaterial
          color="#f4fff9"
          transparent
          opacity={0.95}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[1, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2, 0.06]} />
        <meshBasicMaterial color="#ff5a5a" depthWrite={false} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 0.002, 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.06, 2]} />
        <meshBasicMaterial color="#5aa7ff" depthWrite={false} side={DoubleSide} />
      </mesh>
    </group>
  );
}
