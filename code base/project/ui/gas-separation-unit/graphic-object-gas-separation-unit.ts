import { BitmapText, GraphicsContext, Matrix, Point, Text, Polygon, type IHitArea } from "pixi.js";
import {  type XYPosition } from "@/shared/graphical-editor";
import { BaseGraphicObject } from "../../model/base-object-scheme";
import { drawDirectionObjectIcon } from "../shared/use-direction";

export class GraphicObjectGasSeparationUnit extends BaseGraphicObject {
    override async drawElement(context: GraphicsContext): Promise<void> {
        context.clear();
        // Белые круги
        context.circle(0, 80, 2).fill(0xffffff);
        context.circle(80, 80, 2).fill(0xffffff);

        // Основной прямоугольник
        context.rect(0, 40.25, 80, 79.5).stroke({ width: 2, color: this.strokeColor }).fill(this.fillColor);

        // Верхняя дуга
        context
            .moveTo(0, 40.25)
            .arc(40, 40.25, 40, Math.PI, 0)
            .lineTo(0, 40.25)
            .stroke({ width: 2, color: this.strokeColor })
            .fill(this.fillColor);

        // Нижняя дуга
        context
            .moveTo(0, 120.25)
            .arc(40, 120.25, 40, Math.PI, 0, true)
            .lineTo(0, 120.25)
            .stroke({ width: 2, color: this.strokeColor })
            .fill(this.fillColor);

        // иконка направления под объектом
        //directionIcon(graphics, 5, 160)
        drawDirectionObjectIcon(context, { x: 5, y: 160 }, this.arrowColor, 12, 1.2, 1);
    }

    override drawTextElement(): BitmapText {
        return new BitmapText({
            text: "GSU",
            style: {
                fontSize: 20,
                align: "center",
                fill: "white",
            },
            position: {
                x: 20,
                y: 70,
            },
        });
    }

    override drawLabelElement(): BitmapText | undefined {
        return new BitmapText({
            text: this.label,
            anchor: {
                x: 0.5,
                y: 0,
            },
            style: {
                fontSize: 10,
                align: "center",
                fill: "#868A91",
            },
            position: {
                x: 40,
                y: 165,
            },
        });
    }

    override drawSelectedElement(position: XYPosition): GraphicsContext {
        // 1) углы и масштабы
        const angle = (this.rotationAngle * Math.PI) / 180;
        const sclaeX = this.flipHorizontal ? -1 : 1;
        const scaleY = this.flipVertical ? -1 : 1;

        // 2) точки
        const rect = [new Point(0, 40.25), new Point(80, 40.25), new Point(80, 119.75), new Point(0, 119.75)];
        const topArc = [new Point(0, 40.25), new Point(40, 40.25)];
        const bottomArc = [new Point(0, 120.25), new Point(40, 120.25)];

        // 3) матрица
        const matrix = new Matrix()
            .translate(-this.offsets.left, -this.offsets.top)
            .scale(sclaeX, scaleY)
            .rotate(angle)
            .translate(position.x + this.offsets.left, position.y + this.offsets.top);

        // 4) трансформация точек
        const t = rect.map(p => matrix.apply(p)).flatMap(p => [p.x, p.y]);
        const tA = topArc.map(p => matrix.apply(p));
        const bA = bottomArc.map(p => matrix.apply(p));

        // 5) контекст
        const graphicContext = new GraphicsContext();
        graphicContext
            .moveTo(tA[0].x, tA[0].y)
            .arc(tA[1].x, tA[1].y, 40, Math.PI + angle, angle)
            .lineTo(tA[0].x, tA[0].y)
            .stroke({ width: 2, color: "#ef4444" })
            .fill("transparent");
        graphicContext
            .moveTo(bA[0].x, bA[0].y)
            .arc(bA[1].x, bA[1].y, 40, Math.PI + angle, angle, true)
            .lineTo(bA[0].x, bA[0].y)
            .stroke({ width: 2, color: "#ef4444" })
            .fill("transparent");
        graphicContext.poly(t).fill({ color: "transparent" }).stroke({ width: 2, color: "#ef4444" });
        return graphicContext;
    }

    override getHitAreaPoints(): Point[] {
        return [new Point(0, 40), new Point(80, 40), new Point(80, 160), new Point(0, 160)];
    }

    override transformHitArea(position: XYPosition): IHitArea | undefined {
        const angle = (this.rotationAngle * Math.PI) / 180;
        const sclaeX = this.flipHorizontal ? -1 : 1;
        const scaleY = this.flipVertical ? -1 : 1;
        const points = [new Point(0, 40), new Point(80, 40), new Point(80, 160), new Point(0, 160)];
        const matrix = new Matrix()
            .translate(-this.offsets.left, -this.offsets.top)
            .scale(sclaeX, scaleY)
            .rotate(angle)
            .translate(position.x + this.offsets.left, position.y + this.offsets.top);
        const transformed = points.map(p => matrix.apply(p)).flatMap(p => [p.x, p.y]);
        return new Polygon(transformed);
    }
}
