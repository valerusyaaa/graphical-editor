import { BitmapText, GraphicsContext, Matrix, Point, Polygon, type IHitArea } from "pixi.js";
import { type XYPosition } from "@/shared/graphical-editor";
import { AnimationGraphicObject } from "../../model/animation-graphic-object";
import { drawDirectionObjectIcon } from "../shared/use-direction";

export class GraphicObjectSmallValve extends AnimationGraphicObject {
    override async drawElement(context: GraphicsContext): Promise<void> {
        context.clear();

        // Белые круги
        context.circle(0, 10, 2).fill(0xffffff);
        context.circle(20, 10, 2).fill(0xffffff);

        // Основная фигура клапана (ромб)
        context
            .poly([
                10, 10, 1.9658, 14.2286, 0.5, 13.3436, 0.5, 6.6564, 1.9658, 5.7714, 10, 10, 18.0343, 5.7714, 19.5,
                6.6564, 19.5, 13.3436, 18.0343, 14.2286,
            ])
            .stroke({ width: 2, color: this.strokeColor })
            .fill(this.fillColor);
        // иконка направления под объектом
        //directionIcon(graphics, 5, 18)
        drawDirectionObjectIcon(context, { x: 6, y: 17 }, this.arrowColor, 9, 1.1, 0.8);
    }

    override drawSelectedElement(position: XYPosition): GraphicsContext {
        // 1) углы и масштабы
        const angle = (this.rotationAngle * Math.PI) / 180;
        const sclaeX = this.flipHorizontal ? -1 : 1;
        const scaleY = this.flipVertical ? -1 : 1;

        // 2) точки
        const points = [
            new Point(10, 10),
            new Point(1.9658, 14.2286),
            new Point(0.5, 13.3436),
            new Point(0.5, 6.6564),
            new Point(1.9658, 5.7714),
            new Point(10, 10),
            new Point(18.0343, 5.7714),
            new Point(19.5, 6.6564),
            new Point(19.5, 13.3436),
            new Point(18.0343, 14.2286),
        ];

        // 3) матрица
        const matrix = new Matrix()
            .translate(-this.offsets.left, -this.offsets.top)
            .scale(sclaeX, scaleY)
            .rotate(angle)
            .translate(position.x + this.offsets.left, position.y + this.offsets.top);

        // 4) трансформация точек
        const transformedPoints = points
            .map(p => {
                const t = matrix.apply(p);
                return [t.x, t.y];
            })
            .flat();

        // 5) контекст
        const graphicContext = new GraphicsContext();
        graphicContext.poly(transformedPoints).fill({ color: "transparent" }).stroke({ width: 2, color: "#ef4444" });
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
                x: 10,
                y: 20,
            },
        });
    }

    override getHitAreaPoints(): Point[] {
        return [new Point(0, 0), new Point(20, 0), new Point(20, 15), new Point(0, 15)];
    }

    override transformHitArea(position: XYPosition): IHitArea | undefined {
        const angle = (this.rotationAngle * Math.PI) / 180;
        const sclaeX = this.flipHorizontal ? -1 : 1;
        const scaleY = this.flipVertical ? -1 : 1;
        const points = [new Point(0, 0), new Point(20, 0), new Point(20, 12), new Point(0, 12)];
        const matrix = new Matrix()
            .translate(-this.offsets.left, -this.offsets.top)
            .scale(sclaeX, scaleY)
            .rotate(angle)
            .translate(position.x + this.offsets.left, position.y + this.offsets.top);
        const transformed = points.map(p => matrix.apply(p)).flatMap(p => [p.x, p.y]);
        return new Polygon(transformed);
    }
}
