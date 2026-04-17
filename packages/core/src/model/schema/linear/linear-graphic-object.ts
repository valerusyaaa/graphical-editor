import { type ObjectInfo, convertToStyle, GraphicObjectScheme, adaptToGrid, type LineNode, type XYPosition } from "..";
import { Circle, Graphics, GraphicsContext } from "pixi.js";
import type { Viewport } from "pixi-viewport";
import { useGraphicSchemeStore } from "../../stores";
import type { IGraphicalEditorTooltip } from "../../../composables";
import type { ITool } from "../../tools";

export class LinearGraphicObject extends GraphicObjectScheme {
    points: XYPosition[];
    thickness: number;
    radiusNode: number;
    backgroundColor: string;
    classProps?: string;

    constructor(info: ObjectInfo) {
        super(info);
        this.points =
            info.points && info.points.length > 0
                ? info.points
                : [
                      { x: 0, y: 0 },
                      { x: 100, y: 0 },
                  ];
        this.thickness = info.thikness ?? 1;
        this.radiusNode = 2;
        if (this.graphType) this.classProps = convertToStyle(this.graphType);
        this.backgroundColor = useGraphicSchemeStore().backroundColor;
    }

    redraw(viewport: Viewport) {
        const graphics = viewport.getChildByLabel(`${this.idObject}`) as Graphics | undefined;
        if (graphics) {
            this.drawElement();
        }
    }
    refreshPath(points: XYPosition[], viewport: Viewport, tooltip?: IGraphicalEditorTooltip) {
        this.points = points.map(p => adaptToGrid(p));
        const line = viewport.getChildByLabel(this.idObject.toString()) as Graphics;
        const shadowLine = viewport.getChildByLabel(`${this.idObject}-shadow`) as Graphics;
        if (line && shadowLine) {
            line.context.destroy();
            shadowLine.context.destroy();
            line.context = this.drawElement();
            shadowLine.context = this.drawShadowElement();
        }

        this.points.forEach((p, i) => {
            const node = viewport.getChildByLabel(`${this.idObject}-${i}`) as Graphics;
            node.context = new GraphicsContext().circle(p.x, p.y, this.radiusNode).fill("transparent").stroke({
                width: 1,
                color: "transparent",
            });
            node.hitArea = new Circle(p.x, p.y, this.radiusNode + 2);
            node.onpointerenter = event => {
                event.stopPropagation();
                node.context = new GraphicsContext().circle(p.x, p.y, this.radiusNode).fill("transparent").stroke({
                    width: 1,
                    color: "white",
                });
                tooltip?.showTooltip(event.pageX, event.pageY, this);
            };
            node.onpointerleave = event => {
                event.stopPropagation();
                node.context = new GraphicsContext().fill("transparent").circle(p.x, p.y, this.radiusNode).stroke({
                    width: 1,
                    color: "transparent",
                });
                tooltip?.hideTooltip();
            };
        });
    }

    setThicknessAndDraw(thickness: number | undefined, viewport: Viewport) {
        if (thickness) {
            this.thickness = thickness;
            const line = viewport.getChildByLabel(this.idObject.toString()) as Graphics;
            const shadowLine = viewport.getChildByLabel(`${this.idObject}-shadow`) as Graphics;
            if (line) {
                this.drawElement();
                shadowLine.context = this.drawShadowElement();
            }
        }
    }

    setThickness(thickness: number | undefined) {
        if (thickness) {
            this.thickness = thickness;
        }
    }

    setStrokeColor(classStyle: string) {
        this.classProps = classStyle;
    }

