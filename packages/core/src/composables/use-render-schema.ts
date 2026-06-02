import { Viewport } from "pixi-viewport";
import { type Application, type Container } from "pixi.js";
import {
	getDescriptionByType,
	useGraphicSchemeStore,
} from "../model";
import {
	isLinearGraphicObjectDto,
	isPointerGraphicObjectDto,
} from "../model/schema/graphic-object-dto-factory";
import { calculatingBoundsSchema } from "../lib";
import { syncMonitorsInObjectList } from "../lib/monitor-object";
import {
	createSchemaGridGraphics,
	SCHEMA_GRID_LABEL,
} from "../lib/schema-grid";
import {
	isSchemaViewportChild,
	markSchemaViewportChild,
} from "../lib/schema-viewport-mark";
import {
	buildStructuralKey,
	clearSchemaViewportLayers,
	createGraphicModelsFromDtos,
	diffFingerprints,
	patchLinearOnViewport,
	patchPointerOnViewport,
	rebuildFingerprintMap,
	removeViewportObjectById,
	syncGraphicModelsIncremental,
	type GraphicModelMaps,
} from "../lib/schema-render-sync";
import {
	GraphicObjectDto,
	ObjectBaseData,
	ObjectDescription,
} from "../api";
import { Ref, watch, markRaw } from "vue";
import {
	PointerGraphicObject,
	LinearGraphicObject,
	SelectedPointerGraphicObject,
	SelectedLinearGraphicObject,
} from "../model";
import { ITool } from "../api/itool";
import { useEditorClipboardStore } from "../model/stores/editor-clipboard.store";

