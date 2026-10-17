import type { ModelViewerElement } from "@google/model-viewer";
import type { DetailedHTMLProps, HTMLAttributes } from "react";

type ModelViewerJSX = DetailedHTMLProps<
  HTMLAttributes<ModelViewerElement>,
  ModelViewerElement
> & {
  src?: string;
  alt?: string;
  ar?: boolean;
  "ar-modes"?: string;
  "ios-src"?: string;
  "camera-controls"?: boolean;
  "auto-rotate"?: boolean;
  autoplay?: boolean;
  "animation-name"?: string;
  "shadow-intensity"?: string | number;
  "touch-action"?: string;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": ModelViewerJSX;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "model-viewer": ModelViewerElement;
  }
}

export {};
