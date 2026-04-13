import { Bounds } from "pixi.js";
import type { LinearGraphicObject, PointerGraphicObject, XYPosition } from "../model";

export function normalizeAngle(angle: number) {
    const floorAngle = Math.floor(Math.abs(angle) / 360) * 360;
    return angle <= -360 ? angle + floorAngle : angle >= 360 ? angle - floorAngle : angle;
}
export function getSign(type: string) {
    switch (type) {
        case "temperature-control-valve":
            return "T";
        case "pressure-control-valve":
            return "P";
        case "flow-control-valve":
            return "F";
        default:
            return "M";
    }
}
/**
 *
 * @param diameter
 * @param limitsTech kp lenght [m]
 * @param limitGraph
 * @returns
 */
export function convertTechToGraphicDiameter(
    diameter: number,
    limitsTech: [number, number] = [0.2, 0.8],
    limitGraph: [number, number] = [2, 6]
): number | undefined {
    if (diameter > 0) {
        const result =
            Math.abs((limitGraph[1] - limitGraph[0]) / (limitsTech[1] - limitsTech[0])) * diameter + limitGraph[0];
        return result ? result : undefined;
    } else {
        return undefined;
    }
}

export function findClosestSegment(
    clickPos: XYPosition,
    points: XYPosition[]
): { index: number; pointStar: XYPosition; pointEnd: XYPosition } | undefined {
    let closestSegment = undefined;
    let minDistance = Infinity;

    for (let i = 0; i < points.length - 1; i++) {
        const pointStar = points[i];
        const pointEnd = points[i + 1];

        const distance = distanceToSegment(clickPos, pointStar, pointEnd);

        if (distance < minDistance) {
            minDistance = distance;
            closestSegment = {
                index: i,
                pointStar,
                pointEnd,
            };
        }
    }

    // Пороговое значение для определения попадания (толщина линии + допуск)
    return minDistance <= 10 ? closestSegment : undefined;
}

function distanceToSegment(point: XYPosition, segmentStart: XYPosition, segmentEnd: XYPosition): number {
    const A = point.x - segmentStart.x;
    const B = point.y - segmentStart.y;
    const C = segmentEnd.x - segmentStart.x;
    const D = segmentEnd.y - segmentStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    let param = -1;
    if (lenSq !== 0) {
        param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
        xx = segmentStart.x;
        yy = segmentStart.y;
    } else if (param > 1) {
        xx = segmentEnd.x;
        yy = segmentEnd.y;
    } else {
        xx = segmentStart.x + param * C;
        yy = segmentStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;

    return Math.sqrt(dx * dx + dy * dy);
}

export function calculatingBoundsSchema(pointers: PointerGraphicObject[], linears: LinearGraphicObject[]): Bounds {
    const schemaBounds = new Bounds(Infinity, Infinity, -Infinity, -Infinity);
    const positions = [linears.flatMap(l => l.points), pointers.map(p => p.position)].flat();
    const caluclatedBounds = positions.reduce((bounds: Bounds, p) => {
        return compareBounds(p, bounds);
    }, schemaBounds);

    return caluclatedBounds;
}

function compareBounds(position: XYPosition, bounds: Bounds): Bounds {
    const minX = bounds.minX;
    const minY = bounds.minY;
    const maxX = bounds.maxX;
    const maxY = bounds.maxY;

    if (position.x < minX) {
        bounds.minX = position.x;
    }

    if (position.y < minY) {
        bounds.minY = position.y;
    }

    if (position.x > maxX) {
        bounds.maxX = position.x;
    }

    if (position.y > maxY) {
        bounds.maxY = position.y;
    }

    return bounds;
}
