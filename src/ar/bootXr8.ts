import type { XR8Api } from "../xr8";

let loadPromise: Promise<XR8Api> | null = null;

function scriptUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}

function loadScript(src: string, attrs?: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`,
    );
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(`Failed to load ${src}`)),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    if (attrs) {
      for (const [key, value] of Object.entries(attrs)) {
        script.setAttribute(key, value);
      }
    }
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true },
    );
    script.addEventListener(
      "error",
      () => reject(new Error(`Failed to load ${src}`)),
      { once: true },
    );
    document.head.appendChild(script);
  });
}

function waitForXr8(): Promise<XR8Api> {
  if (window.XR8) {
    return Promise.resolve(window.XR8);
  }
  return new Promise((resolve) => {
    window.addEventListener(
      "xrloaded",
      () => {
        if (!window.XR8) {
          throw new Error("xrloaded fired without window.XR8");
        }
        resolve(window.XR8);
      },
      { once: true },
    );
  });
}

/** Load XR engine + extras into the page (copied to public/external). */
export function loadXr8(): Promise<XR8Api> {
  if (!loadPromise) {
    loadPromise = (async () => {
      await loadScript(scriptUrl("external/xr/xr.js"), {
        "data-preload-chunks": "slam",
        "data-chunk-base-url": scriptUrl("external/xr/"),
      });
      await Promise.all([
        loadScript(scriptUrl("external/xrextras/xrextras.js")),
        loadScript(scriptUrl("external/landing-page/landing-page.js")),
      ]);
      const XR8 = await waitForXr8();
      if (XR8.loadChunk) {
        await XR8.loadChunk("slam");
      }
      return XR8;
    })().catch((error) => {
      loadPromise = null;
      throw error;
    });
  }
  return loadPromise;
}

/** True after a `run` we started, until `releaseXr8Session`. */
let pipelineLive = false;

/**
 * Stop the camera and drop every pipeline module.
 *
 * `XR8.stop()` leaves modules registered. `addCameraPipelineModules` then
 * skips a name that already exists, so the next Start AR keeps the detached
 * `takka-r3f` closure and never mounts the animal in the new scene.
 * Call this on stop, and again before `run`, so a session left on the
 * landing screen still boots from an empty module list. `stop()` runs only
 * after a session we started, so the first boot does not reset a cold engine.
 */
export function releaseXr8Session(): void {
  const XR8 = window.XR8;
  if (!XR8) {
    pipelineLive = false;
    return;
  }
  if (pipelineLive) {
    try {
      XR8.stop();
    } catch {
      // Already stopped, or stop ran before the camera was attached.
    }
  }
  try {
    XR8.clearCameraPipelineModules?.();
  } catch {
    // Module list was already empty.
  }
  pipelineLive = false;
}

/** Call immediately before `XR8.run` so a failed start is still stopped. */
export function markXr8SessionLive(): void {
  pipelineLive = true;
}
