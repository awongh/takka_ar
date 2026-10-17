import { useAnimations, useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Box3, Vector3, type Group, type Mesh } from "three";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import type { AnimalId } from "../animals";
import { animalSrc } from "../animals";

type AnimalTargetProps = {
  animal: AnimalId;
  /** Desired height in world units (meters with absolute AR scale). */
  height: number;
  position: [number, number, number];
  onBounds: (center: Vector3, radius: number) => void;
  groupRef?: RefObject<Group | null>;
};

export function AnimalTarget({
  animal,
  height,
  position,
  onBounds,
  groupRef,
}: AnimalTargetProps) {
  const localRef = useRef<Group>(null);
  const ref = groupRef ?? localRef;
  const { scene, animations } = useGLTF(animalSrc(animal));
  // Object3D.clone shares the skeleton with the source, so a parent scale
  // never reached the posed mesh. SkeletonUtils rebinds bones on the copy.
  const cloned = useMemo(() => cloneSkinned(scene), [scene]);
  const { actions, names } = useAnimations(animations, ref);
  // Geometry bounds, not Box3.setFromObject. The skeleton box collapses and
  // was producing a huge scale, so the camera sat inside one leg.
  const fit = useMemo(() => {
    cloned.scale.setScalar(1);
    cloned.position.set(0, 0, 0);
    cloned.rotation.set(0, 0, 0);
    cloned.updateMatrixWorld(true);

    const box = new Box3();
    const part = new Box3();
    cloned.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) {
        return;
      }
      const geo = mesh.geometry;
      if (!geo.boundingBox) {
        geo.computeBoundingBox();
      }
      if (!geo.boundingBox) {
        return;
      }
      part.copy(geo.boundingBox).applyMatrix4(mesh.matrixWorld);
      box.union(part);
    });

    const measured = box.max.y - box.min.y;
    const modelHeight = Number.isFinite(measured)
      ? Math.max(measured, 0.001)
      : 1;
    return {
      modelHeight,
      groundY: Number.isFinite(box.min.y) ? -box.min.y : 0,
    };
  }, [cloned]);
  const scale = height / fit.modelHeight;

  useEffect(() => {
    const idle =
      actions.Idle ??
      (names[0] ? actions[names[0]] : undefined) ??
      Object.values(actions)[0];
    idle?.reset().fadeIn(0.2).play();
    return () => {
      idle?.fadeOut(0.1);
    };
  }, [actions, names]);

  useEffect(() => {
    const center = new Vector3(
      position[0],
      position[1] + height * 0.5,
      position[2],
    );
    onBounds(center, height * 0.65);
  }, [height, onBounds, position]);

  return (
    <group ref={ref} position={position} scale={scale}>
      <group position={[0, fit.groundY, 0]}>
        <primitive object={cloned} />
      </group>
    </group>
  );
}

for (const id of [
  "Alpaca",
  "Bull",
  "Cow",
  "Deer",
  "Donkey",
  "Fox",
  "Horse",
  "Horse_White",
  "Husky",
  "ShibaInu",
  "Stag",
  "Wolf",
] as const) {
  useGLTF.preload(animalSrc(id));
}
