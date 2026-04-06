import type { Viewport } from "pixi-viewport";
import { GraphicObjectScheme } from "../graphic-object-scheme";
import type { ObjectInfo, XYPosition } from "../types";
import { Bounds, Container, Rectangle } from "pixi.js";
import { adaptToGrid } from "../helper";
import type { ITool } from "../../tools";

export class TextualGraphicObject extends GraphicObjectScheme {
    position: XYPosition;
    bounds: Bounds;
    constructor(info: ObjectInfo) {
        super(info);
        this.position = info.position ?? { x: 0, y: 0 };
        this.bounds = new Bounds();
    }
    override draw(viewport: Viewport, tool: ITool) {
        // Находим или создаем контейнер
        let container = viewport.getChildByLabel(`${this.idObject}-label`) as Container;
        if (!container) {
            container = new Container();
            container.label = `${this.idObject}-label`;
            container.position = this.position;
            container.interactive = true;
            const { width, height } = this.drawText(container);
            container.onmousedown = async event => {
                await tool.onMouseDownTextualObject(event, this);
            };
            container.onrightclick = async event => {
                event.stopPropagation();
                await tool.onContextMenuTextualObject(event, this.idObject);
                await tool.onMouseDownTextualObject(event, this);
            };
            container.hitArea = new Rectangle(0, 0, width, height);
            this.bounds = new Bounds(0, 0, width, height);
            viewport.addChild(container);
        } else {
            container.removeChildren();
        }
    }
    public drawText(container: Container): { width: number; height: number } {
        return {
            width: container.width,
            height: container.height,
        };
    }
    override refreshLabel(label: string): void {}
    override setStrokeColor(strokeColor: string): void {}
    refreshPosition(position: XYPosition, viewport: Viewport) {
        this.position = adaptToGrid(position);
        const container = viewport.getChildByLabel(`${this.idObject}-label`);
        if (container) {
            container.position.x = this.position.x;
            container.position.y = this.position.y;
            viewport._onUpdate();
        }
    }
    delete(viewport: Viewport) {
        const container = viewport.getChildByLabel(`${this.idObject}-label`);
        if (container) {
            viewport.removeChild(container);
            container.destroy();
        }
    }
}
