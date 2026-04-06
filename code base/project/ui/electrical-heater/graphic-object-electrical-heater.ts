import { BitmapText, GraphicsContext, Matrix, Point, Polygon, type IHitArea } from "pixi.js";
import { type XYPosition } from "@/shared/graphical-editor";
import { BaseGraphicObject } from "../../model/base-object-scheme";
import { drawDirectionObjectIcon } from "../shared/use-direction";

export class GraphicObjectElectricalHeater extends BaseGraphicObject {
    override async drawElement(context: GraphicsContext):  Promise<void> {
        context.clear();
        // Белые круги
        context.circle(0, 10, 2).fill(0xffffff);
        context.circle(40, 10, 2).fill(0xffffff);

        // Основной прямоугольник
        context.rect(0.5, 0.5, 39, 19).stroke({ width: 2, color: this.strokeColor }).fill(this.fillColor);

        // Вертикальные линии внутри
        context.rect(10.5, 0.5, 1, 19).fill(this.strokeColor);

        context.rect(20.5, 0.5, 1, 19).fill(this.strokeColor);

        context.rect(30.5, 0.5, 1, 19).fill(this.strokeColor);

        // иконка направления под объектом
        //directionIcon(graphics, 14, 25)
        drawDirectionObjectIcon(context, { x: 16, y: 25 }, this.arrowColor, 12, 1.2, 1);
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
                y: 25,
            },
        });
    }

    override drawSelectedElement(position: XYPosition): GraphicsContext {
        // 1) углы и масштабы
        const angle = (this.rotationAngle * Math.PI) / 180;
        const sclaeX = this.flipHorizontal ? -1 : 1;
        const scaleY = this.flipVertical ? -1 : 1;

        // 2) точки
        const rect = [new Point(0.5, 0.5), new Point(39.5, 0.5), new Point(39.5, 19.5), new Point(0.5, 19.5)];

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

    override getHitAreaPoints(): Point[] {
        return [new Point(0, 0), new Point(40, 0), new Point(40, 20), new Point(0, 20)];
    }

    override transformHitArea(position: XYPosition): IHitArea | undefined {
        const angle = (this.rotationAngle * Math.PI) / 180;
        const sclaeX = this.flipHorizontal ? -1 : 1;
        const scaleY = this.flipVertical ? -1 : 1;
        const points = [new Point(0, 0), new Point(40, 0), new Point(40, 20), new Point(0, 20)];
        const matrix = new Matrix()
            .translate(-this.offsets.left, -this.offsets.top)
            .scale(sclaeX, scaleY)
            .rotate(angle)
            .translate(position.x + this.offsets.left, position.y + this.offsets.top);
        const transformed = points.map(p => matrix.apply(p)).flatMap(p => [p.x, p.y]);
        return new Polygon(transformed);
    }
}
