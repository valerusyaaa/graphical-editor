import type { FederatedPointerEvent } from "pixi.js";
import type { Viewport } from "pixi-viewport";
import { BaseTool } from "../../../packages/core/src";
import type {
	LinearGraphicObject,
	PointerGraphicObject,
	SelectedLinearGraphicObject,
	SelectedPointerGraphicObject,
} from "../../../packages/core/src/model";
import {
	useEditorClipboardStore,
	useGraphicSchemeStore,
} from "../../../packages/core/src/model/stores";
import {
	applyGroupDragDelta,
	buildGroupDragEntries,
	commitGroupDrag,
	dragTargetIds,
} from "./demo-tool-group-drag";
import { isSchemeObjectDragBlocked } from "../lib/schema-object-drag";

type XY = { x: number; y: number };

function isPrimaryPointerButton(
	event: FederatedPointerEvent | MouseEvent,
): boolean {
	const raw =
		"nativeEvent" in event && event.nativeEvent
			? (event.nativeEvent as MouseEvent)
			: (event as MouseEvent);
	if (typeof raw.button === "number") return raw.button === 0;
	return true;
}

export class DemoTool extends BaseTool {
	private dragAbort?: AbortController;

	constructor() {
		super();
	}

	/** Все закреплённые id при перетаскивании одного из группы. */
	private resolveGroupDragIds(primaryId: number): number[] {
		const store = useGraphicSchemeStore();
		const selected = store.selectedObjectIds;
		if (selected.length > 1 && selected.includes(primaryId)) {
			return [...selected];
		}
		return dragTargetIds(selected, primaryId);
	}

	private isDragBlockedForScheme(scheme: { data?: unknown }): boolean {
		return isSchemeObjectDragBlocked(
			scheme.data as Parameters<typeof isSchemeObjectDragBlocked>[0],
		);
	}

	private isDragBlockedForGroupIds(ids: number[]): boolean {
		const store = useGraphicSchemeStore();
		for (const id of ids) {
			const p = store.pointerObjs.find((o) => o.idObject === id);
			if (p && this.isDragBlockedForScheme(p)) return true;
			const l = store.linearObjs.find((o) => o.idObject === id);
			if (l && this.isDragBlockedForScheme(l)) return true;
		}
		return false;
	}

	private pinClickSelection(
		event: FederatedPointerEvent | MouseEvent,
		objectId: number,
	): boolean {
		const store = useGraphicSchemeStore();
		const additive =
			"shiftKey" in event ? Boolean(event.shiftKey) : false;
		store.selectObjectOnClick(objectId, { additive });
		return store.isObjectSelected(objectId);
	}

	private startGroupDrag(
		viewport: Viewport,
		start: XY,
		primaryId: number,
	): void {
		const store = useGraphicSchemeStore();
		const ids = this.resolveGroupDragIds(primaryId);
		if (this.isDragBlockedForGroupIds(ids)) return;
		const entries = buildGroupDragEntries(store, ids);
		if (!entries.length) return;

		store.selectionDragObjectId = primaryId;

		this.startDrag(
			viewport,
			start,
			(delta) => applyGroupDragDelta(entries, delta, viewport),
			() => {
				store.selectionDragObjectId = null;
				commitGroupDrag(viewport, entries);
			},
		);
	}

