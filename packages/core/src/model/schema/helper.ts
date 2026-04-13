import type { XYPosition } from "@vue-flow/core";

export function adaptToGrid(position: XYPosition, gridStep: number = 10): XYPosition {
    return {
        x: Math.round(position.x / gridStep) * gridStep,
        y: Math.round(position.y / gridStep) * gridStep,
    };
}
