import type { Viewport } from "pixi-viewport";
import type {
	LinearGraphicObject,
	PointerGraphicObject,
	SelectedLinearGraphicObject,
	SelectedPointerGraphicObject,
} from "../../../packages/core/src/model";
import { useEditorClipboardStore } from "../../../packages/core/src/model/stores";
import type { useGraphicSchemeStore } from "../../../packages/core/src/model/stores/graphic-scheme.store";

type XY = { x: number; y: number };
type SchemeStore = ReturnType<typeof useGraphicSchemeStore>;

type PointerDragEntry = {
	kind: "pointer";
	selected: SelectedPointerGraphicObject;
	scheme: PointerGraphicObject;
};

type LinearDragEntry = {
	kind: "linear";
	selected: SelectedLinearGraphicObject;
	scheme: LinearGraphicObject;
};

export type GroupDragEntry = PointerDragEntry | LinearDragEntry;

/** Если клик по уже выделенному объекту в группе — тянем всю группу. */
export function dragTargetIds(
	selectedIds: number[],
	primaryId: number,
): number[] {
	if (selectedIds.includes(primaryId) && selectedIds.length > 1) {
		return [...selectedIds];
	}
	return [primaryId];
}

export function buildGroupDragEntries(
	store: SchemeStore,
	ids: number[],
): GroupDragEntry[] {
	const idSet = new Set(ids);
	const entries: GroupDragEntry[] = [];

	for (const s of store.selectedPointerObjs) {
		if (!idSet.has(s.idObject)) continue;
		const scheme = store.pointerObjs.find((o) => o.idObject === s.idObject);
		if (!scheme) continue;
		entries.push({ kind: "pointer", selected: s, scheme });
	}

	for (const s of store.selectedLinearObjs) {
		if (!idSet.has(s.idObject)) continue;
		const scheme = store.linearObjs.find((o) => o.idObject === s.idObject);
		if (!scheme) continue;
		entries.push({ kind: "linear", selected: s, scheme });
	}

	return entries;
}

export function applyGroupDragDelta(
	entries: GroupDragEntry[],
	delta: XY,
	viewport: Viewport,
): void {
	for (const e of entries) {
		if (e.kind === "pointer") {
			e.selected.graphics.visible = true;
			e.selected.graphics.eventMode = "static";
			e.selected.position = {
				x: e.selected.position.x + delta.x,
				y: e.selected.position.y + delta.y,
			};
			e.selected.draw();
			e.scheme.refreshPosition(e.selected.position, viewport);
		} else {
			e.selected.setOutlineVisible(true);
			e.selected.points = e.selected.points.map((p) => ({
				x: p.x + delta.x,
				y: p.y + delta.y,
			}));
			e.selected.draw();
			e.scheme.refreshPath(e.selected.points, viewport);
		}
	}
}

export function commitGroupDrag(
	viewport: Viewport,
	entries: GroupDragEntry[],
): void {
	const clip = useEditorClipboardStore();
	for (const e of entries) {
		if (e.kind === "pointer") {
			e.scheme.refreshPosition(e.selected.position, viewport);
			e.selected.position = {
				x: e.scheme.position.x,
				y: e.scheme.position.y,
			};
			e.selected.draw();
		} else {
			e.scheme.refreshPath(e.selected.points, viewport);
			e.selected.points = e.scheme.points.map((p) => ({ ...p }));
			e.selected.draw();
		}
	}
	clip.batchSyncGeometryFromScheme(
		entries.map((e) =>
			e.kind === "pointer"
				? {
						kind: "pointer" as const,
						id: e.scheme.idObject,
						schemePosition: e.scheme.position,
						offsets: e.scheme.offsets,
					}
				: {
						kind: "linear" as const,
						id: e.scheme.idObject,
						points: e.scheme.points.map((p) => ({ ...p })),
					},
		),
	);
}
