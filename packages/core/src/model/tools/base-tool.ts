import type { FederatedPointerEvent } from "pixi.js";
import type {
    LinearGraphicObject,
    PointerGraphicObject,
    SelectedLinearGraphicObject,
    SelectedPointerGraphicObject,
} from "../schema";
import type { ITool } from "./itool";
import type { MenuItem } from "primevue/menuitem";

export class BaseTool implements ITool {
    contextMenu: any;
    itemsContextMenu: MenuItem[];
    constructor() {
        this.contextMenu = undefined;
        this.itemsContextMenu = [];
    }
    async onMouseDownPointerObject(event: FederatedPointerEvent, object: PointerGraphicObject): Promise<void> {}
    async onMouseDownLinearObject(event: FederatedPointerEvent, object: LinearGraphicObject): Promise<void> {}
    async onMouseDownSelectedPointerObject(event: MouseEvent, object: SelectedPointerGraphicObject): Promise<void> {}
    async onMouseDownSelectedLinearObject(event: MouseEvent, object: SelectedLinearGraphicObject): Promise<void> {}
    async onContextMenuPointerObject(
        event: FederatedPointerEvent,
        pointerObject: PointerGraphicObject | SelectedPointerGraphicObject
    ): Promise<void> {}
    async onContextMenuLinearObject(event: FederatedPointerEvent, objectId: number): Promise<void> {}
    async onContextMenuNodeObject(event: FederatedPointerEvent, objectId: number, nodeIndex: number): Promise<void> {}
    async onContextMenuTextualObject(event: FederatedPointerEvent, objectId: number): Promise<void> {}
    async onContextMenuSelectedArea(event: FederatedPointerEvent): Promise<void> {}
    async onContextMenuPane(event: FederatedPointerEvent): Promise<void> {}
    async onSelectionAreaEnd(
        hitPointerObjects: PointerGraphicObject[],
        hitLinearObjects: LinearGraphicObject[],
        isDraw: boolean
    ): Promise<{
        selectedPointerObjects: SelectedPointerGraphicObject[];
        selectedLinearObjects: SelectedLinearGraphicObject[];
    }>{
        return {
            selectedLinearObjects:[],
            selectedPointerObjects:[],
        }
    }
}
