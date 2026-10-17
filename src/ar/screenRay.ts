import { Vector3, type Camera } from "three";

/**
 * Ray along the camera's optical axis (local -Z).
 * That is the direction the camera is pointing, orthogonal to the screen,
 * and it matches the desktop preview. Unprojecting NDC (0, 0) tilts the
 * shot on a phone because the lens principal point is not the image center.
 */
export function cameraAimRay(
  camera: Camera,
  origin: Vector3,
  direction: Vector3,
): boolean {
  camera.updateWorldMatrix(true, false);
  camera.getWorldPosition(origin);
  camera.getWorldDirection(direction);
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
