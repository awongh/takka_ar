export const ANIMALS = [
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
] as const;

export type AnimalId = (typeof ANIMALS)[number];

export function animalSrc(id: AnimalId): string {
  return `${import.meta.env.BASE_URL}models/animals/${id}.gltf`;
}

export function animalLabel(id: AnimalId): string {
  return id.replaceAll("_", " ");
}
