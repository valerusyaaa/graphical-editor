import { type ObjectInfo, type XYPosition, adaptToGrid, GraphicObjectScheme, Offsets } from "../";
import { useGraphicSchemeStore } from "../..";
import {
    BitmapText,
    Bounds,
    Container,
    Graphics,
    GraphicsContext,
    Matrix,
    Point,
    Polygon,
    Text,
    type BoundsData,
    type IHitArea,
} from "pixi.js";
import type { Viewport } from "pixi-viewport";

import type { IGraphicalEditorTooltip, ITool, ManagerTooltip } from "../../..";
import type { ObjectType } from "../types";

export type ObjectDescription = {
    featureObjectType: string;
    graphObjectType: ObjectType;
    thikness?: number;
    strokeWidth?: number;
    offsets?: Offsets;
    polynom?: number[];
    fillColor?: string;
    strokeColor?: string;
};

export class PointerGraphicObject extends GraphicObjectScheme {
    position: XYPosition;
    rotationAngle: number;
    flipHorizontal: boolean;
    flipVertical: boolean;
    offsets: Offsets;
    fillColor: string;
    strokeColor: string = "transparent";
    transformBounds: BoundsData;

    constructor(info: ObjectInfo) {
        const graphicSchemeStore = useGraphicSchemeStore();
        super(info);
        this.rotationAngle = info.rotateAngle ?? 0;
        this.flipHorizontal = info.flipHorizontal ?? false;
        this.flipVertical = info.flipVertical ?? false;
        this.objectType = "pointer";
        this.offsets = info.offsets ?? { left: 0, top: 0 };
        this.position = this.getComputedNodePosition(info.position!);
        this.fillColor = info.fillColor ?? "transparent";
        this.strokeColor = info.strokeColor ?? "transparent";
        this.transformBounds = new Bounds();
    }

    refreshPosition(position: XYPosition, viewport: Viewport) {
        this.position = adaptToGrid(position);
        const container = viewport.getChildByLabel(this.idObject.toString());
        if (container) {
            container.position.x = position.x;
            container.position.y = position.y;
            viewport._onUpdate();
            this.transformBounds = this.getBounds(viewport);
        }
    }

    rotate(angle: number, viewport: Viewport) {
        this.rotationAngle = angle;
        const container = viewport.getChildByLabel(this.idObject.toString());
        if (container) {
            container.rotation = (this.rotationAngle * Math.PI) / 180;
            this.transformBounds = this.getBounds(viewport);
            viewport._onUpdate();
        }
    }

    reflectHorizontal(viewport: Viewport) {
        this.flipHorizontal = !this.flipHorizontal;
        const container = viewport.getChildByLabel(this.idObject.toString());
        if (container) {
            const graphics = container.getChildByLabel("graphics");
            if (graphics) {
                graphics.scale.x = this.flipHorizontal ? -1 : 1;
                container.hitArea = this.getProcessingHitArea();
                this.transformBounds = this.getBounds(viewport);
                viewport._onUpdate();
            }
        }
    }

    reflectVertical(viewport: Viewport) {
        this.flipVertical = !this.flipVertical;
        const container = viewport.getChildByLabel(this.idObject.toString());
        if (container) {
            const graphics = container.getChildByLabel("graphics");
            if (graphics) {
                graphics.scale.y = this.flipVertical ? -1 : 1;
                container.hitArea = this.getProcessingHitArea();
                this.transformBounds = this.getBounds(viewport);
            }
        }
    }

    setStrokeColor(strokeColor: string) {
        this.strokeColor = strokeColor;
        const graphicSchemeStore = useGraphicSchemeStore();
        const viewport = graphicSchemeStore.getViewport();
        if (!viewport) {
            return;
        }
        const container = viewport.getChildByLabel(this.idObject.toString());
        if (container) {
            const graphics = container.getChildByLabel("graphics") as Graphics;
            if (graphics) {
                this.drawElement(graphics.context);
            }
        }
    }

    setFillColor(fillColor: string) {
        this.fillColor = fillColor;
        const graphicSchemeStore = useGraphicSchemeStore();
        const viewport = graphicSchemeStore.getViewport();
        if (!viewport) {
            return;
        }
        const container = viewport.getChildByLabel(this.idObject.toString());
        if (container) {
            const graphics = container.getChildByLabel("graphics") as Graphics;
            if (graphics) {
                this.drawElement(graphics.context);
            }
        }
    }
    async setFillStrokeAndDraw(fillColor: string, strokeColor: string, viewport: Viewport) {
        this.fillColor = fillColor;
        this.strokeColor = strokeColor;
        const container = viewport.getChildByLabel(this.idObject.toString());
        if (container) {
            const graphics = container.getChildByLabel("graphics") as Graphics;
            if (graphics) {
                this.drawElement(graphics.context);
            }
        }
    }

