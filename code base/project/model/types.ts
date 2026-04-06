import { SelectedGraphicObject } from "@/shared/graphical-editor";
import type { GraphicObjectControlValve, GraphicObjectSmallControlValve } from "../ui";
import type { Viewport } from "pixi-viewport";

export type DataContentNode = {
    controlMode?: ControlMode;
    direction?: DirectionGraphicObject;
    directionFlow?: DirectionFlow;
};

export enum ControlMode {
    Setpoint,
    Fixed,
}

export type GraphicObjectControlValves = GraphicObjectControlValve | GraphicObjectSmallControlValve;

export type DirectionGraphicObject = "left" | "right" | "none";
export type DirectionFlow = "positive" | "negative" | "none";

export type PositionIcon = {
    left: number;
    top: number;
};

export type SpecialPassportPropertyPath = "id" | "name" | "description";

export interface IObjectControlMode {
    constrolMode?: ControlMode;
    setControlMode(mode: ControlMode | undefined): void;
    setControlModeAndDraw(mode: ControlMode | undefined, viewport: Viewport): void;
}