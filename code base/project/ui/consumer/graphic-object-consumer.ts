import type { ViewportTransform, XYPosition } from "@vue-flow/core";
import { BitmapText, Graphics, GraphicsContext, Matrix, Point, Polygon, type IHitArea } from "pixi.js";
import { BaseGraphicObject } from "../../model/base-object-scheme";
import { directionIcon } from "../../lib";

export class GraphicObjectConsumer extends BaseGraphicObject {
    override async drawElement(context: GraphicsContext):  Promise<void> {
        // Белый круг слева
        context.circle(0, 20, 2).fill(0xffffff);

        // Треугольник (стрелка)
        context.poly([0.5, 0.5, 30, 20, 0.5, 39.5]).fill(this.fillColor).stroke({ width: 2, color: this.strokeColor });
    
    }

    override drawSelectedElement(position: XYPosition): GraphicsContext {
        // 1) углы и масштабы
        const angle = (this.rotationAngle * Math.PI) / 180;
        const sclaeX = this.flipHorizontal ? -1 : 1;
        const scaleY = this.flipVertical ? -1 : 1;

        // 2) точки
        const tri = [new Point(0.5, 0.5), new Point(30, 20), new Point(0.5, 39.5)];

        // 3) матрица
        const matrix = new Matrix()
            .translate(-this.offsets.left, -this.offsets.top)
            .scale(sclaeX, scaleY)
            .rotate(angle)
            .translate(position.x + this.offsets.left, position.y + this.offsets.top);

        // 4) трансформация точек
        const t = tri.map(p => matrix.apply(p)).flatMap(p => [p.x, p.y]);

        // 5) контекст
        const graphicContext = new GraphicsContext();
        graphicContext.poly(t).fill({ color: "transparent" }).stroke({ width: 2, color: "#ef4444" });
        return graphicContext;
    }

    override drawLabelElement(): BitmapText |  undefined {
        return new BitmapText({
            text: this.label,
            anchor: {
                x: 0,
                y: 0.5
            },
            style: {
                fontSize: 14,
                align: "left",
                fill: "#868A91",
            },
            position: {
                x: 40,
                y: 20,
            },
        });
    }

    override getHitAreaPoints(): Point[] {
        return [new Point(0, 0), new Point(30, 0), new Point(30, 40), new Point(0, 40)];
    }

    override transformHitArea(position: XYPosition): IHitArea | undefined {
        const angle = (this.rotationAngle * Math.PI) / 180;
        const sclaeX = this.flipHorizontal ? -1 : 1;
        const scaleY = this.flipVertical ? -1 : 1;
        const points = [new Point(0, 0), new Point(30, 0), new Point(30, 40), new Point(0, 40)];
        const matrix = new Matrix()
            .translate(-this.offsets.left, -this.offsets.top)
            .scale(sclaeX, scaleY)
            .rotate(angle)
            .translate(position.x + this.offsets.left, position.y + this.offsets.top);
        const transformed = points.map(p => matrix.apply(p)).flatMap(p => [p.x, p.y]);
        return new Polygon(transformed);
    }
}
