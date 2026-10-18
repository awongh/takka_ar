import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import type { AnimalId } from "../animals";
import { animalLabel, animalSrc } from "../animals";

const cache = new Map<string, GLTF>();
const pending = new Map<string, Promise<GLTF>>();

/**
 * Parsed animal, if `loadAnimal` has already finished for this id.
 * Safe to read during render. Does not suspend.
 */
export function peekAnimal(animal: AnimalId): GLTF | null {
  return cache.get(animalSrc(animal)) ?? null;
}

/** Download and parse one animal. A second call shares the same promise. */
export function loadAnimal(animal: AnimalId): Promise<GLTF> {
  const src = animalSrc(animal);
  const ready = cache.get(src);
  if (ready) {
    return Promise.resolve(ready);
  }
  const existing = pending.get(src);
  if (existing) {
    return existing;
  }

  const job = new Promise<GLTF>((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      src,
      (gltf) => {
        cache.set(src, gltf);
        pending.delete(src);
        resolve(gltf);
      },
      undefined,
      () => {
        pending.delete(src);
        reject(new Error(`Could not load ${animalLabel(animal)}`));
      },
    );
  });
  pending.set(src, job);
  return job;
}
