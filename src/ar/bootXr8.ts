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

export async function stopXr8(): Promise<void> {
  const XR8 = window.XR8;
  if (!XR8) {
    return;
  }
  try {
    XR8.stop();
  } catch {
    // already stopped
  }
}
