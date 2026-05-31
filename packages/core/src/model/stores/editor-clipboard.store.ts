import { defineStore } from "pinia";
import type { GraphicObjectDto, ObjectBaseData } from "../../api/types";
import type { ObjectType, XYPosition } from "../schema/types";
import { useGraphicSchemeStore } from "./graphic-scheme.store";
import {
	type ClipboardBundle,
	cloneItemsForPaste,
	deepCloneDto,
	selectionAnchor,
} from "./selection-clipboard";

type PointerSchemeDragSync = {
	kind: "pointer";
	id: number;
	schemePosition: XYPosition;
	offsets: { left: number; top: number };
};

type LinearSchemeDragSync = {
	kind: "linear";
	id: number;
	points: XYPosition[];
};

export type SchemeGeometryDragSync = PointerSchemeDragSync | LinearSchemeDragSync;

export type EditorGraphObjectType = ObjectType;

export type EditorClipboardBridge = {
	getObjects(): GraphicObjectDto<ObjectBaseData>[];
	setObjects(objects: GraphicObjectDto<ObjectBaseData>[]): void;
	/** Клиентские координаты окна → мир схемы */
	clientToWorld(clientX: number, clientY: number): { x: number; y: number } | null;
	/** Центр видимой области viewport в мировых координатах (для Ctrl+V) */
	getViewportCenterWorld(): { x: number; y: number } | null;
	isObjectFixed?(id: number): boolean;
	setObjectFixed?(id: number, fixed: boolean): void;
	setObjectsFixed?(ids: number[], fixed: boolean): void;
	/** Открыть/закрыть кран (только Valve): обновляет `Состояние` и перерисовку. */
	setValveOpen?(ids: number[], open: boolean): void;
	isValveOpen?(id: number): boolean;
	/** Показать/скрыть монитор свойств для объекта схемы. */
	toggleMonitorForSource?(sourceId: number): void;
	canShowMonitorFor?(id: number): boolean;
	/** Открыть окно графиков с вкладками для выделенных кранов/труб. */
	openChartsForSchemeObjectIds?(schemeIds: number[]): void;
};

export type EditorContextMenuState = {
	visible: boolean;
	screenX: number;
	screenY: number;
	targetId: number | null;
	targetGraph: EditorGraphObjectType | null;
	isPane: boolean;
	/** Снимок выделения на момент открытия меню (для копирования/вырезания группы). */
	operationIds: number[];
	/** Точка вставки в мировых координатах (ПКМ по холсту). */
	pasteWorld: XYPosition | null;
};

const MAX_UNDO = 40;

function cloneObjects(
	list: GraphicObjectDto<ObjectBaseData>[],
): GraphicObjectDto<ObjectBaseData>[] {
	return deepCloneDto(list);
}

