import {
    LinearGraphicObject,
    SelectedGraphicObject,
    PointerGraphicObject,
    SelectedLinearGraphicObject,
    SelectedPointerGraphicObject,
    GraphicObjectScheme,
} from "..";
import type { Graphics } from "pixi.js";

export type GraphicScheme = {
    layerGraphicObject: GraphicObjectsLayer;
    layerSelectedGraphicObject: SelectedGraphicObjectsLayer;
};

export type SelectedGraphicObjectsLayer = {
    linear: SelectedLinearGraphicObject[];
    pointer: SelectedPointerGraphicObject[];
};

export type GraphicObjectsLayer = {
    linear: LinearGraphicObject[];
    pointer: PointerGraphicObject[];
};

export type Layer<L, P> = {
    linear: L[];
    pointer: P[];
};

export type LineNode = { objectId: string; graphics: Graphics };

export type LinearObjectInfo = {
    id: number;
    flowType: string;
    points: XYPosition[];
};

export type ObjectInfo<T = any> = {
    id: number;
    techObjectId?: number;
    points?: XYPosition[];
    position?: XYPosition;
    rotateAngle?: number;
    flipHorizontal?: boolean;
    flipVertical?: boolean;
    objectType: ObjectType;
    thikness?: number;
    offsets?: Offsets;
    fillColor?: string;
    strokeColor?: string;
    data?: T;
};

export type SelectedLinearObjectInfo = {
    id: number;
    points: XYPosition[];
    styleLine: string;
};

export type BaseObjectData<T = any> = {
    idObject: number;
    layerType: LayerType;
    objectType: ObjectType;
    isActive: boolean;
    techObjectId: number;
    object: GraphicObjectScheme;
    dataContent?: T;
};

export type SelectedObjectData = BaseObjectData & {
    selectObject: SelectedGraphicObject;
    angle?: number;
    flipHorizontal?: boolean;
    flipVertical?: boolean;
};

export type PointerObjectData = BaseObjectData & {
    angle?: number;
    flipHorizontal?: boolean;
    flipVertical?: boolean;
    nodeClass?: string;
    label: string;
};
export type LinearObjectData = BaseObjectData & {
    points: XYPosition[];
    classProps?: string;
    isEndPoint?: boolean;
    thickness?: number;
};
export type EdgeData = BaseObjectData;

export type ObjectType = "linear" | "pointer";
export type LayerType = "select" | "base";
export type StylePipe = {
    thickness: number;
    color: string;
};

export type XYPosition = {
    x: number;
    y: number;
};

export type Offsets = {
    left: number;
    top: number;
};