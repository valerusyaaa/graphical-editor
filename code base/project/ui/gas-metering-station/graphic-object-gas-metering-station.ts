import { BitmapText, GraphicsContext, Matrix, Point, Text, Polygon, type IHitArea } from "pixi.js";
import {type XYPosition } from "@/shared/graphical-editor";
import { BaseGraphicObject } from "../../model/base-object-scheme";
import { drawDirectionObjectIcon } from "../shared/use-direction";

export class GraphicObjectGasMeteringStation extends BaseGraphicObject {
    override async drawElement(context: GraphicsContext): Promise<void> {
        context.clear();

        // Основной прямоугольник
        context.rect(0, 0, 80, 40).stroke({ width: 2, color: this.strokeColor }).fill(this.fillColor);
    }

    override drawTextElement(): BitmapText {
        return new BitmapText({
            text: "GMS",
            style: {
                fontSize: 14,
                align: "center",
                fill: "white",
            },
            position: {
                x: 24,
                y: 12,
            },
        });
    }

    override drawSelectedElement(position: XYPosition): GraphicsContext {
        // 1) углы и масштабы
        const angle = (this.rotationAngle * Math.PI) / 180;
        const sclaeX = this.flipHorizontal ? -1 : 1;
        const scaleY = this.flipVertical ? -1 : 1;

        // 2) точки
        const rect = [new Point(0, 0), new Point(80, 0), new Point(80, 40), new Point(0, 40)];

        // 3) матрица
        const matrix = new Matrix()
            .translate(-this.offsets.left, -this.offsets.top)
            .scale(sclaeX, scaleY)
            .rotate(angle)
            .translate(position.x + this.offsets.left, position.y + this.offsets.top);

        // 4) трансформация точек
        const t = rect.map(p => matrix.apply(p)).flatMap(p => [p.x, p.y]);

        // 5) контекст
        const graphicContext = new GraphicsContext();
        graphicContext.poly(t).fill({ color: "transparent" }).stroke({ width: 2, color: "#ef4444" });
        return graphicContext;
    }

    override drawLabelElement(): BitmapText | undefined {
        return new BitmapText({
            text: this.label,
            anchor: {
                x: 0.5,
                y: 1,
            },
            style: {
                fontSize: 10,
                align: "center",
                fill: "#868A91",
            },
            position: {
                x: 40,
                y: 55,
            },
        });
    }

    override getHitAreaPoints(): Point[] {
        return [new Point(0, 0), new Point(80, 0), new Point(80, 40), new Point(0, 40)];
    }

    override transformHitArea(position: XYPosition): IHitArea | undefined {
        const angle = (this.rotationAngle * Math.PI) / 180;
        const sclaeX = this.flipHorizontal ? -1 : 1;
        const scaleY = this.flipVertical ? -1 : 1;
        const points = [new Point(0, 0), new Point(80, 0), new Point(80, 40), new Point(0, 40)];
        const matrix = new Matrix()
            .translate(-this.offsets.left, -this.offsets.top)
            .scale(sclaeX, scaleY)
            .rotate(angle)
            .translate(position.x + this.offsets.left, position.y + this.offsets.top);
        const transformed = points.map(p => matrix.apply(p)).flatMap(p => [p.x, p.y]);
        return new Polygon(transformed);
    }
}
