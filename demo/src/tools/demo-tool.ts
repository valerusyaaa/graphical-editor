import type { FederatedPointerEvent } from "pixi.js";
import type { Viewport } from "pixi-viewport";
import type {
	LinearGraphicObject,
	PointerGraphicObject,
	SelectedLinearGraphicObject,
	SelectedPointerGraphicObject,
    XYPosition,
} from "../../../packages/core/src";
import { useGraphicSchemeStore } from "../../../packages/core/src/model/stores";
import { ITool } from "../../../packages/core/src/api/itool";

export class DemoTool implements ITool {
	private dragAbort?: AbortController;
	async onMouseDownPointerObject(
		event: FederatedPointerEvent,
		object: PointerGraphicObject,
	): Promise<void> {

        /**
         * 1. Создание выделенного объекта отдельной функцией
         * 2. Регистрация событий на дивжение мыши (здесь перемещается выделеный объект)
         * 3. Регистрация на mouseup (здесь перемещается выделеный базовый объекта туда где находится выделеный)
         */
		const viewport = this.getViewport();
		if (!viewport) return;
		const start = this.getWorldPoint(viewport, this.toMouseLike(event));
		if (!start) return;

		this.startDrag(viewport, start, (delta) => {
			object.refreshPosition(
				{
					x: object.position.x + delta.x,
					y: object.position.y + delta.y,
				},
				viewport,
			);
		});
	}

	async onMouseDownLinearObject(
		event: FederatedPointerEvent,
		object: LinearGraphicObject,
		selectedNodeId?: string,
	): Promise<void> {
		const viewport = this.getViewport();
		if (!viewport) return;
		const start = this.getWorldPoint(viewport, this.toMouseLike(event));
		if (!start) return;

		if (selectedNodeId) {
			const nodeIndex = this.getNodeIndex(selectedNodeId);
			if (nodeIndex < 0 || nodeIndex >= object.points.length) return;
			this.startDrag(viewport, start, (delta) => {
				const points = object.points.map((point, index) =>
					index === nodeIndex
						? { x: point.x + delta.x, y: point.y + delta.y }
						: point,
				);
				object.refreshPath(points, viewport);
			});
			return;
		}

		this.startDrag(viewport, start, (delta) => {
			const points = object.points.map((point) => ({
				x: point.x + delta.x,
				y: point.y + delta.y,
			}));
			object.refreshPath(points, viewport);
		});
	}

	async onMouseDownSelectedPointerObject(
		event: MouseEvent,
		object: SelectedPointerGraphicObject,
	): Promise<void> {
        /**
         * 1. Регистрация событий на дивжение мыши (здесь перемещается выделеный объект)
         * 2. Регистрация на mouseup (здесь перемещается выделеный базовый объекта туда где находится выделеный)
         */
		const viewport = this.getViewport();
		if (!viewport) return;
		const start = this.getWorldPoint(viewport, event);
		if (!start) return;

		this.startDrag(viewport, start, (delta) => {
			object.position = {
				x: object.position.x + delta.x,
				y: object.position.y + delta.y,
			};
			object.draw();
			if (object.objectScheme) {
				object.objectScheme.refreshPosition(object.position, viewport);
			}
		});
	}

	async onMouseDownSelectedLinearObject(
		event: MouseEvent,
		object: SelectedLinearGraphicObject,
		selectedNodeId?: string,
	): Promise<void> {
		const viewport = this.getViewport();
		if (!viewport) return;
		const start = this.getWorldPoint(viewport, event);
		if (!start) return;

		if (selectedNodeId) {
			const nodeIndex = this.getNodeIndex(selectedNodeId);
			if (nodeIndex < 0 || nodeIndex >= object.points.length) return;
			this.startDrag(viewport, start, (delta) => {
				object.points = object.points.map((point, index) =>
					index === nodeIndex
						? { x: point.x + delta.x, y: point.y + delta.y }
						: point,
				);
				object.draw();
				if (object.objectScheme) {
					object.objectScheme.refreshPath(object.points, viewport);
				}
			});
			return;
		}

		this.startDrag(viewport, start, (delta) => {
			object.points = object.points.map((point) => ({
				x: point.x + delta.x,
				y: point.y + delta.y,
			}));
			object.draw();
			if (object.objectScheme) {
				object.objectScheme.refreshPath(object.points, viewport);
			}
		});
	}

	async onContextMenuPointerObject(
		event: FederatedPointerEvent,
		pointerObject: PointerGraphicObject | SelectedPointerGraphicObject,
	): Promise<void> {
		console.info("Pointer context menu", { id: pointerObject.idObject, event });
	}

	async onContextMenuLinearObject(
		event: FederatedPointerEvent,
		objectId: number,
	): Promise<void> {
		console.info("Linear context menu", { objectId, event });
	}

	async onContextMenuNodeObject(
		event: FederatedPointerEvent,
		objectId: number,
		nodeIndex: number,
	): Promise<void> {
		console.info("Node context menu", { objectId, nodeIndex, event });
	}

	async onContextMenuPane(event: FederatedPointerEvent): Promise<void> {
		console.info("Pane context menu", { event });
	}

	async onContextMenuTextualObject(
		event: FederatedPointerEvent,
		objectId: number,
	): Promise<void> {
		console.info("Textual context menu", { objectId, event });
	}

	async onContextMenuSelectedArea(
		event: FederatedPointerEvent,
	): Promise<void> {
		console.info("Selected area context menu", { event });
	}

	private getViewport(): Viewport | null {
		const store = useGraphicSchemeStore();
		if (!store.app) return null;
		return (store.app.stage.getChildByLabel("viewport") as Viewport) ?? null;
	}

	private startDrag(
		viewport: Viewport,
		start: XYPosition,
		onDelta: (delta: XYPosition) => void,
	): void {
		this.stopCurrentDrag();
		const abort = new AbortController();
		this.dragAbort = abort;
		viewport.plugins.pause("drag");

		let prev = start;
		document.addEventListener(
			"mousemove",
			(event) => {
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

	private getWorldPoint(viewport: Viewport, event: MouseEvent): XYPosition | null {
		const store = useGraphicSchemeStore();
		const appPosition = store.getPositionApp;
		return viewport.toWorld(
			event.clientX - appPosition.x,
			event.clientY - appPosition.y,
		);
	}

	private toMouseLike(event: FederatedPointerEvent): MouseEvent {
		return {
			clientX: event.clientX ?? event.globalX ?? 0,
			clientY: event.clientY ?? event.globalY ?? 0,
		} as MouseEvent;
	}

	private getNodeIndex(selectedNodeId: string): number {
		const parts = selectedNodeId.split("-");
		if (parts.length < 2) return -1;
		const parsed = Number(parts[parts.length - 1]);
		return Number.isNaN(parsed) ? -1 : parsed;
	}
}
