import { LinearGraphicObject, PointerGraphicObject, type XYPosition } from "..";
import { Container, Graphics } from "pixi.js";
import { Viewport } from "pixi-viewport";

export abstract class SelectedGraphicObject {
    idObject: number;
    type: string;
    isActive: boolean;
    techObjectId?: number;
    graphics: Graphics;

    protected constructor(info: InfoBase) {
        this.idObject = info.id;
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

    public abstract setObjectScheme(object: PointerGraphicObject | LinearGraphicObject): void;

    public abstract normalizeToGrid(): void;
}

export type InfoBase = {
    id: number;
    typeSelect: string;
    isActive: boolean;
    techObjectId?: number;
};
