import { Graphics, GraphicsContext } from "pixi.js";
import { LinearGraphicObject, type ObjectInfo } from "@/shared/graphical-editor";
import { drawDirectionPipeIcon } from "../ui/shared/use-direction";
import type { Viewport } from "pixi-viewport";

export class GraphicObjectBasePipe extends LinearGraphicObject {
    pipeColor: string = "transparent";
    arrowColor: string = "transparent";
    reversArrowColor?: string;

    setColorPipe(color: string, viewport: Viewport) {
        this.pipeColor = color;
        const graphics = viewport.getChildByLabel(`${this.idObject}`) as Graphics | undefined;
    }

    setColorArrow(color: string, viewport: Viewport) {
        this.arrowColor = color;
    }
    setColorReversArrow(color: string, viewport: Viewport) {
        this.reversArrowColor = color;
    }

    async setColorDuplexArrow(colorArrow: string, colorReverseArrow: string | undefined) {
        this.arrowColor = colorArrow;
        this.reversArrowColor = colorReverseArrow;
    }

    override drawElement(): GraphicsContext {
        const context = new GraphicsContext();
        if (this.points.length < 2) return context;

        // Начинаем рисовать линию

        // Перемещаемся к первой точке
        const firstPoint = this.points[0];
        context.moveTo(firstPoint.x, firstPoint.y);

        // Рисуем линии к остальным точкам
        for (let i = 1; i < this.points.length; i++) {
            const point = this.points[i];
            context.lineTo(point.x, point.y).stroke({
                width: this.thickness,
                color: this.pipeColor,
                cap: "round",
            });
        }
        // Рисует основной графический элемент (линию трубы) между точками объекта.
        // Для каждой пары точек строится линия с заданной толщиной и цветом.
        // После отрисовки линии добавляются иконки направления потока (стрелки).
        //
        // Аргументы:
        //   this.points - массив точек, определяющих траекторию трубы.
        //   this.thickness - толщина линии трубы.
        //   this.pipeColor - цвет основной линии трубы.
        //   this.arrowColor - цвет стрелки направления потока.
        //   this.reversArrowColor - цвет обратной стрелки (если есть).

        drawDirectionPipeIcon(
            context,
            this.points,
            this.arrowColor,
            12,
            this.thickness / 4,
            this.thickness / 8,
            this.thickness * 6,
            this.reversArrowColor
        );
        return context;
    }
}