	async onMouseDownPointerObject(
		event: FederatedPointerEvent,
		object: PointerGraphicObject,
	): Promise<void> {
		if (!isPrimaryPointerButton(event)) return;
		event.stopPropagation();
		if (!this.pinClickSelection(event, object.idObject)) return;
		if (this.isDragBlockedForScheme(object)) return;
		useEditorClipboardStore().setFocusedObject(object.idObject);
		const viewport = this.getViewport();
		if (!viewport) return;
		const store = useGraphicSchemeStore();
		const selected = store.selectedPointerObjs.find(
			(s) => s.idObject === object.idObject,
		);
		if (!selected) return;
		const start = this.getWorldPoint(viewport, event);
		if (!start) return;

		if (this.resolveGroupDragIds(object.idObject).length > 1) {
			this.startGroupDrag(viewport, start, object.idObject);
			return;
		}

		selected.graphics.visible = true;
		selected.graphics.eventMode = "static";
		store.selectionDragObjectId = object.idObject;

		this.startDrag(
			viewport,
			start,
			(delta) => {
				selected.position = {
					x: selected.position.x + delta.x,
					y: selected.position.y + delta.y,
				};
				selected.draw();
				object.refreshPosition(selected.position, viewport);
			},
			() => {
				store.selectionDragObjectId = null;
				commitGroupDrag(viewport, [
					{ kind: "pointer", selected, scheme: object },
				]);
			},
		);
	}

	async onMouseDownLinearObject(
		event: FederatedPointerEvent,
		object: LinearGraphicObject,
		selectedNodeId?: string,
	): Promise<void> {
		if (!isPrimaryPointerButton(event)) return;
		event.stopPropagation();
		if (!this.pinClickSelection(event, object.idObject)) return;
		if (this.isDragBlockedForScheme(object)) return;
		useEditorClipboardStore().setFocusedObject(object.idObject);
		const viewport = this.getViewport();
		if (!viewport) return;
		const store = useGraphicSchemeStore();
		const selected = store.selectedLinearObjs.find(
			(s) => s.idObject === object.idObject,
		);
		if (!selected) return;
		const start = this.getWorldPoint(viewport, event);
		if (!start) return;

		selected.setOutlineVisible(true);

		if (selectedNodeId) {
			const nodeIndex = this.getNodeIndex(selectedNodeId);
			if (nodeIndex < 0 || nodeIndex >= selected.points.length) return;
			store.selectionDragObjectId = object.idObject;
			this.startDrag(
				viewport,
				start,
				(delta) => {
					selected.points = selected.points.map((point, index) =>
						index === nodeIndex
							? {
									x: point.x + delta.x,
									y: point.y + delta.y,
								}
							: point,
					);
					selected.draw();
				},
				() => {
					store.selectionDragObjectId = null;
					commitGroupDrag(viewport, [
						{ kind: "linear", selected, scheme: object },
					]);
				},
			);
			return;
		}

		if (this.resolveGroupDragIds(object.idObject).length > 1) {
			this.startGroupDrag(viewport, start, object.idObject);
			return;
		}

		store.selectionDragObjectId = object.idObject;
		this.startDrag(
			viewport,
			start,
			(delta) => {
				selected.points = selected.points.map((point) => ({
					x: point.x + delta.x,
					y: point.y + delta.y,
				}));
				selected.draw();
				object.refreshPath(selected.points, viewport);
			},
			() => {
				store.selectionDragObjectId = null;
				commitGroupDrag(viewport, [
					{ kind: "linear", selected, scheme: object },
				]);
			},
		);
	}

	async onMouseDownSelectedPointerObject(
		event: MouseEvent,
		object: SelectedPointerGraphicObject,
	): Promise<void> {
		if (!isPrimaryPointerButton(event)) return;
		event.stopPropagation();
		if (!this.pinClickSelection(event, object.idObject)) return;
		useEditorClipboardStore().setFocusedObject(object.idObject);
		const viewport = this.getViewport();
		if (!viewport) return;
		const base = object.objectScheme;
		if (!base) return;
		if (this.isDragBlockedForScheme(base)) return;
		const start = this.getWorldPoint(viewport, event);
		if (!start) return;

		this.startGroupDrag(viewport, start, object.idObject);
	}

