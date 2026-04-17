import {
	type GraphicScheme,
	LinearGraphicObject,
	type ObjectInfo,
	PointerGraphicObject,
	SelectedLinearGraphicObject,
	SelectedPointerGraphicObject,
} from "..";
import { type ITool } from "../tools";
import type { Application } from "pixi.js";

export type NodeTemplate = {
	slotName: string;
};

export type NodeTemplates = {
	selected: NodeTemplate[];
	base: NodeTemplate[];
};
export type Templates = {
	linear: NodeTemplates;
	pointer: NodeTemplates;
};

export type GraphicSchemeState = {
	scheme: GraphicScheme;
	lastActiveGraphicObject:
		| SelectedLinearGraphicObject
		| SelectedPointerGraphicObject
		| null;
	tool: ITool;
	app: Application | undefined;
	isDragObjects: boolean;
	isDragPan: boolean;
	backroundColor: string;
	preRenderCbs: (() => void)[];
	postRenderCbs: (() => void)[];
};

export interface IGraphicSchemeGeteers {
	createLinearObject(info: ObjectInfo): void;
	createPointerObject(info: ObjectInfo): void;
	clearSelectionObjects(): void;
}

export interface IGraphicSchemeActions {
	pointerObjs(): PointerGraphicObject[];
	linearObjs(): LinearGraphicObject[];
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
