
import type { ITool, ObjectInfo, ObjectType } from "..";
import type { Viewport } from "pixi-viewport";
import type { IGraphicalEditorTooltip, ManagerTooltip } from "../..";

export abstract class GraphicObjectScheme<T = any> {
    idObject: number;
    objectType: ObjectType;
    data: T;

    constructor(info: ObjectInfo) {
        this.idObject = info.id;
        this.objectType = info.objectType;
        this.data = info.data;
    }

    //abstract setStrokeColor(strokeColor: string): void; ???
    abstract draw(viewport: Viewport, tool:ITool): void;
}
