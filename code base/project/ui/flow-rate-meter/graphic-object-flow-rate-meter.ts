import { BitmapText, GraphicsContext, Matrix, Point, Polygon, type IHitArea } from "pixi.js";
import { type XYPosition } from "@/shared/graphical-editor";
import { drawDirectionObjectIcon } from "../shared/use-direction";
import { BaseGraphicObject } from "../../model/base-object-scheme";

export class GraphicObjectFlowRateMeter extends BaseGraphicObject {
    override async drawElement(context: GraphicsContext): Promise<void> {
        context.clear();

        // Белые круги
        context.circle(0, 50, 2).fill(0xffffff);
        context.circle(40, 50, 2).fill(0xffffff);

        // Основной прямоугольник
        context.rect(5.375, 10.5, 29.25, 9.77778).stroke({ width: 2, color: this.strokeColor }).fill(this.fillColor);

        // Левый прямоугольник
        context.rect(0.5, 12.45556, 3.875, 4.88889).stroke({ width: 2, color: this.strokeColor }).fill(this.fillColor);

        // Правый прямоугольник
        context
            .rect(35.625, 12.45556, 3.875, 4.88889)
            .stroke({ width: 2, color: this.strokeColor })
            .fill(this.fillColor);

        // Центральный прямоугольник
        context
            .rect(13.175, 21.2778, 14.625, 19.5556)
            .stroke({ width: 2, color: this.strokeColor })
            .fill(this.fillColor);

        // Нижний прямоугольник
        context
            .rect(5.8625, 39.8333, 29.25, 4.88889)
            .stroke({ width: 2, color: this.strokeColor })
            .fill(this.fillColor);

        // Основание
        context.rect(0.5, 44.7222, 39, 9.77778).stroke({ width: 2, color: this.strokeColor }).fill(this.fillColor);
        //directionIcon(graphics, 14, 60)
        drawDirectionObjectIcon(context, { x: 16, y: 60 }, this.arrowColor, 12, 1.2, 1);
    }

    override drawSelectedElement(position: XYPosition): GraphicsContext {
        // 1) углы и масштабы
        const angle = (this.rotationAngle * Math.PI) / 180;
        const sclaeX = this.flipHorizontal ? -1 : 1;
        const scaleY = this.flipVertical ? -1 : 1;

        // 2) точки
        const rects = [
            [new Point(5.375, 10.5), new Point(34.625, 10.5), new Point(34.625, 20.27778), new Point(5.375, 20.27778)],
            [
                new Point(0.5, 12.45556),
                new Point(5.375, 12.45556),
                new Point(5.375, 17.34445),
                new Point(0.5, 17.34445),
            ],
            [
                new Point(34.625, 12.45556),
                new Point(39.5, 12.45556),
                new Point(39.5, 17.34445),
                new Point(34.625, 17.34445),
            ],
            [
                new Point(13.175, 20.2778),
                new Point(27.8, 20.2778),
                new Point(27.8, 39.8334),
                new Point(13.175, 39.8334),
            ],
            [
                new Point(5.8625, 39.8333),
                new Point(35.1125, 39.8333),
                new Point(35.1125, 44.72219),
                new Point(5.8625, 44.72219),
            ],
            [new Point(0.5, 44.7222), new Point(39.5, 44.7222), new Point(39.5, 54.5), new Point(0.5, 54.5)],
        ];

        // 3) матрица
        const matrix = new Matrix()
            .translate(-this.offsets.left, -this.offsets.top)
            .scale(sclaeX, scaleY)
            .rotate(angle)
            .translate(position.x + this.offsets.left, position.y + this.offsets.top);

        // 4) трансформация точек и 5) контекст
        const graphicContext = new GraphicsContext();
        for (const rect of rects) {
            const t = rect.map(p => matrix.apply(p)).flatMap(p => [p.x, p.y]);
            graphicContext.poly(t).fill({ color: "transparent" }).stroke({ width: 1, color: "#ef4444" });
        }
        return graphicContext;
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
                x: 20,
                y: 60,
            },
        });
    }

    override getHitAreaPoints(): Point[] {
        return [new Point(0, 0), new Point(40, 0), new Point(40, 60), new Point(0, 60)];
    }

    override transformHitArea(position: XYPosition): IHitArea | undefined {
        const angle = (this.rotationAngle * Math.PI) / 180;
        const sclaeX = this.flipHorizontal ? -1 : 1;
        const scaleY = this.flipVertical ? -1 : 1;
        const points = [new Point(0, 0), new Point(40, 0), new Point(40, 60), new Point(0, 60)];
        const matrix = new Matrix()
            .translate(-this.offsets.left, -this.offsets.top)
            .scale(sclaeX, scaleY)
            .rotate(angle)
            .translate(position.x + this.offsets.left, position.y + this.offsets.top);
        const transformed = points.map(p => matrix.apply(p)).flatMap(p => [p.x, p.y]);
        return new Polygon(transformed);
    }
}
