type XrNavigator = Navigator & {
  xr?: {
    isSessionSupported(mode: string): Promise<boolean>;
  };
};

/**
 * Detects whether this device can use model-viewer's AR paths:
 * WebXR immersive-ar, Android Scene Viewer, or iOS Quick Look.
 * Mirrors the candidate checks used by @google/model-viewer.
 */
export async function isArCapable(): Promise<boolean> {
  if (await supportsWebXrAr()) {
    return true;
  }

  if (isQuickLookCandidate()) {
    return true;
  }

  if (isSceneViewerCandidate()) {
    return true;
  }

  return false;
}

async function supportsWebXrAr(): Promise<boolean> {
  const xr = (navigator as XrNavigator).xr;
  if (!xr?.isSessionSupported) {
    return false;
  }

  try {
    return await xr.isSessionSupported("immersive-ar");
  } catch {
    return false;
  }
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  const classicIos = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
  const iPadOsDesktopUa =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return classicIos || iPadOsDesktopUa;
}

function isQuickLookCandidate(): boolean {
  if (!isIos()) {
    return false;
  }

  const isThirdPartyIosBrowser =
    /CriOS\/|EdgiOS\/|FxiOS\/|GSA\/|DuckDuckGo\//.test(navigator.userAgent);
  // Google Search App is not a reliable Quick Look host for model-viewer.
  if (/GSA\//.test(navigator.userAgent)) {
    return false;
  }
  if (isThirdPartyIosBrowser) {
    return true;
  }

  const anchor = document.createElement("a");
  return Boolean(anchor.relList?.supports?.("ar"));
}

function isSceneViewerCandidate(): boolean {
  const ua = navigator.userAgent;
  const isAndroid = /android/i.test(ua);
  const isFirefox = /firefox/i.test(ua);
  const isOculus = /OculusBrowser/i.test(ua);
  return isAndroid && !isFirefox && !isOculus;
}
