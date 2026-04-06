import { BitmapText, GraphicsContext, Matrix, Point, Polygon, type IHitArea } from "pixi.js";
import { type XYPosition } from "@/shared/graphical-editor";
import { BaseGraphicObject } from "../../model/base-object-scheme";
import { drawDirectionObjectIcon } from "../shared/use-direction";

export class GraphicObjectSubsystemSeparator extends BaseGraphicObject {
    override async drawElement(context: GraphicsContext): Promise<void> {
        context.clear();
        // Белые круги
        context.circle(0, 10, 2).fill(0xffffff);
        context.circle(40, 10, 2).fill(0xffffff);

        // Основной прямоугольник
        context.rect(0.5, 0.5, 39, 19).stroke({ width: 2, color: this.strokeColor }).fill(this.fillColor);

        // Диагональные прерывистые линии
        const dashLength = 3;
        const gapLength = 3;

        // Линия 1: (9.5, 0.5) -> (0.5, 19.5)
        this.drawDashedLine(context, 9.5, 0.5, 0.5, 19.5, dashLength, gapLength, this.strokeColor);

        // Линия 2: (19.5, 0.5) -> (10.5, 19.5)
        this.drawDashedLine(context, 19.5, 0.5, 10.5, 19.5, dashLength, gapLength, this.strokeColor);

        // Линия 3: (29.5, 0.5) -> (20.5, 19.5)
        this.drawDashedLine(context, 29.5, 0.5, 20.5, 19.5, dashLength, gapLength, this.strokeColor);

        // Линия 4: (39.5, 0.5) -> (30.5, 19.5)
        this.drawDashedLine(context, 39.5, 0.5, 30.5, 19.5, dashLength, gapLength, this.strokeColor);
        drawDirectionObjectIcon(context, { x: 15, y: 25 }, this.arrowColor, 12, 1.2, 1);
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

    private drawDashedLine(
        graphics: GraphicsContext,
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        dashLength: number,
        gapLength: number,
        colorLine: string
    ) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const dashCount = Math.floor(distance / (dashLength + gapLength));

        const unitX = dx / distance;
        const unitY = dy / distance;

        for (let i = 0; i <= dashCount; i++) {
            const startX = x1 + i * (dashLength + gapLength) * unitX;
            const startY = y1 + i * (dashLength + gapLength) * unitY;
            const endX = startX + dashLength * unitX;
            const endY = startY + dashLength * unitY;

            graphics.moveTo(startX, startY).lineTo(endX, endY).stroke({ width: 1, color: colorLine, cap: "round" });
        }
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
