import { BitmapText, GraphicsContext, Matrix, Point, Polygon, type IHitArea } from "pixi.js";
import { type XYPosition } from "@/shared/graphical-editor";
import { AnimationGraphicObject } from "../../model/animation-graphic-object";
import { drawDirectionObjectIcon } from "../shared/use-direction";

export class GraphicObjectWaterbathHeater extends AnimationGraphicObject {
    override async drawElement(context: GraphicsContext): Promise<void> {
        context.clear();

        // Белые круги
        context.circle(0, 20, 2).fill(0xffffff);
        context.circle(80, 20, 2).fill(0xffffff);

        // Основной прямоугольник с закругленными углами
        context.rect(0.5, 0.5, 79, 39).stroke({ width: 2, color: this.strokeColor }).fill(this.fillColor);

        // Круг внутри
        context.circle(17, 20, 7).stroke({ color: this.strokeColor, width: 2 }).fill(this.fillColor);

        //directionIcon(graphics, 34, 45)
        drawDirectionObjectIcon(context, { x: 36, y: 45 }, this.arrowColor, 12, 1.2, 1);
    }

    override drawTextElement(): BitmapText {
        return new BitmapText({
            text: "WBH",
            style: {
                fontSize: 14,
                align: "center",
                fill: "#DFE1E5",
            },
            position: {
                x: 34,
                y: 12,
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
                y: 45,
            },
        });
    }

    override drawSelectedElement(position: XYPosition): GraphicsContext {
        // 1) углы и масштабы
        const angle = (this.rotationAngle * Math.PI) / 180;
        const sclaeX = this.flipHorizontal ? -1 : 1;
        const scaleY = this.flipVertical ? -1 : 1;

        // 2) точки
        const rectPoints = [new Point(0.5, 0.5), new Point(79.5, 0.5), new Point(79.5, 39.5), new Point(0.5, 39.5)];

        // 3) матрица
        const matrix = new Matrix()
            .translate(-this.offsets.left, -this.offsets.top)
            .scale(sclaeX, scaleY)
            .rotate(angle)
            .translate(position.x + this.offsets.left, position.y + this.offsets.top);

        // 4) трансформация точек
        const transformed = rectPoints.map(p => matrix.apply(p)).flatMap(p => [p.x, p.y]);

        // 5) контекст
        const graphicContext = new GraphicsContext();
        graphicContext.poly(transformed).fill({ color: "transparent" }).stroke({ width: 2, color: "#ef4444" });
        return graphicContext;
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
