import type { FederatedPointerEvent } from "pixi.js";
import type {
    LinearGraphicObject,
    PointerGraphicObject,
    SelectedLinearGraphicObject,
    SelectedPointerGraphicObject,
    SelectedTextualGraphicObject,
    TextualGraphicObject,
} from "../schema";
import type { MenuItem } from "primevue/menuitem";

export interface ITool {
    contextMenu: any;
    itemsContextMenu: MenuItem[];
    onMouseDownPointerObject(event: FederatedPointerEvent, object: PointerGraphicObject): Promise<void>;
    onMouseDownLinearObject(
        event: FederatedPointerEvent,
        object: LinearGraphicObject,
        selectedNodeId?: string
    ): Promise<void>;
    onMouseDownTextualObject(event: MouseEvent, object: TextualGraphicObject): Promise<void>;
    onMouseDownSelectedPointerObject(event: MouseEvent, object: SelectedPointerGraphicObject): Promise<void>;
    onMouseDownSelectedLinearObject(
        event: MouseEvent,
        object: SelectedLinearGraphicObject,
        selectedNodeId?: string
    ): Promise<void>;
    onMouseDownSelectedTextualObject(event: MouseEvent, object: SelectedTextualGraphicObject): Promise<void>;
    onMouseDownSelectedArea(event: FederatedPointerEvent): Promise<void>;
    onSelectionAreaEnd(
        hitPointerObjects: PointerGraphicObject[],
        hitLinearObjects: LinearGraphicObject[],
        isDraw: boolean
    ): Promise<{
        selectedPointerObjects: SelectedPointerGraphicObject[];
        selectedLinearObjects: SelectedLinearGraphicObject[];
    }>;
    onContextMenuPointerObject(
        event: FederatedPointerEvent,
        pointerObject: PointerGraphicObject | SelectedPointerGraphicObject
    ): Promise<void>;
    onContextMenuLinearObject(event: FederatedPointerEvent, objectId: number): Promise<void>;
    onContextMenuTextualObject(event: FederatedPointerEvent, objectId: number): Promise<void>;
    onContextMenuNodeObject(event: FederatedPointerEvent, objectId: number, nodeIndex: number): Promise<void>;
    onContextMenuPane(event: FederatedPointerEvent): Promise<void>;
    onContextMenuSelectedArea(event: FederatedPointerEvent): Promise<void>;
    useHotKeys(ref: Ref): void;
}
