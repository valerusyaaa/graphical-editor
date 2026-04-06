import { BitmapText, GraphicsContext, Matrix, Point, Text, Polygon, type IHitArea } from "pixi.js";
import { type ObjectInfo, type XYPosition } from "@/shared/graphical-editor";
import { fillColors } from "../../lib";
import { AnimationGraphicObject } from "../../model/animation-graphic-object";

export class GraphicObjectBlowdownValve extends AnimationGraphicObject {
    override async drawElement(context: GraphicsContext):  Promise<void> {
        context.clear();
        // Белый круг внизу
        context.circle(10, 40, 2).fill(0xffffff);

        // Стрелка вверх
        context.poly([10, 0, 13.11325, 5, 6.88675, 5]).fill(fillColors.danger);

        // Вертикальная линия
        context.rect(9.5, 4.5, 1, 15.5).fill(fillColors.danger);

        // Основная фигура клапана (ромб)
        context
            .poly([
                10, 30, 5.771446, 21.9657, 6.65636, 20.5, 13.34364, 20.5, 14.22855, 21.9657, 10, 30, 14.22855, 38.0343,
                13.34364, 39.5, 6.65636, 39.5, 5.771446, 38.0343,
            ])
            .stroke({ width: 2, color: this.strokeColor })
            .fill(this.fillColor);
        // иконка направления под объектом
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
                x: 10,
                y: -5,
            },
        });
    }

    override drawSelectedElement(position: XYPosition): GraphicsContext {
        // 1) углы и масштабы
        const angle = (this.rotationAngle * Math.PI) / 180;
        const sclaeX = this.flipHorizontal ? -1 : 1;
        const scaleY = this.flipVertical ? -1 : 1;

        // 2) точки
        const poly = [
            new Point(10, 30),
            new Point(5.771446, 21.9657),
            new Point(6.65636, 20.5),
            new Point(13.34364, 20.5),
            new Point(14.22855, 21.9657),
            new Point(10, 30),
            new Point(14.22855, 38.0343),
            new Point(13.34364, 39.5),
            new Point(6.65636, 39.5),
            new Point(5.771446, 38.0343),
        ];

        // 3) матрица
        const matrix = new Matrix()
            .translate(-this.offsets.left, -this.offsets.top)
            .scale(sclaeX, scaleY)
            .rotate(angle)
            .translate(position.x + this.offsets.left, position.y + this.offsets.top);

        // 4) трансформация точек
        const tPoly = poly.map(p => matrix.apply(p)).flatMap(p => [p.x, p.y]);

        // 5) контекст
        const graphicContext = new GraphicsContext();
        graphicContext.poly(tPoly).fill({ color: "transparent" }).stroke({ width: 2, color: "#ef4444" });
        return graphicContext;
    }

    override getHitAreaPoints(): Point[] {
        return [new Point(0, 0), new Point(20, 0), new Point(20, 40), new Point(0, 40)];
    }

    override transformHitArea(position: XYPosition): IHitArea | undefined {
        const angle = (this.rotationAngle * Math.PI) / 180;
        const sclaeX = this.flipHorizontal ? -1 : 1;
        const scaleY = this.flipVertical ? -1 : 1;
        const points = [new Point(0, 0), new Point(20, 0), new Point(20, 40), new Point(0, 40)];
        const matrix = new Matrix()
            .translate(-this.offsets.left, -this.offsets.top)
            .scale(sclaeX, scaleY)
            .rotate(angle)
            .translate(position.x + this.offsets.left, position.y + this.offsets.top);
        const transformed = points.map(p => matrix.apply(p)).flatMap(p => [p.x, p.y]);
        return new Polygon(transformed);
    }
}
