import { BitmapText, GraphicsContext, Matrix, Point, Polygon, type IHitArea } from "pixi.js";
import { type XYPosition } from "@/shared/graphical-editor";
import { BaseGraphicObject } from "../../model/base-object-scheme";

export class GraphicObjectLauncherPigTrap extends BaseGraphicObject {
    override async drawElement(context: GraphicsContext): Promise<void> {
        context.clear();

        // Белые круги
        context.circle(20, 0, 2).fill(0xffffff);
        context.circle(160, 10, 2).fill(0xffffff);

        // Основная фигура
        context
            .poly([160, 0, 160, 20, 140, 40, 20, 40, 20, 0])
            .stroke({ width: 2, color: this.strokeColor })
            .fill(this.fillColor);
        //полукруг
        context
            .moveTo(20, 40)
            .arc(20, 20, 20, Math.PI / 2, (3 * Math.PI) / 2)
            .lineTo(20, 40)
            .stroke({ width: 2, color: this.strokeColor })
            .fill(this.fillColor);

        // Вертикальные линии
        context.rect(20, 0, 1, 40).fill(this.strokeColor);

        context.rect(140, 0, 1, 40).fill(this.strokeColor);
    }

    override drawSelectedElement(position: XYPosition): GraphicsContext {
        const angle = (this.rotationAngle * Math.PI) / 180;
        const sclaeX = this.flipHorizontal ? -1 : 1;
        const scaleY = this.flipVertical ? -1 : 1;

        const poly = [new Point(160, 0), new Point(160, 20), new Point(140, 40), new Point(20, 40), new Point(20, 0)];
        const arcPointStart = new Point(20, 40);
        const arcPointCenter = new Point(20, 20);

        const matrix = new Matrix()
            .translate(-this.offsets.left, -this.offsets.top)
            .scale(sclaeX, scaleY)
            .rotate(angle)
            .translate(position.x + this.offsets.left, position.y + this.offsets.top);

        const tPoly = poly.map(p => matrix.apply(p)).flatMap(p => [p.x, p.y]);
        const aps = matrix.apply(arcPointStart);
        const apc = matrix.apply(arcPointCenter);

        const graphicContext = new GraphicsContext();
        graphicContext.poly(tPoly).fill({ color: "transparent" }).stroke({ width: 2, color: "#ef4444" });
        //полукруг
        graphicContext
            .moveTo(aps.x, aps.y)
            .arc(apc.x, apc.y, 20, Math.PI / 2 + angle, (3 * Math.PI) / 2 + angle, this.flipHorizontal)
            .lineTo(aps.x, aps.y)
            .stroke({ width: 2, color: "#ef4444" })
            .fill("transparent");
        return graphicContext;
    }

    override drawLabelElement(): BitmapText | undefined {
        return new BitmapText({
            text: this.label,
            anchor: {
                x: 0.5,
                y: 0.5,
            },
            style: {
                fontSize: 12,
                align: "center",
                fill: "#DFE1E5",
            },
            position: {
                x: 80,
                y: 20,
            },
        });
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
