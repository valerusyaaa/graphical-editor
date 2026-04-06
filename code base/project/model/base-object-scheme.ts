import type { Viewport } from "pixi-viewport";
import type { Graphics } from "pixi.js";
import { PointerGraphicObject } from "@/shared/graphical-editor/model/schema/pointer/pointer-graphic-object";
import { directionIconColors } from "../lib";

export class BaseGraphicObject extends PointerGraphicObject {
    arrowColor: string = directionIconColors.object.direction;
    reversArrowColor?: string;

    setColorArrow(color: string, viewport: Viewport) {
        this.arrowColor = color;
        const container = viewport.getChildByLabel(`${this.idObject}`);
        if (container) {
            const graphics = container.getChildByLabel("graphics") as Graphics | undefined;
            if (graphics) {
                this.drawElement(graphics.context);
            }
        }
    }
    setColorReversArrow(color: string, viewport: Viewport) {
        this.reversArrowColor = color;
        const container = viewport.getChildByLabel(`${this.idObject}`);
        if (container) {
            const graphics = container.getChildByLabel("graphics") as Graphics | undefined;
            if (graphics) {
                this.drawElement(graphics.context);
            }
        }
    }
    setColorDuplexArrow(colorArrow: string, colorReverseArrow: string | undefined) {
        this.arrowColor = colorArrow;
        this.reversArrowColor = colorReverseArrow;
    }
}
