import { BitmapText, GraphicsContext, Matrix, Point, Polygon, type IHitArea } from "pixi.js";
import { type XYPosition } from "@/shared/graphical-editor";
import { BaseGraphicObject } from "../../model/base-object-scheme";

export class GraphicObjectProducer extends BaseGraphicObject {
    override async drawElement(context: GraphicsContext): Promise<void> {
        context.clear();

        // Белый круг справа
        context.circle(40, 20, 2).fill(0xffffff);

        // Основной квадрат
        context.rect(0.5, 0.5, 39, 39).fill(this.fillColor).stroke({ width: 1, color: this.strokeColor });

        // Стрелка внутри
        context
            .poly([25, 25, 25, 24, 1, 24, 1, 15, 25, 15, 25, 10, 38, 20, 25, 29], true)
            .stroke({ width: 2, color: this.strokeColor })
            .fill(this.fillColor);
    }

    override drawSelectedElement(position: XYPosition): GraphicsContext {
        // 1) углы и масштабы
        const angle = (this.rotationAngle * Math.PI) / 180;
        const sclaeX = this.flipHorizontal ? -1 : 1;
        const scaleY = this.flipVertical ? -1 : 1;

        // 2) точки
        const rect = [new Point(0.5, 0.5), new Point(39.5, 0.5), new Point(39.5, 39.5), new Point(0.5, 39.5)];

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
            anchor: { x: 1, y: 0.5 },
            style: {
                fontSize: 14,
                align: "right",
                fill: "#868A91",
            },
            position: {
                x: -10,
                y: 20,
            },
        });
    }

    override getHitAreaPoints(): Point[] {
        return [new Point(0, 0), new Point(40, 0), new Point(40, 40), new Point(0, 40)];
    }

    override transformHitArea(position: XYPosition): IHitArea | undefined {
        const angle = (this.rotationAngle * Math.PI) / 180;
        const sclaeX = this.flipHorizontal ? -1 : 1;
        const scaleY = this.flipVertical ? -1 : 1;
        const points = [new Point(0, 0), new Point(40, 0), new Point(40, 40), new Point(0, 40)];
        const matrix = new Matrix()
            .translate(-this.offsets.left, -this.offsets.top)
            .scale(sclaeX, scaleY)
            .rotate(angle)
            .translate(position.x + this.offsets.left, position.y + this.offsets.top);
        const transformed = points.map(p => matrix.apply(p)).flatMap(p => [p.x, p.y]);
        return new Polygon(transformed);
    }
}