	async onMouseDownSelectedLinearObject(
		event: MouseEvent,
		object: SelectedLinearGraphicObject,
		selectedNodeId?: string,
	): Promise<void> {
		if (!isPrimaryPointerButton(event)) return;
		event.stopPropagation();
		if (!this.pinClickSelection(event, object.idObject)) return;
		useEditorClipboardStore().setFocusedObject(object.idObject);
		const viewport = this.getViewport();
		if (!viewport) return;
		const scheme = object.objectScheme;
		if (!scheme) return;
		if (this.isDragBlockedForScheme(scheme)) return;
		const store = useGraphicSchemeStore();
		const start = this.getWorldPoint(viewport, event);

		if (selectedNodeId) {
			const nodeIndex = this.getNodeIndex(selectedNodeId);
			if (nodeIndex < 0 || nodeIndex >= object.points.length) return;
			if (!start) return;
			store.selectionDragObjectId = object.idObject;
			this.startDrag(
				viewport,
				start,
				(delta) => {
					object.points = object.points.map((point, index) =>
						index === nodeIndex
							? { x: point.x + delta.x, y: point.y + delta.y }
							: point,
					);
					object.draw();
				},
				() => {
					store.selectionDragObjectId = null;
					commitGroupDrag(viewport, [
						{ kind: "linear", selected: object, scheme },
					]);
				},
			);
			return;
		}

		if (!start) return;
		this.startGroupDrag(viewport, start, object.idObject);
	}

	private getViewport(): Viewport | null {
		const store = useGraphicSchemeStore();
		if (!store.app) return null;
		return (store.app.stage.getChildByLabel("viewport") as Viewport) ?? null;
	}

	private startDrag(
		viewport: Viewport,
		start: XY,
		onDelta: (delta: XY) => void,
		onEnd?: () => void,
	): void {
		this.stopCurrentDrag();
		const abort = new AbortController();
		this.dragAbort = abort;
		viewport.plugins.pause("drag");

		let prev = start;
		document.addEventListener(
			"mousemove",
			(event: MouseEvent) => {
				const next = this.getWorldPoint(viewport, event);
				if (!next) return;
				const delta = { x: next.x - prev.x, y: next.y - prev.y };
				if (delta.x === 0 && delta.y === 0) return;
				onDelta(delta);
				prev = next;
			},
			{ signal: abort.signal },
		);

		document.addEventListener(
			"mouseup",
			() => {
				onEnd?.();
				this.stopCurrentDrag();
				viewport.plugins.resume("drag");
			},
			{ once: true, signal: abort.signal },
		);
	}

	private stopCurrentDrag(): void {
		if (this.dragAbort) {
			this.dragAbort.abort();
			this.dragAbort = undefined;
		}
	}

	private getWorldPoint(
		viewport: Viewport,
		event: MouseEvent | FederatedPointerEvent,
	): XY | null {
		const store = useGraphicSchemeStore();
		const app = store.app;
		if (!app?.canvas) return null;
		const r = app.canvas.getBoundingClientRect();
		const local = this.getCanvasLocalFromPointerEvent(event, r);
		if (!local) return null;
		return viewport.toWorld(local.x, local.y);
	}

	private getCanvasLocalFromPointerEvent(
		event: MouseEvent | FederatedPointerEvent,
		canvasRect: DOMRect,
	): XY | null {
		const fromDom = (clientX: number, clientY: number) => ({
			x: clientX - canvasRect.left,
			y: clientY - canvasRect.top,
		});
		if ("nativeEvent" in event && event.nativeEvent) {
			const n = event.nativeEvent as MouseEvent | PointerEvent;
			if (typeof n.clientX === "number" && typeof n.clientY === "number") {
				return fromDom(n.clientX, n.clientY);
			}
		}
		const me = event as MouseEvent;
		if (typeof me.clientX === "number" && typeof me.clientY === "number") {
			return fromDom(me.clientX, me.clientY);
		}
		const fe = event as FederatedPointerEvent;
		if (fe.client && typeof fe.client.x === "number") {
			return { x: fe.client.x, y: fe.client.y };
		}
		return null;
	}

	private getNodeIndex(selectedNodeId: string): number {
		const parts = selectedNodeId.split("-");
		if (parts.length < 2) return -1;
		const parsed = Number(parts[parts.length - 1]);
		return Number.isNaN(parsed) ? -1 : parsed;
	}
}
