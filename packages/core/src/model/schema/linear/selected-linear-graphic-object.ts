import {
    adaptToGrid,
    LinearGraphicObject,
    SelectedGraphicObject,
    type ObjectInfo,
    type LineNode,
    type XYPosition,
} from "..";
import { Circle, Graphics, GraphicsContext } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { useGraphicSchemeStore } from "../../stores";
import type { ITool } from "../../tools";

export class SelectedLinearGraphicObject extends SelectedGraphicObject {
    points: XYPosition[];
    objectScheme?: LinearGraphicObject | null;
    tool: ITool;
    nodes: LineNode[];
    shadowGraphicsLine: Graphics;

    constructor(info: ObjectInfo) {
        super({
            id: info.id,
            typeSelect: "linear-select",
            techObjectId: info.techObjectId,
            isActive: true,
        });
        const graphicObjectScheme = useGraphicSchemeStore();
        this.points = info.points ?? [];
        this.isActive = false;
        this.tool = graphicObjectScheme.tool;
        this.createGraphicsLine();
        this.shadowGraphicsLine = this.createGraphicsShadowLine();
        this.nodes = this.createNodes();
    }

    private createGraphicsLine() {
        this.graphics.interactive = true;
        this.graphics.onmousedown = async event => {
            event.stopPropagation();
            await this.tool.onMouseDownSelectedLinearObject(event, this);
        };
        this.graphics.onrightclick = event => {
            event.stopPropagation();
            this.tool.onContextMenuLinearObject(event, this.idObject);
        };

        this.graphics.zIndex = 3;
    }

    private createGraphicsShadowLine(): Graphics {
        const shadowGraphicsLine = new Graphics();
        shadowGraphicsLine.interactive = true;
        shadowGraphicsLine.onmousedown = async event => {
            event.stopPropagation();
            await this.tool.onMouseDownSelectedLinearObject(event, this);
        };
        shadowGraphicsLine.onrightclick = event => {
            event.stopPropagation();
            this.tool.onContextMenuLinearObject(event, this.idObject);
        };

        const graphicSchemeStore = useGraphicSchemeStore();
        shadowGraphicsLine.zIndex = 3;
        return shadowGraphicsLine;
    }

    private createNodes(): LineNode[] {
        return this.points.map<LineNode>((p, i) => {
            const graphics = new Graphics();
            const objectId = `${this.idObject}-${i}`;
            graphics.context = this.getNodeContext(adaptToGrid(p));
            graphics.interactive = true;
            graphics.eventMode = "static";
            graphics.hitArea = new Circle(p.x, p.y, 4);
            graphics.onmousedown = event => {
                event.stopPropagation();
                this.tool.onMouseDownSelectedLinearObject(event, this, objectId);
            };
            graphics.onrightclick = event => {
                event.stopPropagation();
                this.tool.onContextMenuNodeObject(event, this.idObject, i);
            };
            this.graphics.zIndex = 5;
            return { objectId, graphics };
        });
    }

    private getLineContext(points: XYPosition[]): GraphicsContext {
        const context = new GraphicsContext();
        const gap = 3;
        const dash = 3;
        for (let i = 1; i < points.length; i++) {
            context.moveTo(points[i - 1].x, points[i - 1].y);
            const length = Math.sqrt((points[i].x - points[i - 1].x) ** 2 + (points[i].y - points[i - 1].y) ** 2);
            const segmentCount = length / (gap + dash);

            const cos = (points[i].x - points[i - 1].x) / length;
            const sin = (points[i].y - points[i - 1].y) / length;

            const dashCos = dash * cos;
            const dashSin = dash * sin;

            const gapCos = gap * cos;
            const gapSin = gap * sin;

            for (let j = 1; j <= segmentCount; j++) {
                const movePointx = points[i - 1].x + j * (gapCos + dashCos);
                const movePointy = points[i - 1].y + j * (gapSin + dashSin);

                const linePointx = movePointx - gapCos;
                const linePointy = movePointy - gapSin;

                context.lineTo(linePointx, linePointy).moveTo(movePointx, movePointy);
            }
        }
        context.stroke({
            width: 1,
            color: "white",
            cap: "round",
        });

        return context;
    }

    private getShadowLineContext(points: XYPosition[]): GraphicsContext {
        const context = new GraphicsContext();
        if (this.points.length < 2) return context;
        const width = this.objectScheme?.thickness ? this.objectScheme.thickness + 5 : 10;
        // Перемещаемся к первой точке
        const firstPoint = this.points[0];
        context.moveTo(firstPoint.x, firstPoint.y);

        // Рисуем линии к остальным точкам
        for (let i = 1; i < this.points.length; i++) {
            const point = this.points[i];
            context.lineTo(point.x, point.y).stroke({
                width: width,
                color: "transparent",
                cap: "round",
            });
        }
        return context;
    }

    private getNodeContext(point: XYPosition): GraphicsContext {
        return new GraphicsContext().circle(point.x, point.y, 2).fill("transparent").stroke({
            width: 1,
            color: "white",
        });
    }

    move(points: XYPosition[], viewport: Viewport) {
        this.points = points;
        if (this.objectScheme) {
            this.objectScheme.refreshPath(this.points, viewport);
        }
    }

    cancel(initPoints: XYPosition[]) {
        this.points = initPoints;
    }

    override draw(): Graphics[] {
        this.graphics.context = this.getLineContext(this.points.map(p => adaptToGrid(p)));
        this.shadowGraphicsLine.context = this.getShadowLineContext(this.points.map(p => adaptToGrid(p)));
        this.nodes.forEach((n, i) => {
            const point = adaptToGrid(this.points[i]);
            n.graphics.context = this.getNodeContext(point);
            n.graphics.hitArea = new Circle(point.x, point.y, 2 + 1);
            n.graphics.zIndex = 5;
        });
        return [this.shadowGraphicsLine, this.graphics, ...this.nodes.map(n => n.graphics)];
    }

    override normalizeToGrid(): void {
        this.points = this.points.map(point => adaptToGrid(point));
    }

    setObjectScheme(object: LinearGraphicObject) {
        this.objectScheme = object;
    }

    delete(viewport: Viewport) {
        this.nodes.forEach(n => n.graphics.destroy());
        viewport.removeChild(this.shadowGraphicsLine, this.graphics, ...this.nodes.map(n => n.graphics));
        this.graphics.destroy();
        this.shadowGraphicsLine.destroy();
        this.nodes.forEach(n => {
            n.graphics.destroy();
        });
    }

    rotate(angle: number) {}

    async resetPath(points: XYPosition[], viewport: Viewport) {
        this.points = points;
        if (this.objectScheme) {
            this.objectScheme.points = points;
            this.objectScheme.resetPath(viewport, this.tool);
            this.nodes.forEach(n => n.graphics.destroy());
            this.nodes = this.createNodes();
            this.graphics.context = this.getLineContext(this.points.map(p => adaptToGrid(p)));
            this.shadowGraphicsLine.context = this.getShadowLineContext(this.points.map(p => adaptToGrid(p)));
            viewport.addChild(...this.nodes.map(n => n.graphics));
            viewport._onUpdate();
            viewport.update(2);
        }
    }
}
