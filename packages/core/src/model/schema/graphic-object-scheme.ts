import type { ObjectInfo, ObjectType } from "..";
import type { ITool } from "../tools";
import type { Viewport } from "pixi-viewport";

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
