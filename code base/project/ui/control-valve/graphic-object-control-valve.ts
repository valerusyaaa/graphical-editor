import { BitmapText, Graphics, GraphicsContext, Matrix, Point, Polygon, type IHitArea } from "pixi.js";
import { type ObjectInfo, type XYPosition } from "@/shared/graphical-editor";
import { BaseGraphicObject } from "../../model/base-object-scheme";
import { directionIcon, fillColors, strokeColors } from "../../lib";
import { TechObjectTypeDto } from "../../api";
import { AnimationGraphicObject } from "../../model/animation-graphic-object";
import { drawDirectionObjectIcon } from "../shared/use-direction";
import { drawIconControlMode } from "../shared/use-control-mode";
import { ControlMode } from "../../model";
import type { Viewport } from "pixi-viewport";
import { type IObjectControlMode } from "../../model";

export class GraphicObjectControlValve extends AnimationGraphicObject implements IObjectControlMode {
    constrolMode?: ControlMode;
    constructor(info: ObjectInfo) {
        super(info);
        this.constrolMode = info.controlMode;
    }

    setControlModeAndDraw(mode: ControlMode | undefined, viewport: Viewport) {
        this.constrolMode = mode;
        const container = viewport.getChildByLabel(`${this.idObject}`);
        if (container) {
            const graphics = container.getChildByLabel("graphics") as Graphics;
            if (graphics) {
                this.drawElement(graphics.context);
            }
        }
    }
    setControlMode(mode: ControlMode | undefined) {
        this.constrolMode = mode;
    }
    override async drawElement(context: GraphicsContext): Promise<void> {
        context.clear();

        // Белые круги
        context.circle(0, 30, 2).fill(0xffffff);
        context.circle(40, 30, 2).fill(0xffffff);

        // Вертикальная линия
        context.rect(19.5, 20, 1, 10).fill(strokeColors.default);

        // Круг в центре
        context.circle(20, 10, 9.5).stroke({ width: 2, color: strokeColors.default }).fill(fillColors.default);

        // Основная фигура клапана (ромб)
        context
            .poly([
                20, 30, 1.95632, 39.2532, 0.5, 38.3634, 0.5, 21.6366, 1.95632, 20.7468, 20, 30, 38.0437, 20.7468, 39.5,
                21.6366, 39.5, 38.3634, 38.0437, 39.2532,
            ])
            .stroke({ width: 2, color: this.strokeColor })
            .fill(this.fillColor);

        // иконка направления под объектом
        drawDirectionObjectIcon(context, { x: 15, y: 40 }, this.arrowColor, 12, 1.2, 1);
        drawIconControlMode(context, { x: -5, y: 33 }, this.constrolMode);
    }

    override drawTextElement(): BitmapText {
        let symbol;
        switch (this.techType) {
            case TechObjectTypeDto.TemperatureControlValve:
                symbol = "T";
                break;
            case TechObjectTypeDto.PressureControlValve:
                symbol = "P";
                break;
            case TechObjectTypeDto.FlowRateControlValve:
                symbol = "F";
                break;
            default:
                symbol = "M";
                break;
        }
        return new BitmapText({
            text: symbol,
            style: {
                fontSize: 14,
                align: "center",
                fill: "white",
            },
            position: {
                x: 15.5,
                y: 2.5,
            },
        });
    }

    override drawSelectedElement(position: XYPosition): GraphicsContext {
        // 1) углы и масштабы
        const angle = (this.rotationAngle * Math.PI) / 180;
        const sclaeX = this.flipHorizontal ? -1 : 1;
        const scaleY = this.flipVertical ? -1 : 1;

        // 2) точки
        const diamond = [
            new Point(20, 30),
            new Point(1.95632, 39.2532),
            new Point(0.5, 38.3634),
            new Point(0.5, 21.6366),
            new Point(1.95632, 20.7468),
            new Point(20, 30),
            new Point(38.0437, 20.7468),
            new Point(39.5, 21.6366),
            new Point(39.5, 38.3634),
            new Point(38.0437, 39.2532),
        ];
        const circleCenter = new Point(20, 10);
        const lineTopStart = new Point(19.5, 20);
        const lineTopEnd = new Point(19.5, 30);

        // 3) матрица
        const matrix = new Matrix()
            .translate(-this.offsets.left, -this.offsets.top)
            .scale(sclaeX, scaleY)
            .rotate(angle)
            .translate(position.x + this.offsets.left, position.y + this.offsets.top);

        // 4) трансформация точек
        const tDiamond = diamond.map(p => matrix.apply(p)).flatMap(p => [p.x, p.y]);
        const tCenter = matrix.apply(circleCenter);
        const tLineTopStart = matrix.apply(lineTopStart);
        const tLineTopEnd = matrix.apply(lineTopEnd);

        // 5) создание контекста
        const graphicContext = new GraphicsContext();
        graphicContext
            .moveTo(tLineTopStart.x, tLineTopStart.y)
            .lineTo(tLineTopEnd.x, tLineTopEnd.y)
            .stroke({ color: "#ef4444", width: 2 });
        graphicContext.circle(tCenter.x, tCenter.y, 9.5).stroke({ width: 2, color: "#ef4444" }).fill("transparent");
        graphicContext.poly(tDiamond).fill({ color: "transparent" }).stroke({ width: 2, color: "#ef4444" });
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
                y: 45,
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
