import { Matrix, type GraphicsContext } from "pixi.js";
import type { XYPosition } from "@/shared/graphical-editor";
import { ControlMode } from "../../model";
import type { Viewport } from "pixi-viewport";

export interface IControlValve {
    setControlMode: (controlMode: ControlMode | undefined, viewport: Viewport) => void;
}

export function drawIconControlMode(
    graphicsContext: GraphicsContext,
    position: XYPosition,
    controlMode: ControlMode | undefined
) {
    if (controlMode === undefined) return;
    const matrix = new Matrix().scale(0.8, 0.8).translate(position.x, position.y);
    if (controlMode === ControlMode.Fixed) {
        const svgIconHand = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 16 16">
                            <path fill="#ffffff" d="M8.5 1.75a.75.75 0 0 0-1.5 0V6.5a.5.5 0 0 1-1 0V2.75a.75.75 0 0 0-1.5 0V7.5a.5.5 0 0 1-1 0V4.75A.75.75 0 0 0 2 4.748V9.5c0 .813.344 1.71.743 2.492c.407.797.906 1.54 1.283 2.059c.45.622 1.171.949 1.91.949h2.328c.952 0 1.797-.54 2.255-1.34a36 36 0 0 1 2.233-3.38a41 41 0 0 1 1.112-1.435l.015-.02l.004-.004h.001a.5.5 0 0 0-.03-.675a1.58 1.58 0 0 0-1.187-.482c-.4.01-.778.159-1.096.336a5 5 0 0 0-.57.379V2.75a.75.75 0 0 0-1.5 0V6.5a.5.5 0 0 1-1 0z"/>
                        </svg>`;
        graphicsContext.setTransform(matrix).svg(svgIconHand);
    } else {
        const svgIconBlock = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 12 12"><path fill="#ff3856" d="M12 6A6 6 0 1 1 0 6a6 6 0 0 1 12 0m-1.5 0a4.5 4.5 0 0 0-.832-2.607L3.393 9.668A4.5 4.5 0 0 0 10.5 6M8.607 2.332a4.5 4.5 0 0 0-6.275 6.275z"/></svg>`;
        graphicsContext.setTransform(matrix).svg(svgIconBlock);
    }
}
