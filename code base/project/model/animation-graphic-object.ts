import { useGraphicSchemeStore } from "@/shared/graphical-editor";
import type { Viewport } from "pixi-viewport";
import { Color } from "pixi.js";
import { lerpColor } from "../lib";
import { BaseGraphicObject } from "./base-object-scheme";

export class AnimationGraphicObject extends BaseGraphicObject {
    stopPulseColorFn?: () => void;
    startPulsingColor(fillColorStart: string, fillColorEnd: string, strokeColorStart: string, strokeColorEnd: string) {
        const fillColors: [Color, Color] = [new Color(fillColorStart), new Color(fillColorEnd)];
        const strokeColors: [Color, Color] = [new Color(strokeColorStart), new Color(strokeColorEnd)];
        const viewport = useGraphicSchemeStore().getViewport() as Viewport;
        this.stopPulseColorFn = onTick(() => {
            const pulseSpeed = 0.005;
            const t = (Math.sin(performance.now() * pulseSpeed) + 1) / 2;

            const currentFill = lerpColor(fillColors[0].toNumber(), fillColors[1].toNumber(), t);
            const currentStroke = lerpColor(strokeColors[0].toNumber(), strokeColors[1].toNumber(), t);

            this.setFillStrokeAndDraw(currentFill.toHexa(), currentStroke.toHexa(), viewport);
        });
    }

    async stopPulsingColor() {
        if (this.stopPulseColorFn !== undefined) {
            this.stopPulseColorFn(); // отписка
            this.stopPulseColorFn = undefined;
            await nextTick();
        }
    }
}

export interface IAnimationManager {
    startPulsingColor(
        fillColorStart: string,
        fillColorEnd: string,
        strokeColorStart: string,
        strokeColorEnd: string
    ): void;
    stopPulsingColor(): void;
}
