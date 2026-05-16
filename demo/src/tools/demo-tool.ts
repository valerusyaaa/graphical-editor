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

type XY = { x: number; y: number };

export class DemoTool extends BaseTool {
	private dragAbort?: AbortController;

	constructor() {
		super();
	}

	async onMouseDownPointerObject(
		event: FederatedPointerEvent,
		object: PointerGraphicObject,
	): Promise<void> {
		useEditorClipboardStore().setFocusedObject(object.idObject);
		const viewport = this.getViewport();
		if (!viewport) return;
		const store = useGraphicSchemeStore();
		const selected = store.selectedPointerObjs.find(
			(s) => s.idObject === object.idObject,
		);
		if (!selected) return;
		event.stopPropagation();
		const start = this.getWorldPoint(viewport, event);
		if (!start) return;

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
			},
			() => {
				store.selectionDragObjectId = null;
				object.refreshPosition(selected.position, viewport);
				useEditorClipboardStore().syncPointerGeometryFromScheme(
					object.idObject,
					object.position,
					object.offsets,
				);
				selected.position = {
					x: object.position.x,
					y: object.position.y,
				};
				selected.draw();
			},
		);
	}

	async onMouseDownLinearObject(
		event: FederatedPointerEvent,
		object: LinearGraphicObject,
		selectedNodeId?: string,
	): Promise<void> {
		useEditorClipboardStore().setFocusedObject(object.idObject);
		const viewport = this.getViewport();
		if (!viewport) return;
		const store = useGraphicSchemeStore();
		const selected = store.selectedLinearObjs.find(
			(s) => s.idObject === object.idObject,
		);
		if (!selected) return;
		event.stopPropagation();
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
					object.refreshPath(selected.points, viewport);
					useEditorClipboardStore().syncLinearGeometryFromScheme(
						object.idObject,
						object.points,
					);
					selected.points = object.points.map((p) => ({ ...p }));
					selected.draw();
				},
			);
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
			},
			() => {
				store.selectionDragObjectId = null;
				object.refreshPath(selected.points, viewport);
				useEditorClipboardStore().syncLinearGeometryFromScheme(
					object.idObject,
					object.points,
				);
				selected.points = object.points.map((p) => ({ ...p }));
				selected.draw();
			},
		);
	}

	async onMouseDownSelectedPointerObject(
		event: MouseEvent,
		object: SelectedPointerGraphicObject,
	): Promise<void> {
		useEditorClipboardStore().setFocusedObject(object.idObject);
		const viewport = this.getViewport();
		if (!viewport) return;
		const base = object.objectScheme;
		if (!base) return;
		const store = useGraphicSchemeStore();
		event.stopPropagation();
		const start = this.getWorldPoint(viewport, event);
		if (!start) return;

		store.selectionDragObjectId = object.idObject;

		this.startDrag(
			viewport,
			start,
			(delta) => {
				object.position = {
					x: object.position.x + delta.x,
					y: object.position.y + delta.y,
				};
				object.draw();
			},
			() => {
				store.selectionDragObjectId = null;
				base.refreshPosition(object.position, viewport);
				useEditorClipboardStore().syncPointerGeometryFromScheme(
					base.idObject,
					base.position,
					base.offsets,
				);
				object.position = {
					x: base.position.x,
					y: base.position.y,
				};
				object.draw();
			},
		);
	}

	async onMouseDownSelectedLinearObject(
		event: MouseEvent,
		object: SelectedLinearGraphicObject,
		selectedNodeId?: string,
	): Promise<void> {
		useEditorClipboardStore().setFocusedObject(object.idObject);
		const viewport = this.getViewport();
		if (!viewport) return;
		const scheme = object.objectScheme;
		if (!scheme) return;
		const store = useGraphicSchemeStore();
		const start = this.getWorldPoint(viewport, event);
		if (!start) return;

		if (selectedNodeId) {
			const nodeIndex = this.getNodeIndex(selectedNodeId);
			if (nodeIndex < 0 || nodeIndex >= object.points.length) return;
			store.selectionDragObjectId = object.idObject;
			event.stopPropagation();
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
					scheme.refreshPath(object.points, viewport);
					useEditorClipboardStore().syncLinearGeometryFromScheme(
						scheme.idObject,
						scheme.points,
					);
					object.points = scheme.points.map((p) => ({ ...p }));
					object.draw();
				},
			);
			return;
		}

		store.selectionDragObjectId = object.idObject;
		event.stopPropagation();
		this.startDrag(
			viewport,
			start,
			(delta) => {
				object.points = object.points.map((point) => ({
					x: point.x + delta.x,
					y: point.y + delta.y,
				}));
				object.draw();
			},
			() => {
				store.selectionDragObjectId = null;
				scheme.refreshPath(object.points, viewport);
				useEditorClipboardStore().syncLinearGeometryFromScheme(
					scheme.idObject,
					scheme.points,
				);
				object.points = scheme.points.map((p) => ({ ...p }));
				object.draw();
			},
		);
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

	/**
	 * Всегда переводим в мир схемы из **одних и тех же** экранных координат относительно canvas (как у DOM),
	 * иначе старт drag (событие Pixi) и move (document) дают разный масштаб/смещение — контур selection «улетает» от курсора.
	 */
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
