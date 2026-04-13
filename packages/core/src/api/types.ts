import { ObjectType, Offsets, XYPosition } from "../model";

export type ObjectDescription = {
    featureObjectType: string;
    graphObjectType: ObjectType;
    thikness?: number;
    strokeWidth?: number;
    offsets?: Offsets;
    polynom?: number[]
    fillColor?: string;
    strokeColor?: string;

}

export type GraphicObjectDto <Data = any> = {
    id: number;
    featureObjectType: string;
    graphObjectType: ObjectType;
    position?: XYPosition;
    points?: XYPosition[];
    data?: Data ;
}