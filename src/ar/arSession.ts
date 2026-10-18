import type { AnimalId } from "../animals";
import type { GamePhase } from "./gameTypes";

export const COUNTDOWN_SECONDS = 3;
export const COOLDOWN_SECONDS = 2;

/** Ignore a single gap larger than this (permission dialog return, app switch). */
const MAX_FRAME_STEP = 0.05;
const MAX_GAP_BEFORE_PAUSE = 0.5;

export type CameraStatus =
  | "requesting"
  | "hasStream"
  | "hasVideo"
  | "failed"
  | null;

export type SessionFact =
  | { type: "engine-ready"; generation: number }
  | { type: "camera"; generation: number; status: CameraStatus; reason?: string }
  | { type: "pipeline-started"; generation: number }
  | { type: "overlay"; generation: number; visible: boolean }
  | { type: "page-visible"; generation: number; visible: boolean }
  | { type: "frame"; generation: number; dt: number }
  | { type: "hit"; generation: number }
  | {
      type: "model";
      generation: number;
      status: "loading" | "ready" | "failed";
      animal: AnimalId;
      reason?: string;
    }
  | { type: "stopped"; generation: number };

export type SessionProjection = {
  mountWorld: boolean;
  phase: GamePhase;
  countdown: number | null;
  running: boolean;
  error: string | null;
  /** Animal whose GLTF has been parsed by the AR loader. */
  readyAnimal: AnimalId | null;
  /** Model load failure. Does not tear down the AR session. */
  modelError: string | null;
};

type MatchClock =
  | { kind: "idle" }
  | { kind: "countdown"; elapsed: number }
  | { kind: "live" }
  | { kind: "cooldown"; elapsed: number };

type SessionState = {
  generation: number;
  engineReady: boolean;
  camera: CameraStatus;
  cameraReason: string | null;
  pipelineStarted: boolean;
  overlayVisible: boolean;
  /** True once the overlay has been observed gone after pipeline start, or timed out. */
  overlayCleared: boolean;
  pageVisible: boolean;
  failed: boolean;
  error: string | null;
  stopped: boolean;
  match: MatchClock;
  modelStatus: "idle" | "loading" | "ready" | "failed";
  pendingAnimal: AnimalId | null;
  readyAnimal: AnimalId | null;
  modelError: string | null;
};

export function createSessionState(generation: number): SessionState {
  return {
    generation,
    engineReady: false,
    camera: null,
    cameraReason: null,
    pipelineStarted: false,
    // Optimistic until the loading module inserts #loadBackground.
    overlayVisible: false,
    overlayCleared: false,
    pageVisible:
      typeof document === "undefined"
        ? true
        : document.visibilityState !== "hidden",
    failed: false,
    error: null,
    stopped: false,
    match: { kind: "idle" },
    modelStatus: "idle",
    pendingAnimal: null,
    readyAnimal: null,
    modelError: null,
  };
}

function canPresent(state: SessionState): boolean {
  return (
    !state.failed &&
    !state.stopped &&
    state.pipelineStarted &&
    state.overlayCleared &&
    state.pageVisible &&
    state.modelStatus === "ready"
  );
}

function maybeStartMatch(state: SessionState): SessionState {
  if (
    canPresent(state) &&
    state.match.kind === "idle" &&
    !state.failed &&
    !state.stopped
  ) {
    return { ...state, match: startCountdownMatch() };
  }
  return state;
}

function startCountdownMatch(): MatchClock {
  return { kind: "countdown", elapsed: 0 };
}

function countdownRemaining(elapsed: number): number {
  return Math.max(1, Math.ceil(COUNTDOWN_SECONDS - elapsed));
}

function advanceMatch(match: MatchClock, step: number): MatchClock {
  if (match.kind === "countdown") {
    const elapsed = match.elapsed + step;
    if (elapsed >= COUNTDOWN_SECONDS) {
      return { kind: "live" };
    }
    return { kind: "countdown", elapsed };
  }
  if (match.kind === "cooldown") {
    const elapsed = match.elapsed + step;
    if (elapsed >= COOLDOWN_SECONDS) {
      return startCountdownMatch();
    }
    return { kind: "cooldown", elapsed };
  }
  return match;
}

