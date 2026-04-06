import { GraphicsContext, Matrix, Point, Polygon, type IHitArea } from "pixi.js";
import { type XYPosition } from "@/shared/graphical-editor";
import { BaseGraphicObject } from "../../model/base-object-scheme";

export class GraphicObjectReceiverPigTrap extends BaseGraphicObject {
    override async drawElement(context: GraphicsContext): Promise<void> {
       context.clear();
        
        // Белые круги
        context.circle(20, 0, 2).fill(0xffffff);
        context.circle(160, 10, 2).fill(0xffffff);
        
        // Основная фигура (полукруг с прямоугольником) - перевернутая версия
        context
            .poly([
                158.5, 0.5,
                159.5, 1.5,
                159.5, 20,
                140, 39.5,
                20, 39.5,
                0.5, 20,
                0.5, 0.5,
            ])
            .stroke({ width: 1, color: this.strokeColor })
            .fill(this.fillColor);

        // Вертикальные линии
        context
            .rect(20, 1, 1, 38)
            .fill(this.fillColor);

        context
            .rect(140, 1, 1, 38)
            .fill(this.fillColor);
    }

    override drawSelectedElement(position: XYPosition): GraphicsContext {
        const poly = [
            new Point(158.5, 0.5),
            new Point(159.5, 1.5),
            new Point(159.5, 20),
            new Point(140, 39.5),
            new Point(20, 39.5),
            new Point(0.5, 20),
            new Point(0.5, 0.5),
        ];
        const angle = (this.rotationAngle * Math.PI) / 180;
        const matrix = new Matrix()
            .translate(-this.offsets.left, -this.offsets.top)
            .rotate(angle)
            .translate(position.x + this.offsets.left, position.y + this.offsets.top);
        const tPoly = poly.map(p => matrix.apply(p)).flatMap(p => [p.x, p.y]);
        const graphicContext = new GraphicsContext();
        graphicContext
            .poly(tPoly)
            .fill({ color: "transparent" })
            .stroke({ width: 2, color: "#ef4444" });
        return graphicContext;
    }

    override getHitAreaPoints(): Point[] {
        return [new Point(0, 0), new Point(160, 0), new Point(160, 40), new Point(0, 40)];
    }

    override transformHitArea(position: XYPosition): IHitArea | undefined {
        const angle = (this.rotationAngle * Math.PI) / 180;
        const sclaeX = this.flipHorizontal ? -1 : 1;
        const scaleY = this.flipVertical ? -1 : 1;
        const points = [new Point(0, 0), new Point(160, 0), new Point(160, 40), new Point(0, 40)];
        const matrix = new Matrix()
            .translate(-this.offsets.left, -this.offsets.top)
            .scale(sclaeX, scaleY)
            .rotate(angle)
            .translate(position.x + this.offsets.left, position.y + this.offsets.top);
        const transformed = points.map(p => matrix.apply(p)).flatMap(p => [p.x, p.y]);
        return new Polygon(transformed);
    }
}
