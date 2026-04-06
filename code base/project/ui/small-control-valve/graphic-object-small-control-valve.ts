import { BitmapText, Graphics, GraphicsContext, Matrix, Point, Polygon, type IHitArea } from "pixi.js";
import { type ObjectInfo, type XYPosition } from "@/shared/graphical-editor";
import { BaseGraphicObject } from "../../model/base-object-scheme";
import { ControlMode, directionIcon, fillColors, strokeColors, TechObjectTypeDto, type IObjectControlMode } from "../..";
import { AnimationGraphicObject } from "../../model/animation-graphic-object";
import { drawDirectionObjectIcon } from "../shared/use-direction";
import { drawIconControlMode, type IControlValve } from "../shared/use-control-mode";
import type { Viewport } from "pixi-viewport";

export class GraphicObjectSmallControlValve extends AnimationGraphicObject implements IObjectControlMode {
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
        context.circle(20, 30, 2).fill(0xffffff);

        // Вертикальная линия
        context.rect(9.5, 20.2436, 1, 10).fill(strokeColors.default);

        // Круг в центре
        context.circle(10, 15.5, 5).stroke({ width: 2, color: strokeColors.default }).fill(fillColors.default);

        // Основная фигура клапана (ромб)
        context
            .poly([
                10, 30.12, 1.9658, 34.3486, 0.5, 33.4636, 0.5, 26.7764, 1.9658, 25.8914, 10, 30.12, 18.0343, 25.8914,
                19.5, 26.7764, 19.5, 33.4636, 18.0343, 34.3486,
            ])
            .stroke({ width: 2, color: this.strokeColor })
            .fill(this.fillColor);
        // иконка направления под объектом
        //directionIcon(graphics, 5, 38)
        drawDirectionObjectIcon(context, { x: 6.5, y: 37 }, this.arrowColor, 9, 1.1, 0.8);
        drawIconControlMode(context, { x: -5, y: 29 }, this.constrolMode);
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
                fontSize: 8,
                align: "center",
                fill: "white",
            },
            position: {
                x: 7.6,
                y: 11.6,
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
            new Point(10, 30.12),
            new Point(1.9658, 34.3486),
            new Point(0.5, 33.4636),
            new Point(0.5, 26.7764),
            new Point(1.9658, 25.8914),
            new Point(10, 30.12),
            new Point(18.0343, 25.8914),
            new Point(19.5, 26.7764),
            new Point(19.5, 33.4636),
            new Point(18.0343, 34.3486),
        ];
        const circleCenter = new Point(10, 15.5);
        const lineTopStart = new Point(9.5, 20.2436);
        const lineTopEnd = new Point(9.5, 30.2436);

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

        // 5) контекст
        const graphicContext = new GraphicsContext();
        graphicContext
            .moveTo(tLineTopStart.x, tLineTopStart.y)
            .lineTo(tLineTopEnd.x, tLineTopEnd.y)
            .stroke({ color: "#ef4444", width: 2 });
        graphicContext.circle(tCenter.x, tCenter.y, 5).stroke({ width: 2, color: "#ef4444" }).fill("transparent");
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
                x: 10,
                y: 40,
            },
        });
    }

    override getHitAreaPoints(): Point[] {
        return [new Point(0, 0), new Point(20, 0), new Point(20, 40), new Point(0, 40)];
    }

    override transformHitArea(position: XYPosition): IHitArea | undefined {
        const angle = (this.rotationAngle * Math.PI) / 180;
        const sclaeX = this.flipHorizontal ? -1 : 1;
        const scaleY = this.flipVertical ? -1 : 1;
        const points = [new Point(0, 0), new Point(20, 0), new Point(20, 40), new Point(0, 40)];
        const matrix = new Matrix()
            .translate(-this.offsets.left, -this.offsets.top)
            .scale(sclaeX, scaleY)
            .rotate(angle)
            .translate(position.x + this.offsets.left, position.y + this.offsets.top);
        const transformed = points.map(p => matrix.apply(p)).flatMap(p => [p.x, p.y]);
        return new Polygon(transformed);
    }
}