    async setFillStrokeColor(fillColor: string, strokeColor: string) {
        this.fillColor = fillColor;
        this.strokeColor = strokeColor;
    }

    delete(viewport: Viewport) {
        const container = viewport.getChildByLabel(this.idObject.toString());
        if (container) {
            viewport.removeChild(container);
            container.destroy();
        }
    }

    refreshLabel(label: string) {
        const graphicSchemeStore = useGraphicSchemeStore();
        const viewport = graphicSchemeStore.getViewport();
        if (!viewport) {
            return;
        }
        const container = viewport.getChildByLabel(this.idObject.toString());
        if (container) {
            const textElement = container.getChildByLabel("textElement") as BitmapText;
            if (textElement) {
                textElement.text = label;
            }
            viewport._onUpdate();
        }
    }

    refreshNodeData<T>(data: T): void {
        this.data = data;
    }

    private getComputedNodePosition(position: XYPosition): XYPosition {
        return {
            x: position.x - this.offsets.left,
            y: position.y - this.offsets.top,
        };
    }

    static getComputedPosition(position: XYPosition, graphType: GraphicObjectTypeDto): XYPosition {
        const offsets = getOffsetsGraphicObject(graphType);
        return {
            x: position.x + offsets.left,
            y: position.y + offsets.top,
        };
    }

    draw(viewport: Viewport, tool: ITool, tooltip?: IGraphicalEditorTooltip): void {
        //create container
        const container = new Container();
        container.label = this.idObject.toString();
        container.interactive = true;
        container.origin.set(this.offsets.left, this.offsets.top);
        container.rotation = (this.rotationAngle * Math.PI) / 180;
        container.position.set(this.position.x, this.position.y);
        container.onmousedown = async event => {
            await tool.onMouseDownPointerObject(event, this);
        };
        container.onrightclick = async event => {
            event.stopPropagation();
            tool.onContextMenuPointerObject(event, this);
            await tool.onMouseDownPointerObject(event, this);
        };

        container.onmouseenter = event => {
            tooltip?.showTooltip(event.pageX, event.pageY, this);
        };

        container.onmouseleave = event => {
            tooltip?.hideTooltip();
        };

        container.hitArea = this.getProcessingHitArea();

        //create graphics (фигурка объекта)
        const graphics = new Graphics();
        graphics.label = "graphics";
        this.drawElement(graphics.context);
        const sclaeX = this.flipHorizontal ? -1 : 1;
        const scaleY = this.flipVertical ? -1 : 1;
        graphics.origin.set(this.offsets.left, this.offsets.top);
        graphics.scale.set(sclaeX, scaleY);
        container.addChild(graphics);

        //статический текст объекта (WBH, GMS, PIG)
        const text = this.drawTextElement();
        if (text) {
            text.label = "textElement";
            container.addChild(text);
        }

        // подпись объекта (label) строго ниже объекта
        viewport.addChild(container);
        this.transformBounds = this.getBounds(viewport);
    }

    async drawElement(context: GraphicsContext): Promise<void> {}
    redraw(viewport: Viewport) {
        const container = viewport.getChildByLabel(`${this.idObject}`);
        if (container) {
            const graphics = container.getChildByLabel("graphics") as Graphics | undefined;
            if (graphics) {
                this.drawElement(graphics.context);
            }
        }
    }
    drawTextElement(): BitmapText | Text | undefined {
        return;
    }

    drawSelectedElement(position: XYPosition): GraphicsContext {
        return new GraphicsContext();
    }

    getProcessingHitArea() {
        const scaleX = this.flipHorizontal ? -1 : 1;
        const scaleY = this.flipVertical ? -1 : 1;
        const matrix = new Matrix()
            .translate(-this.offsets.left, -this.offsets.top)
            .scale(scaleX, scaleY)
            .translate(this.offsets.left, this.offsets.top);
        const points = this.getHitAreaPoints();
        const transformedPoints = points.map(p => matrix.apply(p)).flatMap(p => [p.x, p.y]);
        return new Polygon(transformedPoints);
    }

    getHitAreaPoints(): Point[] {
        return [];
    }
    getBounds(viewport: Viewport): BoundsData {
        const points = this.getHitAreaPoints();
        const transformPoints = points.map(p => {
            return viewport.worldTransform.apply(p);
        });
        const width = Math.max(...points.map(p => p.x));
        const height = Math.max(...points.map(p => p.y));
        return {
            minX: this.position.x,
            minY: this.position.y,
            maxX: width + this.position.x,
            maxY: height + this.position.y,
        };
    }
    transformHitArea(position: XYPosition): IHitArea | undefined {
        return;
    }
}
