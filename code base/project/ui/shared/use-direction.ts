import type { GraphicsContext } from "pixi.js";
import type { XYPosition } from "@/shared/graphical-editor";
import { directionIcon } from "../../lib";
/**
 * Функция drawDirectionPipeIcon рисует иконки направления (стрелки) вдоль линии, заданной массивом точек.
 * Используется для отображения направления потока на трубопроводах или линейных объектах.
 *
 * @param graphicsContext - Контекст графики, в котором выполняется отрисовка.
 * @param points - Массив точек (XYPosition), определяющих траекторию линии.
 * @param color - Цвет основной стрелки направления.
 * @param lenght - Длина стрелки (по умолчанию 10).
 * @param strokeWidth - Толщина линии стрелки (по умолчанию 1).
 * @param scale - Масштаб стрелки (по умолчанию 1).
 * @param gapArrow - Расстояние между стрелками вдоль линии (по умолчанию 30).
 * @param colorDuplexArrow - Цвет обратной стрелки (если требуется двунаправленное отображение).
 *
 * Для каждой пары соседних точек функция вычисляет направление и размещает стрелки с заданным интервалом.
 * Если указан colorDuplexArrow, рисуются стрелки в обе стороны.
 */

export function drawDirectionPipeIcon(
    graphicsContext: GraphicsContext,
    points: XYPosition[],
    color: string,
    lenght: number = 10,
    strokeWidth: number = 1,
    scale: number = 1,
    gapArrow: number = 30,
    colorDuplexArrow?: string
) {
    const gap = gapArrow;
    const dash = lenght;
    const spaceBetweenArrow = 2;
    for (let i = 1; i < points.length; i++) {
        graphicsContext.moveTo(points[i - 1].x, points[i - 1].y);
        const length = Math.sqrt((points[i].x - points[i - 1].x) ** 2 + (points[i].y - points[i - 1].y) ** 2);
        const segmentCount = length / (gap + dash);

        const cos = (points[i].x - points[i - 1].x) / length;
        const sin = (points[i].y - points[i - 1].y) / length;

        const dashCos = dash * cos;
        const dashSin = dash * sin;

        const gapCos = gap * cos;
        const gapSin = gap * sin;

        const isRightHalf = points[i].x - points[i - 1].x >= 0;

        const calcAngle = Math.atan(sin / cos);
        const angle = isRightHalf ? calcAngle : calcAngle + Math.PI;

        const spaceArrowsX = spaceBetweenArrow * cos;
        const spaceArrowsY = spaceBetweenArrow * sin;
        for (let j = 0; j <= segmentCount - 1; j++) {
            const movePointx = points[i - 1].x + j * (gapCos + dashCos) + dashCos;
            const movePointy = points[i - 1].y + j * (gapSin + dashSin) + dashSin;

            directionIcon({
                graphicsContext,
                x: movePointx,
                y: movePointy,
                color,
                angle,
                strokeWidth,
                lenght: dash,
                scale,
            });
            if (colorDuplexArrow) {
                directionIcon({
                    graphicsContext,
                    x: movePointx - spaceArrowsX,
                    y: movePointy - spaceArrowsY,
                    color: colorDuplexArrow,
                    angle: angle + Math.PI,
                    strokeWidth,
                    lenght: dash,
                    scale,
                });
            }
        }
    }
}

export function drawDirectionObjectIcon(
    graphicsContext: GraphicsContext,
    position: XYPosition,
    color: string,
    lenght: number = 10,
    strokeWidth: number = 1,
    scale: number = 1,
    colorDuplexArrow?: string
) {
    if (colorDuplexArrow) {
        directionIcon({
            graphicsContext,
            x: position.x + 5,
            y: position.y,
            color,
            angle: 0,
            strokeWidth,
            lenght: lenght * 0.8,
            scale,
        });
        directionIcon({
            graphicsContext,
            x: position.x + 5,
            y: position.y,
            color: colorDuplexArrow,
            angle: Math.PI,
            strokeWidth: 1,
            lenght: lenght * 0.8,
            scale,
        });
    } else {
        directionIcon({ graphicsContext, x: position.x, y: position.y, color, angle: 0, strokeWidth, lenght, scale });
    }
}
