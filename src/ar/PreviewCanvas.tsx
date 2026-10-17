import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { RefObject } from "react";
import type { AnimalId } from "../animals";
import type { GamePhase, ProjectileSettings } from "./gameTypes";
import { ANIMAL_PLACE_DISTANCE } from "./gameTypes";
import { GameWorld, type GameWorldHandle } from "./GameWorld";

type PreviewCanvasProps = {
  selectedAnimal: AnimalId;
  animalHeight: number;
  projectile: ProjectileSettings;
  showFloor: boolean;
  onPhaseChange: (phase: GamePhase, countdown: number | null) => void;
  worldRef: RefObject<GameWorldHandle | null>;
};

export function PreviewCanvas({
  selectedAnimal,
  animalHeight,
  projectile,
  showFloor,
  onPhaseChange,
  worldRef,
}: PreviewCanvasProps) {
  return (
    <Canvas
      className="game-canvas"
      camera={{ position: [1.6, 1.3, 2.4], fov: 50, near: 0.01, far: 100 }}
      shadows
    >
      <color attach="background" args={["#d9dee7"]} />
      <GameWorld
        ref={worldRef}
        selectedAnimal={selectedAnimal}
        animalHeight={animalHeight}
        mode="preview"
        projectile={projectile}
        showFloor={showFloor}
        onPhaseChange={onPhaseChange}
      />
      <OrbitControls
        target={[0, 0.05, -ANIMAL_PLACE_DISTANCE]}
        enablePan={false}
        maxPolarAngle={Math.PI / 2.05}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[4, 48]} />
        <meshStandardMaterial color="#c5ccd6" />
      </mesh>
    </Canvas>
  );
}
