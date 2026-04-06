import type { GraphicObjectDto, GraphicObjectTypeDto, TechObjectTypeDto } from "@/entities/projects";
import type { ITool, ObjectInfo, ObjectType } from "..";
import type { Viewport } from "pixi-viewport";
import type { IGraphicalEditorTooltip, ManagerTooltip } from "../..";

export abstract class GraphicObjectScheme<T = any> {
    object: GraphicObjectDto | null = null;
    idObject: number;
    techObjectId?: number;
    graphType?: GraphicObjectTypeDto;
    techType?: TechObjectTypeDto;
    objectType: ObjectType;
    label: string;
    data: T;

    constructor(info: ObjectInfo) {
        this.idObject = info.id;
        this.techObjectId = info.techObjectId;
        this.graphType = info.graphType;
        this.techType = info.techType;
        this.objectType = info.objectType;
        this.label = info.label ?? "";
        this.data = info.data;
    }

    abstract setStrokeColor(strokeColor: string): void;
    abstract draw(viewport: Viewport, tool:ITool, tooltip?: IGraphicalEditorTooltip): void;
}
