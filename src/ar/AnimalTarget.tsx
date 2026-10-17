import { useAnimations, useGLTF } from "@react-three/drei";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import type { Group } from "three";
import { Box3, Vector3 } from "three";
import type { AnimalId } from "../animals";
import { animalSrc } from "../animals";

const TARGET_HEIGHT = 0.45;

type AnimalTargetProps = {
  animal: AnimalId;
  position: [number, number, number];
  onBounds: (center: Vector3, radius: number) => void;
  groupRef?: RefObject<Group | null>;
};

export function AnimalTarget({
  animal,
  position,
  onBounds,
  groupRef,
}: AnimalTargetProps) {
  const localRef = useRef<Group>(null);
  const ref = groupRef ?? localRef;
  const { scene, animations } = useGLTF(animalSrc(animal));
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const { actions, names } = useAnimations(animations, ref);

  useLayoutEffect(() => {
    const box = new Box3().setFromObject(cloned);
    const size = new Vector3();
    box.getSize(size);
    const height = Math.max(size.y, 0.001);
    const scale = TARGET_HEIGHT / height;
    cloned.scale.setScalar(scale);
    cloned.position.set(0, 0, 0);

    const scaled = new Box3().setFromObject(cloned);
    const center = new Vector3();
    scaled.getCenter(center);
    cloned.position.y -= scaled.min.y;
  }, [cloned]);

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
    const group = ref.current;
    if (!group) {
      return;
    }
    const box = new Box3().setFromObject(group);
    const center = new Vector3();
    const size = new Vector3();
    box.getCenter(center);
    box.getSize(size);
    const radius = Math.max(size.x, size.y, size.z) * 0.45;
    onBounds(center, Math.max(radius, 0.12));
  }, [cloned, onBounds, position, ref]);

  return (
    <group ref={ref} position={position}>
      <primitive object={cloned} />
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