    draw(viewport: Viewport, tool: ITool, tooltip?: IGraphicalEditorTooltip) {
        const graphics = new Graphics();
        graphics.label = this.idObject.toString();
        graphics.interactive = true;
        graphics.onmousedown = async event => {
            await tool.onMouseDownLinearObject(event, this);
        };
        graphics.onmouseup = event => {
            viewport.plugins.resume("drag");
        };
        graphics.onmouseupoutside = event => {
            viewport.plugins.resume("drag");
        };
        graphics.onrightclick = async event => {
            event.stopPropagation();
            await tool.onMouseDownLinearObject(event, this);
            await nextTick();
            await tool.onContextMenuLinearObject(event, this.idObject);
        };
        graphics.onmouseenter = event => {
            event.stopPropagation();
            tooltip?.showTooltip(event.pageX, event.pageY, this);
        };

        graphics.onmouseleave = event => {
            event.stopPropagation();
            tooltip?.hideTooltip();
        };
        graphics.context = this.drawElement();

        const shadowGraphics = new Graphics();
        shadowGraphics.interactive = true;
        shadowGraphics.onmousedown = async event => {
            await tool.onMouseDownLinearObject(event, this);
        };
        shadowGraphics.onmouseup = event => {
            viewport.plugins.resume("drag");
        };
        shadowGraphics.onmouseupoutside = event => {
            viewport.plugins.resume("drag");
        };
        shadowGraphics.onrightclick = async event => {
            event.stopPropagation();
            await tool.onMouseDownLinearObject(event, this);
            await nextTick();
            await tool.onContextMenuLinearObject(event, this.idObject);
        };

        shadowGraphics.onmouseenter = event => {
            event.stopPropagation();
            tooltip?.showTooltip(event.pageX, event.pageY, this);
        };

        shadowGraphics.onmouseleave = event => {
            event.stopPropagation();
            tooltip?.hideTooltip();
        };

        shadowGraphics.context = this.drawShadowElement();
        shadowGraphics.label = `${this.idObject}-shadow`;
        viewport.addChild(shadowGraphics, graphics, ...this.drawNodes(tool, tooltip));
    }
    drawElement(): GraphicsContext {
        return new GraphicsContext();
    }
    drawNodes(tool: ITool, tooltip?: IGraphicalEditorTooltip): Graphics[] {
        const nodes: Graphics[] = [];
        this.points.forEach((p, i) => {
            const graphics = new Graphics();
            graphics.label = `${this.idObject}-${i}`;
            graphics.context = new GraphicsContext().circle(p.x, p.y, this.radiusNode).fill("transparent").stroke({
                width: 1,
                color: "transparent",
            });
            graphics.interactive = true;
            graphics.eventMode = "static";
            graphics.hitArea = new Circle(p.x, p.y, this.radiusNode + 2);
            graphics.zIndex = 4;
            graphics.onpointerenter = event => {
                event.stopPropagation();
                graphics.context = new GraphicsContext().circle(p.x, p.y, this.radiusNode).fill("transparent").stroke({
                    width: 1,
                    color: "white",
                });
                tooltip?.showTooltip(event.pageX, event.pageY, this);
            };
            graphics.onpointerleave = event => {
                event.stopPropagation();
                graphics.context = new GraphicsContext().fill("transparent").circle(p.x, p.y, this.radiusNode).stroke({
                    width: 1,
                    color: "transparent",
                });
                tooltip?.hideTooltip();
            };
            graphics.onmousedown = async event => {
                await tool.onMouseDownLinearObject(event, this, graphics.label);
            };
            graphics.onrightclick = async event => {
                event.stopPropagation();
                await tool.onMouseDownLinearObject(event, this);
                await tool.onContextMenuNodeObject(event, this.idObject, i);
            };
            nodes.push(graphics);
        });
        return nodes;
    }

    resetPath(viewport: Viewport, tool: ITool, tooltip?: IGraphicalEditorTooltip) {
        this.delete(viewport);
        this.draw(viewport, tool);
    }

    delete(viewport: Viewport) {
        const line = viewport.getChildByLabel(this.idObject.toString());
        const shadowLine = viewport.getChildByLabel(`${this.idObject}-shadow`) as Graphics;
        const nodes = this.points
            .map((_, i) => viewport.getChildByLabel(`${this.idObject}-${i}`))
            .filter(n => n != undefined);
        if (line) {
            viewport.removeChild(line, shadowLine, ...nodes);
            line.destroy();
            shadowLine.destroy();
            nodes.forEach(n => {
                n.destroy();
            });
        }
    }

    drawShadowElement(): GraphicsContext {
        const graphics = new GraphicsContext();
        if (this.points.length < 2) return graphics;
        // Начинаем рисовать линию
        const offset: number = this.thickness / 2 + 2;
        const pts = [...this.points]; // копия массива

        {
            const p0 = pts[0];
            const p1 = pts[1];
            const dx = p1.x - p0.x;
            const dy = p1.y - p0.y;
            const len = Math.hypot(dx, dy);
            if (len > 0) {
                pts[0] = {
                    x: p0.x + (dx / len) * offset,
                    y: p0.y + (dy / len) * offset,
                };
            }
        }

        {
            const pn = pts.length - 1;
            const pLast = pts[pn];
            const pPrev = pts[pn - 1];
            const dx = pPrev.x - pLast.x;
            const dy = pPrev.y - pLast.y;
            const len = Math.hypot(dx, dy);
            if (len > 0) {
                pts[pn] = {
                    x: pLast.x + (dx / len) * offset,
                    y: pLast.y + (dy / len) * offset,
                };
            }
        }

        // Перемещаемся к первой точке
        const firstPoint = pts[0];
        graphics.moveTo(firstPoint.x, firstPoint.y);

        // Рисуем линии к остальным точкам
        for (let i = 1; i < pts.length; i++) {
            const point = pts[i];
            graphics.lineTo(point.x, point.y).stroke({
                width: this.thickness + 4,
                color: this.backgroundColor,
            });
        }
        return graphics;
    }

    refreshLabel(label: string) {}
}
