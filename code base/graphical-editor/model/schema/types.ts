import {
    LinearGraphicObject,
    SelectedGraphicObject,
    PointerGraphicObject,
    SelectedLinearGraphicObject,
    SelectedPointerGraphicObject,
    GraphicObjectScheme,
    TextualGraphicObject
} from "..";
import type { ControlMode, GraphicObjectTypeDto, TechObjectDto, TechObjectTypeDto } from "@/entities/projects";
import type { Graphics } from "pixi.js";
import type { SelectedTextualGraphicObject } from "./textual/selected-textual-graphic-object";

export type GraphicScheme = {
    layerGraphicObject: GraphicObjectsLayer;
    layerSelectedGraphicObject: SelectedGraphicObjectsLayer;
};

export type SelectedGraphicObjectsLayer = {
    linear: SelectedLinearGraphicObject[];
    pointer: SelectedPointerGraphicObject[];
    textual:SelectedTextualGraphicObject[];
};

export type GraphicObjectsLayer = {
    linear: LinearGraphicObject[];
    pointer: PointerGraphicObject[];
    textual: TextualGraphicObject[];
};

export type Layer<L, P> = {
    linear: L[];
    pointer: P[];
};

export type LineNode = { objectId: string; graphics: Graphics };

export type LinearObjectInfo = {
    id: number;
    flowType: string;
    techObject: TechObjectDto;
    points: GraphicPoint[];
};

export type ObjectInfo<T = any> = {
    id: number;
    techObjectId?: number;
    points?: GraphicPoint[];
    position?: GraphicPoint;
    rotateAngle?: number;
    flipHorizontal?: boolean;
    flipVertical?: boolean;
    graphType?: GraphicObjectTypeDto;
    techType?: TechObjectTypeDto;
    objectType: ObjectType;
    thikness?: number;

    fillColor?: string;
    strokeColor?: string;
    data?: T;
};

export type TextualObjectInfo = ObjectInfo;

export type SelectedLinearObjectInfo = {
    id: number;
    typeGraph: GraphicObjectTypeDto;
    techObject: TechObjectDto;
    points: GraphicPoint[];
    styleLine: string;
};

export type GraphicPoint = {
    x: number;
    y: number;
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
    points: GraphicPoint[];
    classProps?: string;
    isEndPoint?: boolean;
    thickness?: number;
};
export type EdgeData = BaseObjectData;

export type TextaulObjectData<T = unknown> = BaseObjectData & {
    data: T;
};

export type ObjectType = "linear" | "pointer" | "textual";
export type LayerType = "select" | "base";
export type StylePipe = {
    thickness: number;
    color: string;
};

export type XYPosition = {
    x: number;
    y: number;
};