export const useEditorClipboardStore = defineStore("editor-clipboard", {
	state: () => ({
		bridge: null as EditorClipboardBridge | null,
		clipboardBundle: null as ClipboardBundle | null,
		undoStack: [] as GraphicObjectDto<ObjectBaseData>[][],
		/** Последний объект, по которому был mousedown (для Ctrl+C и т.д.) */
		focusedObjectId: null as number | null,
		/** Курсор над схемой (мир) — для Ctrl+V. */
		lastCursorWorld: null as XYPosition | null,
		/** ПКМ по схеме / клик по пустому месту — запасная точка вставки. */
		pasteTargetWorld: null as XYPosition | null,
		menu: {
			visible: false,
			screenX: 0,
			screenY: 0,
			targetId: null,
			targetGraph: null,
			isPane: false,
		} as EditorContextMenuState,
	}),
	getters: {
		canPaste(): boolean {
			return (this.clipboardBundle?.items.length ?? 0) > 0;
		},
	},
	actions: {
		registerBridge(bridge: EditorClipboardBridge) {
			this.bridge = bridge;
		},
		unregisterBridge() {
			this.bridge = null;
			this.closeMenu();
			this.clipboardBundle = null;
			this.undoStack = [];
			this.focusedObjectId = null;
			this.lastCursorWorld = null;
			this.pasteTargetWorld = null;
		},

		setLastCursorWorld(world: XYPosition | null) {
			this.lastCursorWorld = world;
		},

		setPasteTargetFromClient(clientX: number, clientY: number) {
			const b = this.bridge;
			if (!b) return;
			const world = b.clientToWorld(clientX, clientY);
			if (world) this.pasteTargetWorld = world;
		},

		resolvePasteWorld(): XYPosition | null {
			const b = this.bridge;
			if (!b) return null;
			return (
				this.lastCursorWorld ??
				this.pasteTargetWorld ??
				b.getViewportCenterWorld()
			);
		},

		isObjectFixed(id: number): boolean {
			return this.bridge?.isObjectFixed?.(id) ?? false;
		},

		setSelectionFixed(ids: number[], fixed: boolean) {
			if (ids.length === 0) return;
			this.pushUndo();
			const b = this.bridge;
			if (b?.setObjectsFixed) {
				b.setObjectsFixed(ids, fixed);
			} else {
				for (const id of ids) {
					b?.setObjectFixed?.(id, fixed);
				}
			}
			this.closeMenu();
		},

		fixMenuTarget() {
			const ids = this.resolveOperationIds();
			this.setSelectionFixed(ids, true);
		},

		unfixMenuTarget() {
			const ids = this.resolveOperationIds();
			this.setSelectionFixed(ids, false);
		},

		setMenuTargetValveOpen(open: boolean) {
			const id = this.menu.targetId;
			if (id == null || this.menu.isPane) return;
			const b = this.bridge;
			if (!b?.setValveOpen) return;
			this.pushUndo();
			b.setValveOpen([id], open);
		},

		setFocusedObject(id: number | null) {
			this.focusedObjectId = id;
		},

		/**
		 * Обновляет `position` в v-model после drag — иначе при следующем изменении
		 * `objects` (например drop с палитры) watch пересоздаст схему из устаревшего DTO.
		 * `schemePosition` — как `PointerGraphicObject.position` (после getComputedPosition).
		 */
		syncPointerGeometryFromScheme(
			id: number,
			schemePosition: XYPosition,
			offsets: { left: number; top: number },
		) {
			this.batchSyncGeometryFromScheme([
				{ kind: "pointer", id, schemePosition, offsets },
			]);
		},

		/** Обновляет `points` линейного объекта в v-model после drag / редактирования узлов. */
		syncLinearGeometryFromScheme(id: number, points: XYPosition[]) {
			this.batchSyncGeometryFromScheme([
				{ kind: "linear", id, points },
			]);
		},

		/**
		 * Одно обновление v-model после группового drag — иначе промежуточные setObjects
		 * перерисовывают схему и сбрасывают ещё не сохранённые объекты.
		 */
		batchSyncGeometryFromScheme(updates: SchemeGeometryDragSync[]) {
			const b = this.bridge;
			if (!b || updates.length === 0) return;
			const objs = b.getObjects().slice();
			let changed = false;
			for (const u of updates) {
				const idx = objs.findIndex((o) => o.id === u.id);
				if (idx < 0) continue;
				const cur = objs[idx];
				if (u.kind === "pointer") {
					if (cur.graphObjectType !== "pointer" || !cur.position) continue;
					const dtoPos: XYPosition = {
						x: u.schemePosition.x + u.offsets.left,
						y: u.schemePosition.y + u.offsets.top,
					};
					objs[idx] = { ...cur, position: { ...dtoPos } };
					changed = true;
				} else if (u.kind === "linear") {
					if (cur.graphObjectType !== "linear") continue;
					objs[idx] = {
						...cur,
						points: u.points.map((p) => ({ ...p })),
					};
					changed = true;
				}
			}
			if (changed) b.setObjects(objs);
		},

		closeMenu() {
			if (!this.menu.visible) return;
			this.menu = { ...this.menu, visible: false };
		},

		openMenuForObject(
			screenX: number,
			screenY: number,
			targetId: number,
			targetGraph: EditorGraphObjectType,
		) {
			const b = this.bridge;
			const gs = useGraphicSchemeStore();
			const operationIds =
				gs.selectedObjectIds.includes(targetId) &&
				gs.selectedObjectIds.length > 0
					? [...gs.selectedObjectIds]
					: [targetId];
			this.focusedObjectId = targetId;
			const world = b?.clientToWorld(screenX, screenY) ?? null;
			if (world) this.pasteTargetWorld = world;
			this.menu = {
				visible: true,
				screenX,
				screenY,
				targetId,
				targetGraph,
				isPane: false,
				operationIds,
				pasteWorld: world,
			};
		},

		openMenuForPane(
			clientX: number,
			clientY: number,
			pasteWorld?: XYPosition | null,
		) {
			const gs = useGraphicSchemeStore();
			const b = this.bridge;
			const world =
				pasteWorld ??
				b?.clientToWorld(clientX, clientY) ??
				null;
			this.focusedObjectId = null;
			if (world) this.pasteTargetWorld = world;
			this.menu = {
				visible: true,
				screenX: clientX,
				screenY: clientY,
				targetId: null,
				targetGraph: null,
				isPane: true,
				operationIds: [...gs.selectedObjectIds],
				pasteWorld: world,
			};
		},

		pushUndo() {
			const b = this.bridge;
			if (!b) return;
			this.undoStack.push(cloneObjects(b.getObjects()));
			if (this.undoStack.length > MAX_UNDO) this.undoStack.shift();
		},

		undo() {
			const b = this.bridge;
			if (!b || this.undoStack.length === 0) return;
			const prev = this.undoStack.pop()!;
			b.setObjects(prev);
			this.closeMenu();
		},

		resolveOperationIds(): number[] {
			if (this.menu.visible && this.menu.operationIds.length > 0) {
				return [...this.menu.operationIds];
			}
			const gs = useGraphicSchemeStore();
			if (gs.selectedObjectIds.length > 0) {
				return [...gs.selectedObjectIds];
			}
			const id =
				this.menu.visible && !this.menu.isPane && this.menu.targetId != null
					? this.menu.targetId
					: this.focusedObjectId;
			return id != null ? [id] : [];
		},

		copySelection(ids: number[]) {
			const b = this.bridge;
			if (!b || ids.length === 0) return;
			const objs = b.getObjects();
			const items = ids
				.map((id) => objs.find((o) => o.id === id))
				.filter((o): o is GraphicObjectDto<ObjectBaseData> => o != null)
				.map((o) => deepCloneDto(o));
			if (!items.length) return;
			this.clipboardBundle = {
				items,
				anchor: selectionAnchor(objs, ids),
			};
		},

		copyObject(id: number) {
			this.copySelection([id]);
		},

		copyFocusedOrMenuTarget() {
			const ids = this.resolveOperationIds();
			if (!ids.length) return;
			this.copySelection(ids);
		},

		cutSelection(ids: number[]) {
			const b = this.bridge;
			if (!b || ids.length === 0) return;
			this.copySelection(ids);
			this.pushUndo();
			const drop = new Set(ids);
			b.setObjects(b.getObjects().filter((o) => !drop.has(o.id)));
			useGraphicSchemeStore().clearSelectedObjects();
			this.closeMenu();
		},

		cutFocusedOrMenuTarget() {
			const ids = this.resolveOperationIds();
			if (!ids.length) return;
			this.cutSelection(ids);
		},

		deleteFocusedOrMenuTarget() {
			const gs = useGraphicSchemeStore();
			if (gs.selectedObjectIds.length > 0) {
				this.deleteObjects([...gs.selectedObjectIds]);
				return;
			}
			const id =
				this.menu.visible && !this.menu.isPane && this.menu.targetId != null
					? this.menu.targetId
					: this.focusedObjectId;
			if (id == null) return;
			this.deleteObject(id);
		},

		deleteObjects(ids: number[]) {
			const b = this.bridge;
			if (!b || ids.length === 0) return;
			const drop = new Set(ids);
			const objs = b.getObjects();
			if (!objs.some((o) => drop.has(o.id))) return;
			this.pushUndo();
			b.setObjects(objs.filter((o) => !drop.has(o.id)));
			useGraphicSchemeStore().clearSelectedObjects();
			this.closeMenu();
		},

		rotateObject90(id: number) {
			const b = this.bridge;
			if (!b) return;
			const objs = b.getObjects();
			const idx = objs.findIndex((o) => o.id === id);
			if (idx < 0) return;
			const cur = objs[idx];
			if (cur.graphObjectType !== "pointer") return;
			this.pushUndo();
			const nextAngle = ((cur.rotateAngle ?? 0) + 90) % 360;
			const next = objs.slice();
			next[idx] = { ...cur, rotateAngle: nextAngle };
			b.setObjects(next);
			this.closeMenu();
		},

		rotateMenuTarget90() {
			const id =
				this.menu.visible && !this.menu.isPane && this.menu.targetId != null
					? this.menu.targetId
					: this.focusedObjectId;
			if (id == null) return;
			this.rotateObject90(id);
		},

		selectAll() {
			useGraphicSchemeStore().selectAllObjects();
			this.closeMenu();
		},

		bringFocusedOrMenuTargetToFront() {
			const id =
				this.menu.visible && !this.menu.isPane && this.menu.targetId != null
					? this.menu.targetId
					: this.focusedObjectId;
			if (id == null) return;
			this.bringToFront(id);
		},

		sendFocusedOrMenuTargetToBack() {
			const id =
				this.menu.visible && !this.menu.isPane && this.menu.targetId != null
					? this.menu.targetId
					: this.focusedObjectId;
			if (id == null) return;
			this.sendToBack(id);
		},

		/** Ctrl+V: вставка у курсора, иначе у последнего ПКМ / центра viewport. */
		pasteFromKeyboard() {
			const world = this.resolvePasteWorld();
			this.applyPaste(world);
		},

		cutObject(id: number) {
			this.cutSelection([id]);
		},

		deleteObject(id: number) {
			const b = this.bridge;
			if (!b) return;
			if (!b.getObjects().some((x) => x.id === id)) return;
			this.pushUndo();
			b.setObjects(b.getObjects().filter((x) => x.id !== id));
			this.closeMenu();
		},

		bringToFront(id: number) {
			const b = this.bridge;
			if (!b) return;
			const objs = b.getObjects();
			const idx = objs.findIndex((o) => o.id === id);
			if (idx < 0) return;
			this.pushUndo();
			const item = objs[idx];
			const rest = objs.filter((_, i) => i !== idx);
			b.setObjects([...rest, item]);
			this.closeMenu();
		},

		sendToBack(id: number) {
			const b = this.bridge;
			if (!b) return;
			const objs = b.getObjects();
			const idx = objs.findIndex((o) => o.id === id);
			if (idx < 0) return;
			this.pushUndo();
			const item = objs[idx];
			const rest = objs.filter((_, i) => i !== idx);
			b.setObjects([item, ...rest]);
			this.closeMenu();
		},

		pasteAtScreen(screenX: number, screenY: number) {
			const b = this.bridge;
			if (!b || !this.clipboardBundle?.items.length) return;
			const world =
				b.clientToWorld(screenX, screenY) ??
				this.menu.pasteWorld ??
				this.resolvePasteWorld();
			this.applyPaste(world);
		},

		applyPaste(world: { x: number; y: number } | null) {
			const b = this.bridge;
			const bundle = this.clipboardBundle;
			if (!b || !bundle?.items.length) return;

			const objs = b.getObjects();
			const offset = world
				? {
						x: world.x - bundle.anchor.x,
						y: world.y - bundle.anchor.y,
					}
				: { x: 16, y: 16 };

			const pasted = cloneItemsForPaste(bundle.items, objs, offset);

			this.pushUndo();
			b.setObjects([...objs, ...pasted]);
			useGraphicSchemeStore().setSelectedObjectIds(pasted.map((p) => p.id));
			this.closeMenu();
		},
	},
});
