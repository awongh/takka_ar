import type { Camera, Quaternion, Scene, Vector3, WebGLRenderer } from "three";

export type Xr8Scene = {
  scene: Scene;
  camera: Camera;
  renderer: WebGLRenderer;
};

export type Xr8PipelineModule = {
  name: string;
  onStart?: (args: {
    canvas: HTMLCanvasElement;
    canvasWidth: number;
    canvasHeight: number;
  }) => void;
  onUpdate?: (args?: unknown) => void;
  onDetach?: () => void;
  onRemove?: () => void;
};

export type XR8Api = {
  addCameraPipelineModules: (modules: Xr8PipelineModule[]) => void;
  addCameraPipelineModule: (module: Xr8PipelineModule) => void;
  removeCameraPipelineModules?: (names: string[]) => void;
  run: (options: { canvas: HTMLCanvasElement }) => void;
  stop: () => void;
  pause?: () => void;
  resume?: () => void;
  loadChunk?: (name: string) => Promise<void>;
  clearCameraPipelineModules?: () => void;
  GlTextureRenderer: {
    pipelineModule: () => Xr8PipelineModule;
  };
  Threejs: {
    pipelineModule: () => Xr8PipelineModule;
    xrScene: () => Xr8Scene;
  };
  XrController: {
    pipelineModule: () => Xr8PipelineModule;
    configure: (options?: Record<string, unknown>) => void;
    updateCameraProjectionMatrix: (options: {
      origin: Vector3;
      facing: Quaternion;
    }) => void;
    recenter: () => void;
  };
};

declare global {
  interface Window {
    XR8?: XR8Api;
    XRExtras?: {
      FullWindowCanvas: { pipelineModule: () => Xr8PipelineModule };
      Loading: { pipelineModule: () => Xr8PipelineModule };
      RuntimeError: { pipelineModule: () => Xr8PipelineModule };
    };
    LandingPage?: {
      pipelineModule: () => Xr8PipelineModule;
    };
    THREE?: typeof import("three");
  }
}

export {};
