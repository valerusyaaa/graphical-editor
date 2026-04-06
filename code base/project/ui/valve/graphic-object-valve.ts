import { BitmapText, Color, GraphicsContext, Matrix, Point, Polygon, Rectangle, type IHitArea } from "pixi.js";
import { directionIcon } from "../..";
import { type ObjectInfo, type XYPosition } from "@/shared/graphical-editor";
import { AnimationGraphicObject } from "../../model/animation-graphic-object";
import { drawDirectionObjectIcon } from "../shared/use-direction";

export class GraphicObjectValve extends AnimationGraphicObject {
    override async drawElement(context: GraphicsContext): Promise<void> {
        context.clear();
        // Белые круги
        context.circle(0, 10, 2).fill(0xffffff);
        context.circle(40, 10, 2).fill(0xffffff);

        // Основная фигура valve
        context
            .poly([
                38.062, 18.7995, 20, 10, 1.93797, 18.7995, 0.5, 17.9005, 0.5, 2.09954, 1.93797, 1.20055, 20, 10, 38.062,
                1.20055, 39.5, 2.09954, 39.5, 17.9005,
            ])
            .stroke({ width: 2, color: this.strokeColor })
            .fill(this.fillColor);

        // маленькая стрелка слева направо внизу объекта
        //directionIcon(graphics, 14, 20);
        drawDirectionObjectIcon(context, { x: 15, y: 20 }, this.arrowColor, 12, 1.2, 1);
    }

    override drawSelectedElement(position: XYPosition): GraphicsContext {
        const angle = (this.rotationAngle * Math.PI) / 180;
        const sclaeX = this.flipHorizontal ? -1 : 1;
        const scaleY = this.flipVertical ? -1 : 1;

        const points = [
            new Point(38.062, 18.7995),
            new Point(20, 10),
            new Point(1.93797, 18.7995),
            new Point(0.5, 17.9005),
            new Point(0.5, 2.09954),
            new Point(1.93797, 1.20055),
            new Point(20, 10),
            new Point(38.062, 1.20055),
            new Point(39.5, 2.09954),
            new Point(39.5, 17.9005),
        ];

        const matrix = new Matrix()
            .translate(-this.offsets.left, -this.offsets.top)
            .scale(sclaeX, scaleY)
            .rotate(angle)
            .translate(position.x + this.offsets.left, position.y + this.offsets.top);

        const transformedPoints = points
            .map(point => {
                const transformed = matrix.apply(point);
                return [transformed.x, transformed.y];
            })
            .flat();

        const graphicContext = new GraphicsContext();
        graphicContext
            .poly(transformedPoints)
            .fill({
                color: "transparent",
            })
            .stroke({ width: 2, color: "#ef4444" });

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
                x: 20,
                y: 40,
            },
        });
    }

    override getHitAreaPoints(): Point[] {
        return [new Point(0, 0), new Point(40, 0), new Point(40, 20), new Point(0, 20)];
    }

    override transformHitArea(position: XYPosition): IHitArea | undefined {
        // 1) углы и масштабы
        const angle = (this.rotationAngle * Math.PI) / 180;
        const sclaeX = this.flipHorizontal ? -1 : 1;
        const scaleY = this.flipVertical ? -1 : 1;

        const points = [new Point(0, 0), new Point(40, 0), new Point(40, 20), new Point(0, 20)];
        const matrix = new Matrix()
            .translate(-this.offsets.left, -this.offsets.top)
            .scale(sclaeX, scaleY)
            .rotate(angle)
            .translate(position.x + this.offsets.left, position.y + this.offsets.top);

        const transformedPoints = points
            .map(point => {
                const transformed = matrix.apply(point);
                return [transformed.x, transformed.y];
            })
            .flat();

        return new Polygon(transformedPoints);
    }
}
