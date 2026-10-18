/**
 * 8th Wall's loading module covers the HUD (`#loadingContainer` is z-index 800)
 * until a few frames after the camera is up, then fades `#loadBackground` out.
 */

const WATCHDOG_MS = 200;
const STUCK_OVERLAY_MS = 8000;

export function isLoadingOverlayVisible(): boolean {
  const background = document.getElementById("loadBackground");
  if (!background?.isConnected) {
    return false;
  }
  if (background.classList.contains("hidden")) {
    return false;
  }
  if (!background.classList.contains("fade-out")) {
    return true;
  }
  const opacity = Number.parseFloat(window.getComputedStyle(background).opacity);
  return !Number.isFinite(opacity) || opacity > 0.05;
}

export type LoadingOverlayWatch = {
  stop: () => void;
};

/**
 * Observe `#loadBackground` and re-sample on a short watchdog.
 * Calls `onChange` whenever visibility flips. After `pipelineStartedAt` + 8s,
 * calls `onStuck` once so a missed fade cannot hold the countdown forever.
 */
export function watchLoadingOverlay(options: {
  onChange: (visible: boolean) => void;
  onStuck: () => void;
  /** Epoch ms when the XR pipeline started; null until then. */
  getPipelineStartedAt: () => number | null;
}): LoadingOverlayWatch {
  let last: boolean | null = null;
  let stuckFired = false;

  const sample = () => {
    const visible = isLoadingOverlayVisible();
    if (last === null || last !== visible) {
      last = visible;
      options.onChange(visible);
    }

    const startedAt = options.getPipelineStartedAt();
    if (
      !stuckFired &&
      startedAt !== null &&
      performance.now() - startedAt >= STUCK_OVERLAY_MS &&
      visible
    ) {
      stuckFired = true;
      options.onStuck();
    }
  };

  sample();

  const observer = new MutationObserver(() => {
    sample();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style"],
  });

  const timer = window.setInterval(sample, WATCHDOG_MS);

  return {
    stop: () => {
      observer.disconnect();
      window.clearInterval(timer);
    },
  };
}
