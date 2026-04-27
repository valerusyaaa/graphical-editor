import type { FederatedPointerEvent } from "pixi.js";
import type {
	LinearGraphicObject,
	PointerGraphicObject,
	SelectedLinearGraphicObject,
	SelectedPointerGraphicObject,
} from "../model/schema";

export interface ITool {
	onMouseDownPointerObject(
		event: FederatedPointerEvent,
		object: PointerGraphicObject,
	): Promise<void>;
	onMouseDownLinearObject(
		event: FederatedPointerEvent,
		object: LinearGraphicObject,
		selectedNodeId?: string,
	): Promise<void>;
	onMouseDownSelectedPointerObject(
		event: MouseEvent,
		object: SelectedPointerGraphicObject,
	): Promise<void>;
	onMouseDownSelectedLinearObject(
		event: MouseEvent,
		object: SelectedLinearGraphicObject,
		selectedNodeId?: string,
	): Promise<void>;
	onContextMenuPointerObject(
		event: FederatedPointerEvent,
		pointerObject:
			| PointerGraphicObject
			| SelectedPointerGraphicObject,
	): Promise<void>;
	onContextMenuLinearObject(
		event: FederatedPointerEvent,
		objectId: number,
	): Promise<void>;
	onContextMenuNodeObject(
		event: FederatedPointerEvent,
		objectId: number,
		nodeIndex: number,
	): Promise<void>;
	onContextMenuPane(event: FederatedPointerEvent): Promise<void>;
}
