import { GraphicObjectTypeDto, TechObjectTypeDto } from "@/entities/projects";
import { LinearGraphicObject, PointerGraphicObject, TextualGraphicObject, type XYPosition } from "..";
import { Container, Graphics } from "pixi.js";
import { Viewport } from "pixi-viewport";

export abstract class SelectedGraphicObject {
    idObject: number;
    type: string;
    isActive: boolean;
    graphType?: GraphicObjectTypeDto;
    techType?: TechObjectTypeDto;
    techObjectId?: number;
    graphics: Graphics;

    protected constructor(info: InfoBase) {
        this.idObject = info.id;
        this.techType = info.techType;
        this.graphType = info.typeGraph;
        this.type = info.typeSelect;
        this.techObjectId = info.techObjectId;
        this.isActive = true;
        this.graphics = new Graphics();
    }
    public abstract draw(viewport?: Viewport): Graphics[] | Container;

    public abstract delete(viewport?: Viewport): void;

    public abstract move(points: XYPosition | XYPosition[], viewport: Viewport): void;

    public abstract cancel(initPoints: XYPosition | XYPosition[]): void;

    public abstract rotate(angle: number, viewport: Viewport): void;

    public abstract setObjectScheme(object: PointerGraphicObject | LinearGraphicObject | TextualGraphicObject): void;

    public abstract normalizeToGrid(): void;
}

export type InfoBase = {
    id: number;
    techType?: TechObjectTypeDto;
    typeSelect: string;
    typeGraph?: GraphicObjectTypeDto;
    isActive: boolean;
    techObjectId?: number;
};
