/**
 * Detects whether this device can run 8th Wall world-tracking WebAR
 * (camera + WebGL + secure context). Desktop may still use preview mode.
 */
export async function isArCapable(): Promise<boolean> {
  if (!isSecureContext()) {
    return false;
  }

  if (!hasWebGl()) {
    return false;
  }

  if (!(await hasGetUserMedia())) {
    return false;
  }

  // World tracking is aimed at phones/tablets; desktop uses OrbitControls preview.
  return isMobileLike();
}

export function isPreviewCapable(): boolean {
  return hasWebGl();
}

function isSecureContext(): boolean {
  return window.isSecureContext === true;
}

function hasWebGl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl") || canvas.getContext("webgl2"),
    );
  } catch {
    return false;
  }
}

async function hasGetUserMedia(): Promise<boolean> {
  const media = navigator.mediaDevices;
  if (!media?.getUserMedia) {
    return false;
  }

  // Presence of the API is enough; permission is requested when AR starts.
  return true;
}

export function isMobileLike(): boolean {
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod/i.test(ua)) {
    return true;
  }
  // iPadOS desktop UA
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}
