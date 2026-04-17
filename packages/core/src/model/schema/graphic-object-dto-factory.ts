import type { ObjectInfo, ObjectType, XYPosition } from "./types";
import { LinearGraphicObject } from "./linear/linear-graphic-object";
import { PointerGraphicObject } from "./pointer/pointer-graphic-object";

export type GraphicObjectDto<Data = any> = {
    id: number;
    featureObjectType: string;
    graphObjectType: ObjectType;
    position?: XYPosition;
    points?: XYPosition[];
    data?: Data;
};

export type LinearGraphicObjectDto<Data = any> = GraphicObjectDto<Data> & {
    graphObjectType: "linear";
    points: XYPosition[];
};

export type PointerGraphicObjectDto<Data = any> = GraphicObjectDto<Data> & {
    graphObjectType: "pointer";
    position: XYPosition;
};

export function isLinearGraphicObjectDto<Data = any>(dto: GraphicObjectDto<Data>): dto is LinearGraphicObjectDto<Data> {
    return dto.graphObjectType === "linear" && Array.isArray(dto.points);
}

export function isPointerGraphicObjectDto<Data = any>(
    dto: GraphicObjectDto<Data>
): dto is PointerGraphicObjectDto<Data> {
    return dto.graphObjectType === "pointer" && dto.position !== undefined;
}

function toObjectInfo<Data = any>(dto: GraphicObjectDto<Data>): ObjectInfo<Data> {
    return {
        id: dto.id,
        objectType: dto.graphObjectType,
        position: dto.position,
        points: dto.points,
        data: dto.data,
    };
}

export function createGraphicObjectFromDto<Data = any>(
    dto: GraphicObjectDto<Data>
): PointerGraphicObject | LinearGraphicObject {
    if (isPointerGraphicObjectDto(dto)) {
        return new PointerGraphicObject(toObjectInfo(dto));
    }
    if (isLinearGraphicObjectDto(dto)) {
        return new LinearGraphicObject(toObjectInfo(dto));
    }
    throw new Error(`Invalid graphic object dto. id=${dto.id}, type=${dto.graphObjectType}`);
}
