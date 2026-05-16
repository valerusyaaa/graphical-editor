import { defineStore } from "pinia";
import type { GraphicObjectDto, ObjectBaseData } from "../../api/types";
import type { ObjectType, XYPosition } from "../schema/types";

export type EditorGraphObjectType = ObjectType;

export type EditorClipboardBridge = {
	getObjects(): GraphicObjectDto<ObjectBaseData>[];
	setObjects(objects: GraphicObjectDto<ObjectBaseData>[]): void;
	/** Клиентские координаты окна → мир схемы */
	clientToWorld(clientX: number, clientY: number): { x: number; y: number } | null;
	/** Центр видимой области viewport в мировых координатах (для Ctrl+V) */
	getViewportCenterWorld(): { x: number; y: number } | null;
};

export type EditorContextMenuState = {
	visible: boolean;
	screenX: number;
	screenY: number;
	targetId: number | null;
	targetGraph: EditorGraphObjectType | null;
	isPane: boolean;
};

const MAX_UNDO = 40;

function cloneObjects(
	list: GraphicObjectDto<ObjectBaseData>[],
): GraphicObjectDto<ObjectBaseData>[] {
	return structuredClone(list);
}

function nextObjectId(
	list: GraphicObjectDto<ObjectBaseData>[],
): number {
	return list.reduce((m, o) => Math.max(m, o.id), 0) + 1;
}

