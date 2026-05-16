import type { FederatedPointerEvent } from "pixi.js";
import type {
	LinearGraphicObject,
	PointerGraphicObject,
	SelectedLinearGraphicObject,
	SelectedPointerGraphicObject,
} from "../schema";
import type { ITool } from "../../api/itool";
import { useEditorClipboardStore } from "../stores/editor-clipboard.store";

function ctxClient(ev: FederatedPointerEvent): { x: number; y: number } {
	return {
		x: ev.clientX ?? ev.globalX ?? 0,
		y: ev.clientY ?? ev.globalY ?? 0,
	};
}

function preventBrowserMenu(ev: FederatedPointerEvent) {
	const n = ev.nativeEvent as unknown;
	if (
		n &&
		typeof n === "object" &&
		"preventDefault" in n &&
		typeof (n as { preventDefault: unknown }).preventDefault === "function"
	) {
		(n as { preventDefault: () => void }).preventDefault();
	}
}

export class BaseTool implements ITool {
	contextMenu: unknown;
	itemsContextMenu: readonly unknown[];
	constructor() {
		this.contextMenu = undefined;
		this.itemsContextMenu = [];
	}
	async onMouseDownPointerObject(
		_event: FederatedPointerEvent,
		_object: PointerGraphicObject,
	): Promise<void> {}
	async onMouseDownLinearObject(
		_event: FederatedPointerEvent,
		_object: LinearGraphicObject,
		_selectedNodeId?: string,
	): Promise<void> {}
	async onMouseDownSelectedPointerObject(
		_event: MouseEvent,
		_object: SelectedPointerGraphicObject,
	): Promise<void> {}
	async onMouseDownSelectedLinearObject(
		_event: MouseEvent,
		_object: SelectedLinearGraphicObject,
		_selectedNodeId?: string,
	): Promise<void> {}
	async onContextMenuPointerObject(
		event: FederatedPointerEvent,
		pointerObject: PointerGraphicObject | SelectedPointerGraphicObject,
	): Promise<void> {
		preventBrowserMenu(event);
		const { x, y } = ctxClient(event);
		useEditorClipboardStore().openMenuForObject(
			x,
			y,
			pointerObject.idObject,
			"pointer",
		);
	}
	async onContextMenuLinearObject(
		event: FederatedPointerEvent,
		objectId: number,
	): Promise<void> {
		preventBrowserMenu(event);
		const { x, y } = ctxClient(event);
		useEditorClipboardStore().openMenuForObject(x, y, objectId, "linear");
	}
	async onContextMenuNodeObject(
		event: FederatedPointerEvent,
		objectId: number,
		_nodeIndex: number,
	): Promise<void> {
		await this.onContextMenuLinearObject(event, objectId);
	}
	async onContextMenuTextualObject(
		event: FederatedPointerEvent,
		_objectId: number,
	): Promise<void> {
		preventBrowserMenu(event);
		const { x, y } = ctxClient(event);
		useEditorClipboardStore().openMenuForPane(x, y);
	}
	async onContextMenuSelectedArea(event: FederatedPointerEvent): Promise<void> {
		preventBrowserMenu(event);
		const { x, y } = ctxClient(event);
		useEditorClipboardStore().openMenuForPane(x, y);
	}
	async onContextMenuPane(event: FederatedPointerEvent): Promise<void> {
		preventBrowserMenu(event);
		const { x, y } = ctxClient(event);
		useEditorClipboardStore().openMenuForPane(x, y);
	}
}
