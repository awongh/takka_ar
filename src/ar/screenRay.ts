import { Raycaster, Vector2, Vector3, type Camera, type PerspectiveCamera } from "three";

const raycaster = new Raycaster();
const screenCenter = new Vector2(0, 0);

/**
 * Ray through the middle of the viewport.
 * Phone intrinsics put the lens axis off the screen center, so
 * camera.getWorldDirection() does not match where the view is aimed.
 */
export function screenCenterRay(
  camera: Camera,
  origin: Vector3,
  direction: Vector3,
): boolean {
  camera.updateMatrixWorld(true);
  raycaster.setFromCamera(screenCenter, camera as PerspectiveCamera);
  origin.copy(raycaster.ray.origin);
  direction.copy(raycaster.ray.direction);
  return direction.lengthSq() > 1e-8;
}

/** Prefer the camera 8th Wall updates each frame when an AR session is running. */
export function aimCamera(fallback: Camera): Camera {
  try {
    return window.XR8?.Threejs.xrScene().camera ?? fallback;
  } catch {
    return fallback;
  }
}
