import { ObjectType, Offsets, XYPosition } from "../model";

export type ObjectDescription = {
    featureObjectType: string;
    graphObjectType: ObjectType;
    thikness?: number;
    strokeWidth?: number;
    offsets?: Offsets;
    polynom?: XYPosition[]
    fillColor?: string;
    strokeColor?: string;

}

export type GraphicObjectDto <Data extends ObjectBaseData> = {
    id: number;
    featureObjectType: string;
    graphObjectType: ObjectType;
    position?: XYPosition;
    points?: XYPosition[];
    rotateAngle?: number;
    flipHorizontal?: boolean;
    flipVertical?: boolean;
    data?: Data ;
}

export type ObjectBaseData = {
    techObjectId: number;
}