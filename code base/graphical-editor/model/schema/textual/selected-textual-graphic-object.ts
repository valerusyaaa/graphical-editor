import type { Viewport } from "pixi-viewport";
import { SelectedGraphicObject, type InfoBase } from "../selected-graphic-object-scheme";
import type { ObjectInfo, XYPosition } from "../types";
import { Graphics, GraphicsContext, Point } from "pixi.js";
import type { TextualGraphicObject } from "./textual-graphic-object";
import type { ITool } from "../../tools";
import { useGraphicSchemeStore } from "../../stores";
import { adaptToGrid } from "../helper";

export class SelectedTextualGraphicObject extends SelectedGraphicObject {
    objectScheme?: TextualGraphicObject;
    position: XYPosition;
    tool: ITool;
    constructor(info: ObjectInfo) {
        super({
            id: info.id,
            typeSelect: "textual-select",
            isActive: true,
        });
        this.position = info.position ?? {
            x: 0,
            y: 0,
        };
        const graphicSchemeStore = useGraphicSchemeStore();
        this.tool = graphicSchemeStore.tool;
        this.graphics.interactive = true;
        this.graphics.onmousedown = async event => {
            event.stopPropagation();
            await this.tool.onMouseDownSelectedTextualObject(event, this);
        };
        this.graphics.onrightclick = async event => {
            event.stopPropagation();
            this.tool.onContextMenuTextualObject(event, this.idObject);
        };
    }
    delete(viewport: Viewport) {
        this.graphics.clear();
        viewport.removeChild(this.graphics);
        this.graphics.destroy();
    }
    draw(): Graphics {
        if (this.objectScheme) {
            const position = adaptToGrid(this.position);
            const width = this.objectScheme.bounds.width;
            const height = this.objectScheme.bounds.height;
            this.graphics.context = new GraphicsContext()
                .poly([
                    position.x,
                    position.y,

                    position.x + width,
                    position.y,

                    position.x + width,
                    position.y + height,

                    position.x,
                    position.y + height,
                ])
                .stroke({
                    width: 2,
                    color: "red",
                })
                .fill({
                    color: "white",
                    alpha: 0.3,
                });
        }
        return this.graphics;
    }

    public override move(position: XYPosition, viewport: Viewport): void {
        this.position = position;
        if (this.objectScheme) {
            this.objectScheme.refreshPosition(position, viewport);
        }
    }
    public override cancel(initPoints: XYPosition): void {
        this.position = initPoints;
    }

    public override normalizeToGrid(): void {}
    public override rotate(angle: number, viewport: Viewport): void {}
    public override setObjectScheme(object: TextualGraphicObject): void {
        this.objectScheme = object;
    }
}