export const useEditorClipboardStore = defineStore("editor-clipboard", {
	state: () => ({
		bridge: null as EditorClipboardBridge | null,
		clipboard: null as GraphicObjectDto<ObjectBaseData> | null,
		undoStack: [] as GraphicObjectDto<ObjectBaseData>[][],
		/** Последний объект, по которому был mousedown (для Ctrl+C и т.д.) */
		focusedObjectId: null as number | null,
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
			return this.clipboard !== null;
		},
	},
	actions: {
		registerBridge(bridge: EditorClipboardBridge) {
			this.bridge = bridge;
		},
		unregisterBridge() {
			this.bridge = null;
			this.closeMenu();
			this.clipboard = null;
			this.undoStack = [];
			this.focusedObjectId = null;
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
			const b = this.bridge;
			if (!b) return;
			const objs = b.getObjects();
			const idx = objs.findIndex((o) => o.id === id);
			if (idx < 0) return;
			const cur = objs[idx];
			if (cur.graphObjectType !== "pointer" || !cur.position) return;
			const dtoPos: XYPosition = {
				x: schemePosition.x + offsets.left,
				y: schemePosition.y + offsets.top,
			};
			const next = objs.slice();
			next[idx] = { ...cur, position: { ...dtoPos } };
			b.setObjects(next);
		},

		/** Обновляет `points` линейного объекта в v-model после drag / редактирования узлов. */
		syncLinearGeometryFromScheme(id: number, points: XYPosition[]) {
			const b = this.bridge;
			if (!b) return;
			const objs = b.getObjects();
			const idx = objs.findIndex((o) => o.id === id);
			if (idx < 0) return;
			const cur = objs[idx];
			if (cur.graphObjectType !== "linear" || !cur.points?.length) return;
			const next = objs.slice();
			next[idx] = {
				...cur,
				points: points.map((p) => ({ ...p })),
			};
			b.setObjects(next);
		},

		closeMenu() {
			this.menu.visible = false;
		},

		openMenuForObject(
			screenX: number,
			screenY: number,
			targetId: number,
			targetGraph: EditorGraphObjectType,
		) {
			this.focusedObjectId = targetId;
			this.menu = {
				visible: true,
				screenX,
				screenY,
				targetId,
				targetGraph,
				isPane: false,
			};
		},

		openMenuForPane(clientX: number, clientY: number) {
			this.focusedObjectId = null;
			this.menu = {
				visible: true,
				screenX: clientX,
				screenY: clientY,
				targetId: null,
				targetGraph: null,
				isPane: true,
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

		copyObject(id: number) {
			const b = this.bridge;
			if (!b) return;
			const o = b.getObjects().find((x) => x.id === id);
			if (o) this.clipboard = structuredClone(o);
		},

		copyFocusedOrMenuTarget() {
			const id =
				this.menu.visible && !this.menu.isPane && this.menu.targetId != null
					? this.menu.targetId
					: this.focusedObjectId;
			if (id == null) return;
			this.copyObject(id);
		},

		cutFocusedOrMenuTarget() {
			const id =
				this.menu.visible && !this.menu.isPane && this.menu.targetId != null
					? this.menu.targetId
					: this.focusedObjectId;
			if (id == null) return;
			this.cutObject(id);
		},

		deleteFocusedOrMenuTarget() {
			const id =
				this.menu.visible && !this.menu.isPane && this.menu.targetId != null
					? this.menu.targetId
					: this.focusedObjectId;
			if (id == null) return;
			this.deleteObject(id);
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

		/** Ctrl+V: вставка в центр видимой области (ПКМ «Вставить» — отдельно `pasteAtScreen`). */
		pasteFromKeyboard() {
			this.pasteAtViewportCenter();
		},

		cutObject(id: number) {
			const b = this.bridge;
			if (!b) return;
			const o = b.getObjects().find((x) => x.id === id);
			if (!o) return;
			this.pushUndo();
			this.clipboard = structuredClone(o);
			b.setObjects(b.getObjects().filter((x) => x.id !== id));
			this.closeMenu();
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
			const type = objs[idx].graphObjectType;
			this.pushUndo();
			const item = objs[idx];
			const rest = objs.filter((_, i) => i !== idx);
			let insertAt = rest.length;
			for (let i = rest.length - 1; i >= 0; i--) {
				if (rest[i].graphObjectType === type) {
					insertAt = i + 1;
					break;
				}
			}
			const next = [...rest.slice(0, insertAt), item, ...rest.slice(insertAt)];
			b.setObjects(next);
			this.closeMenu();
		},

		sendToBack(id: number) {
			const b = this.bridge;
			if (!b) return;
			const objs = b.getObjects();
			const idx = objs.findIndex((o) => o.id === id);
			if (idx < 0) return;
			const type = objs[idx].graphObjectType;
			this.pushUndo();
			const item = objs[idx];
			const rest = objs.filter((_, i) => i !== idx);
			let insertAt = 0;
			for (let i = 0; i < rest.length; i++) {
				if (rest[i].graphObjectType === type) {
					insertAt = i;
					break;
				}
			}
			const next = [...rest.slice(0, insertAt), item, ...rest.slice(insertAt)];
			b.setObjects(next);
			this.closeMenu();
		},

		pasteAtScreen(screenX: number, screenY: number) {
			const b = this.bridge;
			if (!b || !this.clipboard) return;
			const world = b.clientToWorld(screenX, screenY);
			this.applyPaste(world);
		},

		pasteAtViewportCenter() {
			const b = this.bridge;
			if (!b || !this.clipboard) return;
			const world = b.getViewportCenterWorld();
			this.applyPaste(world);
		},

		applyPaste(world: { x: number; y: number } | null) {
			const b = this.bridge;
			if (!b || !this.clipboard) return;
			const base = structuredClone(this.clipboard);
			const objs = b.getObjects();
			const newId = nextObjectId(objs);
			base.id = newId;
			if (base.data && typeof base.data === "object" && "techObjectId" in base.data) {
				(base.data as ObjectBaseData).techObjectId = newId;
			}

			if (base.graphObjectType === "pointer" && base.position) {
				if (world) {
					base.position = { x: world.x, y: world.y };
				} else {
					base.position = {
						x: base.position.x + 16,
						y: base.position.y + 16,
					};
				}
			} else if (base.graphObjectType === "linear" && base.points?.length) {
				const anchor = base.points[0];
				if (world) {
					const dx = world.x - anchor.x;
					const dy = world.y - anchor.y;
					base.points = base.points.map((p) => ({
						x: p.x + dx,
						y: p.y + dy,
					}));
				} else {
					base.points = base.points.map((p) => ({
						x: p.x + 16,
						y: p.y + 16,
					}));
				}
			}

			this.pushUndo();
			b.setObjects([...objs, base]);
			this.closeMenu();
		},
	},
});
