import type { DefineComponent, Raw } from "vue";
import type { GraphEdge, GraphNode, XYPosition } from "@vue-flow/core";
import {
    type GraphicScheme,
    LinearGraphicObject,
    type ObjectInfo,
    PointerGraphicObject,
    SelectedLinearGraphicObject,
    SelectedPointerGraphicObject,
} from "..";
import { type ITool } from "../tools";
import type { FilterSelectedObjects } from "@/entities/select-object";
import { Viewport } from "pixi-viewport";
import type { Application, Bounds, BoundsData } from "pixi.js";
import type { IGraphicalEditorTooltip, ManagerTooltip } from "../..";

export type NodeTemplate = {
    slotName: string;
    component: Raw<Component | DefineComponent> | Component | DefineComponent;
};

export type NodeTemplates = {
    selected: NodeTemplate[];
    base: NodeTemplate[];
};
export type Templates = {
    linear: NodeTemplates;
    pointer: NodeTemplates;
};

export type PanelInfo = {
    objectId: string;
    techObjectId: number;
    position: XYPosition;
};

export type CopyObject = GraphicObjectDto & { techType: TechObjectTypeDto; fillColor?: string; strokeColor?: string };

export type GraphicSchemeState = {
    scheme: GraphicScheme;
    lastActiveGraphicObject: SelectedLinearGraphicObject | SelectedPointerGraphicObject | null;
    tool: ITool;
    panelInfo: PanelInfo | undefined;
    app: Application | undefined;
    isBadResponse: boolean;
    isRotateIcon: boolean;
    bufferObjects: CopyObject[];
    isDragObjects: boolean;
    isDragPan: boolean;
    backroundColor: string;
    tooltipManager?: IGraphicalEditorTooltip;
    boundsSelectedArea?: Bounds;
    createrCopyObjectsCb:
        | ((
              bufferObjects: CopyObject[],
              tool: ITool
          ) => Promise<{ pointers: PointerGraphicObject[]; linears: LinearGraphicObject[] } | undefined>)
        | undefined;
    preRenderCbs: (() => void)[];
    postRenderCbs: (() => void)[];
};

export interface IGraphicSchemeGeteers {
    createLinearObject(info: ObjectInfo): void;
    createPointerObject(info: ObjectInfo): void;
    parseLinearObject(nodes: GraphNode[]): {
        findersSelectedLinearObjects: Map<number, SelectedLinearGraphicObject>;
        moveNodes: Map<number, GraphNode<any, any, string>[]>;
    };
    clearSelectionObjects(): void;
}

export interface IGraphicSchemeActions {
    pointerObjs(): PointerGraphicObject[];
    linearObjs(): LinearGraphicObject[];
    filterCopyObjects(): FilterSelectedObjects[];
}

export enum StylePointerNode {
    Primary = "scheme-node-on",
    Danger = "scheme-node-on__danger",
    DangerToSuccsess = "scheme-node-on__dangerToSuccess",
    SuccessToDanger = "scheme-node-on__successToDanger",
    InProgress = "scheme-node-on__progress",
    Disabled = "scheme-node-off",
}

export enum StyleLinearEdge {
    Primary = "scheme-edge-pipeline",
    Disabled = "scheme-edge-disabled",
    Secondary = "scheme-edge-pipe",
}