export function useRenderSchema(
	objects: Ref<GraphicObjectDto<ObjectBaseData>[]>,
	descriptions: Ref<ObjectDescription[]>,
) {
	let viewport: Viewport;
	let modelMaps: GraphicModelMaps = {
		pointers: new Map(),
		linears: new Map(),
	};
	let lastStructuralKey = "";
	let lastDescriptionCount = 0;
	let objectFingerprints = new Map<number, string>();
	let syncRafId: number | null = null;

	const graphicSchemaStore = useGraphicSchemeStore();

	function applyModelsToStore(maps: GraphicModelMaps) {
		graphicSchemaStore.scheme.layerGraphicObject.pointer =
			[...maps.pointers.values()] as unknown as PointerGraphicObject[];
		graphicSchemaStore.scheme.layerGraphicObject.linear =
			[...maps.linears.values()] as unknown as LinearGraphicObject[];
	}

	function syncSchemaGrid(vp: Viewport) {
		const existing = vp.getChildByLabel(SCHEMA_GRID_LABEL);
		if (!graphicSchemaStore.gridVisible) {
			if (existing) {
				vp.removeChild(existing);
				existing.destroy();
			}
			return;
		}
		if (existing) return;
		const grid = createSchemaGridGraphics({
			step: graphicSchemaStore.gridStep,
			color: graphicSchemaStore.gridLineColor,
			alpha: graphicSchemaStore.gridLineAlpha,
			dotSize: graphicSchemaStore.gridDotSize,
		});
		vp.addChildAt(grid, 0);
	}

	function redrawSchemaOnViewport(vp: Viewport) {
		const tool = graphicSchemaStore.tool;
		clearSchemaViewportLayers(vp);
		drawGraphicObjectsInZOrder(vp, tool);
		buildSelectionLayers(vp);
	}

	function patchViewportObjects(vp: Viewport, patchIds: Set<number>) {
		const tool = graphicSchemaStore.tool;
		for (const id of patchIds) {
			const dto = objects.value.find((o) => o.id === id);
			if (!dto) {
				removeViewportObjectById(vp, id);
				continue;
			}
			if (isPointerGraphicObjectDto(dto)) {
				const obj = modelMaps.pointers.get(id);
				if (obj) {
					patchPointerOnViewport(vp, obj, dto, tool);
				}
			} else if (isLinearGraphicObjectDto(dto)) {
				const obj = modelMaps.linears.get(id);
				if (obj) {
					patchLinearOnViewport(vp, obj, dto, tool);
				}
			}
		}
	}

	function runObjectsSync() {
		syncMonitorsInObjectList(objects.value);

		const structuralKey = buildStructuralKey(objects.value);
		const descriptionsChanged =
			descriptions.value.length !== lastDescriptionCount;
		const structuralChanged =
			structuralKey !== lastStructuralKey || descriptionsChanged;

		if (structuralChanged) {
			const built = createGraphicModelsFromDtos(
				objects.value,
				descriptions.value,
			);
			modelMaps = built.maps;
			applyModelsToStore(modelMaps);
			lastStructuralKey = structuralKey;
			lastDescriptionCount = descriptions.value.length;
			objectFingerprints = rebuildFingerprintMap(objects.value);

			if (viewport) {
				redrawSchemaOnViewport(viewport);
			}
			return;
		}

		const { changed, next } = diffFingerprints(
			objects.value,
			objectFingerprints,
		);
		if (changed.size === 0) {
			return;
		}

		syncGraphicModelsIncremental(
			objects.value,
			descriptions.value,
			modelMaps,
		);
		applyModelsToStore(modelMaps);
		objectFingerprints = next;

		if (!viewport) {
			return;
		}

		patchViewportObjects(viewport, changed);
		patchSelectionLayers(viewport, changed);
	}

	function scheduleObjectsSync() {
		if (typeof requestAnimationFrame !== "function") {
			runObjectsSync();
			return;
		}
		if (syncRafId != null) {
			return;
		}
		syncRafId = requestAnimationFrame(() => {
			syncRafId = null;
			runObjectsSync();
		});
	}

	watch(
		() =>
			[
				graphicSchemaStore.gridVisible,
				graphicSchemaStore.gridStep,
				graphicSchemaStore.gridLineColor,
				graphicSchemaStore.gridLineAlpha,
				graphicSchemaStore.gridDotSize,
			] as const,
		() => {
			if (!viewport) return;
			const existing = viewport.getChildByLabel(SCHEMA_GRID_LABEL);
			if (existing) {
				viewport.removeChild(existing);
				existing.destroy();
			}
			syncSchemaGrid(viewport);
		},
	);

	watch(
		() => graphicSchemaStore.selectedObjectIds.slice(),
		() => {
			if (!viewport) return;
			applyPinnedSelection(viewport);
		},
	);

	watch(
		() => objects.value,
		() => {
			scheduleObjectsSync();
		},
		{ immediate: true },
	);

	watch(
		() => descriptions.value,
		() => {
			scheduleObjectsSync();
		},
		{ deep: true },
	);

	function renderSchema(app: Application): Viewport {
		viewport = initViewport(app);

		const tool = graphicSchemaStore.tool;
		drawGraphicObjectsInZOrder(viewport, tool);
		buildSelectionLayers(viewport);

		return viewport;
	}

	function applyPinnedSelection(vp: Viewport) {
		const pinned = new Set(graphicSchemaStore.selectedObjectIds);
		for (const s of graphicSchemaStore.selectedPointerObjs) {
			const on = pinned.has(s.idObject);
			s.graphics.visible = on;
			s.graphics.eventMode = on ? "static" : "none";
		}
		for (const s of graphicSchemaStore.selectedLinearObjs) {
			s.setOutlineVisible(pinned.has(s.idObject));
		}
	}

	/** Снять старые контуры/hover-слои selection с viewport (иначе остаются «следы» после drag). */
	function destroySelectionDisplayObjects() {
		const detach = (node: { parent?: unknown; destroy?: (opts?: object) => void } | null | undefined) => {
			if (!node) return;
			const display = node as {
				parent?: { removeChild: (child: unknown) => void };
				destroy?: (opts?: object) => void;
			};
			if (display.parent) {
				display.parent.removeChild(display);
			}
			display.destroy?.({ children: true });
		};

		for (const s of graphicSchemaStore.selectedPointerObjs) {
			detach(s.graphics);
		}
		for (const s of graphicSchemaStore.selectedLinearObjs) {
			detach(s.graphics);
			detach(s.shadowGraphicsLine);
			for (const n of s.nodes) {
				detach(n.graphics);
			}
		}

		graphicSchemaStore.scheme.layerSelectedGraphicObject.pointer = [];
		graphicSchemaStore.scheme.layerSelectedGraphicObject.linear = [];
	}

	/** Обновляет геометрию контуров выделения только для изменившихся id (без полной пересборки). */
	function patchSelectionLayers(vp: Viewport, ids: Set<number>) {
		if (ids.size === 0) return;

		const selPointer = new Map<number, SelectedPointerGraphicObject>();
		for (const s of graphicSchemaStore.selectedPointerObjs) {
			selPointer.set(s.idObject, s);
		}
		const selLinear = new Map<number, SelectedLinearGraphicObject>();
		for (const s of graphicSchemaStore.selectedLinearObjs) {
			selLinear.set(s.idObject, s);
		}

		for (const id of ids) {
			const sp = selPointer.get(id);
			if (sp) {
				const base = modelMaps.pointers.get(id);
				if (base) {
					sp.position = { ...base.position };
					sp.draw();
				}
				continue;
			}
			const sl = selLinear.get(id);
			if (sl) {
				const base = modelMaps.linears.get(id);
				if (!base) continue;
				if (base.points.length !== sl.points.length) {
					buildSelectionLayers(vp);
					return;
				}
				sl.points = base.points.map((p) => ({ ...p }));
				sl.draw();
			}
		}
	}

	function buildSelectionLayers(viewport: Viewport) {
		destroySelectionDisplayObjects();

		const childByLabel = new Map<string, Container>();
		for (const c of viewport.children) {
			if (c.label) childByLabel.set(c.label, c as Container);
		}

		const pointerSelected: SelectedPointerGraphicObject[] = [];
		const linearSelected: SelectedLinearGraphicObject[] = [];
		const pinnedIds = new Set(graphicSchemaStore.selectedObjectIds);

		for (const o of graphicSchemaStore.pointerObjs) {
			const selected = markRaw(
				new SelectedPointerGraphicObject({
					id: o.idObject,
					objectType: "pointer",
					techObjectId: o.data?.techObjectId,
					position: { ...o.position },
					rotateAngle: o.rotationAngle,
					flipHorizontal: o.flipHorizontal,
					flipVertical: o.flipVertical,
					offsets: o.offsets,
				}),
			);
			selected.setObjectScheme(o);
			const isPinned = pinnedIds.has(o.idObject);
			selected.graphics.visible = isPinned;
			selected.graphics.zIndex = 15;
			selected.graphics.eventMode = isPinned ? "static" : "none";
			viewport.addChild(selected.draw());

			const showPointerSelection = () => {
				selected.graphics.visible = true;
				selected.graphics.eventMode = "static";
			};
			const hidePointerSelection = () => {
				if (graphicSchemaStore.selectionDragObjectId === o.idObject) {
					return;
				}
				if (graphicSchemaStore.selectedObjectIds.includes(o.idObject)) {
					return;
				}
				selected.graphics.visible = false;
				selected.graphics.eventMode = "none";
			};

			const container = childByLabel.get(o.idObject.toString());
			if (container) {
				container.eventMode = "static";
				container.onpointerenter = showPointerSelection;
				const figure = container.getChildByLabel("graphics");
				if (figure) {
					figure.eventMode = "static";
					figure.onpointerenter = showPointerSelection;
				}
			}

			selected.graphics.onpointerleave = hidePointerSelection;
			selected.graphics.onpointerenter = showPointerSelection;

			markSchemaViewportChild(selected.graphics);
			pointerSelected.push(selected);
		}

		for (const o of graphicSchemaStore.linearObjs) {
			const selected = markRaw(
				new SelectedLinearGraphicObject({
					id: o.idObject,
					objectType: "linear",
					techObjectId: o.data?.techObjectId,
					points: o.points.map((p) => ({ ...p })),
				}),
			);
			selected.setObjectScheme(o);
			selected.setOutlineVisible(pinnedIds.has(o.idObject));
			viewport.addChild(...selected.draw());

			const baseShadow = childByLabel.get(`${o.idObject}-shadow`);
			const baseLine = childByLabel.get(o.idObject.toString());
			const showLinear = () => {
				if (graphicSchemaStore.selectionDragObjectId === o.idObject) {
					return;
				}
				selected.setOutlineVisible(true);
			};
			const hideLinear = () => {
				if (graphicSchemaStore.selectionDragObjectId === o.idObject) {
					return;
				}
				if (graphicSchemaStore.selectedObjectIds.includes(o.idObject)) {
					return;
				}
				selected.setOutlineVisible(false);
			};

			for (const display of [baseShadow, baseLine]) {
				if (display && "onpointerenter" in display) {
					(display as unknown as { onpointerenter: unknown }).onpointerenter =
						showLinear;
				}
			}
			selected.shadowGraphicsLine.onpointerleave = hideLinear;
			selected.shadowGraphicsLine.onpointerenter = showLinear;
			selected.graphics.onpointerenter = showLinear;

			markSchemaViewportChild(selected.graphics);
			markSchemaViewportChild(selected.shadowGraphicsLine);
			for (const n of selected.nodes) {
				markSchemaViewportChild(n.graphics);
			}

			linearSelected.push(selected);
		}

		graphicSchemaStore.scheme.layerSelectedGraphicObject.pointer =
			pointerSelected as unknown as typeof graphicSchemaStore.scheme.layerSelectedGraphicObject.pointer;
		graphicSchemaStore.scheme.layerSelectedGraphicObject.linear =
			linearSelected as unknown as typeof graphicSchemaStore.scheme.layerSelectedGraphicObject.linear;
		applyPinnedSelection(viewport);
	}

	function initViewport(app: Application) {
		const viewport = new Viewport({
			events: app.renderer.events,
			stopPropagation: false,
			disableOnContextMenu: true,
			screenHeight: app.canvas.height,
			screenWidth: app.canvas.width,
			allowPreserveDragOutside: true,
		});
		app.stage.addChild(viewport);
		viewport.sortableChildren = true;
		viewport.drag({ wheel: false }).pinch();
		app.canvas.addEventListener(
			"wheel",
			(event: WheelEvent) => {
				if (!event.ctrlKey) {
					return;
				}
				event.preventDefault();
				const currentZoom = viewport.scale.x;
				const zoomDelta = Math.exp(-event.deltaY * 0.002);
				const nextZoom = Math.min(8, Math.max(0.2, currentZoom * zoomDelta));
				viewport.setZoom(nextZoom, true);
			},
			{ passive: false },
		);
		viewport.label = "viewport";
		syncSchemaGrid(viewport);
		viewport.addEventListener("click", (event) => {
			const btn =
				event.button ??
				(event as { nativeEvent?: MouseEvent }).nativeEvent?.button;
			if (btn !== undefined && btn !== 0) return;
			if (event.target !== viewport) return;
			useEditorClipboardStore().closeMenu();
			const native = (event as { nativeEvent?: MouseEvent }).nativeEvent;
			if (
				native &&
				typeof native.clientX === "number" &&
				typeof native.clientY === "number"
			) {
				useEditorClipboardStore().setPasteTargetFromClient(
					native.clientX,
					native.clientY,
				);
			}
			if (!graphicSchemaStore.isDragPan) {
				graphicSchemaStore.clearSelectedObjects();
			}
			graphicSchemaStore.isDragPan = false;
		});
		viewport.addEventListener("drag-start", () => {
			graphicSchemaStore.isDragPan = true;
		});

		viewport.onrightclick = (event) => {
			if (event.target !== viewport) return;
			graphicSchemaStore.tool.onContextMenuPane(event);
		};

		return viewport;
	}

	function fitFullSchema(paddingPercent = 5) {
		const bounds = calculatingBoundsSchema(
			graphicSchemaStore.pointerObjs,
			graphicSchemaStore.linearObjs,
		);
		const scaleX = viewport.screenWidth / bounds.width;
		const scaleY = viewport.screenHeight / bounds.height;

		const scale = Math.min(scaleX, scaleY);
		const paddingScale = scale - (paddingPercent * scale) / 100;

		viewport.setZoom(paddingScale, true);
		viewport.moveCenter(
			bounds.x + bounds.width / 2,
			bounds.y + bounds.height / 2,
		);
		return;
	}

	function drawGraphicObjectsInZOrder(vp: Viewport, tool: ITool) {
		for (const dto of objects.value) {
			if (isPointerGraphicObjectDto(dto)) {
				const o = modelMaps.pointers.get(dto.id);
				if (o) o.draw(vp, tool);
			} else if (isLinearGraphicObjectDto(dto)) {
				const o = modelMaps.linears.get(dto.id);
				if (o) o.draw(vp, tool);
			}
		}
	}

	return {
		renderSchema,
	};
}
