import type { FederatedPointerEvent } from "pixi.js";
import type {
	LinearGraphicObject,
	PointerGraphicObject,
	SelectedLinearGraphicObject,
	SelectedPointerGraphicObject,
} from "../schema";
import type { ITool } from "../../api/itool";
import { useEditorClipboardStore } from "../stores/editor-clipboard.store";
import { useGraphicSchemeStore } from "../stores/graphic-scheme.store";

function ctxClient(ev: FederatedPointerEvent): { x: number; y: number } {
	return {
		x: ev.clientX ?? ev.globalX ?? 0,
		y: ev.clientY ?? ev.globalY ?? 0,
	};
}

/** Мировые координаты из Pixi (viewport), если уже посчитаны событием. */
function ctxWorld(
	ev: FederatedPointerEvent,
): { x: number; y: number } | null {
	const w = (ev as FederatedPointerEvent & { world?: { x: number; y: number } })
		.world;
	if (w && Number.isFinite(w.x) && Number.isFinite(w.y)) {
		return { x: w.x, y: w.y };
	}
	return null;
}

function isPrimaryPointerButton(ev: FederatedPointerEvent): boolean {
	const raw = ev.nativeEvent as MouseEvent | undefined;
	if (raw && typeof raw.button === "number") return raw.button === 0;
	if (typeof ev.button === "number") return ev.button === 0;
	return true;
}

function preventBrowserMenu(ev: FederatedPointerEvent) {
	ev.stopPropagation();
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

	/** Закрепить выделение на объекте при ПКМ (контур не пропадает после меню). */
	protected pinSelectionForContextMenu(objectId: number): void {
		useGraphicSchemeStore().selectObjectOnClick(objectId, { additive: false });
	}
	async onMouseDownPointerObject(
		event: FederatedPointerEvent,
		_object: PointerGraphicObject,
	): Promise<void> {
		if (!isPrimaryPointerButton(event)) return;
		useEditorClipboardStore().closeMenu();
	}
	async onMouseDownLinearObject(
		event: FederatedPointerEvent,
		_object: LinearGraphicObject,
		_selectedNodeId?: string,
	): Promise<void> {
		if (!isPrimaryPointerButton(event)) return;
		useEditorClipboardStore().closeMenu();
	}
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
		this.pinSelectionForContextMenu(pointerObject.idObject);
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
		this.pinSelectionForContextMenu(objectId);
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
		useEditorClipboardStore().openMenuForPane(x, y, ctxWorld(event));
	}
	async onContextMenuSelectedArea(event: FederatedPointerEvent): Promise<void> {
		preventBrowserMenu(event);
		const { x, y } = ctxClient(event);
		useEditorClipboardStore().openMenuForPane(x, y, ctxWorld(event));
	}
	async onContextMenuPane(event: FederatedPointerEvent): Promise<void> {
		preventBrowserMenu(event);
		const { x, y } = ctxClient(event);
		useEditorClipboardStore().openMenuForPane(x, y, ctxWorld(event));
	}
}