export function reduce(state: SessionState, fact: SessionFact): SessionState {
  if (fact.generation !== state.generation) {
    return state;
  }

  switch (fact.type) {
    case "engine-ready":
      return { ...state, engineReady: true };

    case "camera": {
      if (fact.status === "failed") {
        return {
          ...state,
          camera: "failed",
          cameraReason: fact.reason ?? null,
          failed: true,
          error: fact.reason
            ? `Camera unavailable (${fact.reason})`
            : "Camera permission was denied",
          match: { kind: "idle" },
        };
      }
      return {
        ...state,
        camera: fact.status,
      };
    }

    case "pipeline-started": {
      // onStart means camera startup finished even if hasStream was missed.
      let next: SessionState = {
        ...state,
        pipelineStarted: true,
        camera:
          state.camera === "failed"
            ? state.camera
            : (state.camera ?? "hasStream"),
      };
      // Overlay may already be gone (or never inserted) by the time we latch.
      if (!next.overlayVisible) {
        next.overlayCleared = true;
      }
      next = maybeStartMatch(next);
      return next;
    }

    case "overlay": {
      let next: SessionState = { ...state, overlayVisible: fact.visible };
      if (state.pipelineStarted && !fact.visible) {
        next.overlayCleared = true;
      }
      next = maybeStartMatch(next);
      return next;
    }

    case "page-visible": {
      let next: SessionState = { ...state, pageVisible: fact.visible };
      next = maybeStartMatch(next);
      return next;
    }

    case "model": {
      if (fact.status === "loading") {
        return {
          ...state,
          modelStatus: "loading",
          pendingAnimal: fact.animal,
          modelError: null,
        };
      }
      if (state.pendingAnimal !== fact.animal) {
        return state;
      }
      if (fact.status === "failed") {
        return {
          ...state,
          modelStatus: "failed",
          modelError: fact.reason ?? `Could not load ${fact.animal}`,
        };
      }
      return maybeStartMatch({
        ...state,
        modelStatus: "ready",
        readyAnimal: fact.animal,
        modelError: null,
      });
    }

    case "frame": {
      let next = maybeStartMatch(state);
      if (!canPresent(next) || next.match.kind === "idle") {
        return next;
      }

      const raw = Number.isFinite(fact.dt) ? Math.max(0, fact.dt) : 0;
      if (!next.pageVisible || raw > MAX_GAP_BEFORE_PAUSE) {
        return next;
      }
      const step = Math.min(MAX_FRAME_STEP, raw);
      if (step <= 0) {
        return next;
      }
      return { ...next, match: advanceMatch(next.match, step) };
    }

    case "hit": {
      if (state.match.kind !== "live") {
        return state;
      }
      return { ...state, match: { kind: "cooldown", elapsed: 0 } };
    }

    case "stopped":
      return {
        ...state,
        stopped: true,
        match: { kind: "idle" },
        pipelineStarted: false,
        overlayCleared: false,
      };

    default:
      return state;
  }
}

/**
 * Force-clear a stuck overlay after the watchdog timeout so a missed fade
 * class cannot hold the countdown forever.
 */
export function forceOverlayClear(state: SessionState): SessionState {
  if (!state.pipelineStarted || state.overlayCleared || state.failed) {
    return state;
  }
  return maybeStartMatch({
    ...state,
    overlayVisible: false,
    overlayCleared: true,
  });
}

export function project(state: SessionState): SessionProjection {
  // Scene lifetime follows the camera pipeline. The splash only gates the clock.
  const mountWorld =
    !state.failed && !state.stopped && state.pipelineStarted;

  let phase: GamePhase = "idle";
  let countdown: number | null = null;

  if (state.failed || state.stopped) {
    phase = "idle";
  } else if (state.match.kind === "countdown") {
    phase = "countdown";
    countdown = countdownRemaining(state.match.elapsed);
  } else if (state.match.kind === "live") {
    phase = "live";
  } else if (state.match.kind === "cooldown") {
    phase = "cooldown";
  }

  return {
    mountWorld,
    phase,
    countdown,
    running: mountWorld && !state.failed,
    error: state.error,
    readyAnimal: state.readyAnimal,
    modelError: state.modelError,
  };
}

export function projectionsEqual(
  a: SessionProjection,
  b: SessionProjection,
): boolean {
  return (
    a.mountWorld === b.mountWorld &&
    a.phase === b.phase &&
    a.countdown === b.countdown &&
    a.running === b.running &&
    a.error === b.error &&
    a.readyAnimal === b.readyAnimal &&
    a.modelError === b.modelError
  );
}
