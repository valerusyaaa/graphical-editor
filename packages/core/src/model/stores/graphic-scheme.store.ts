import {
    LinearGraphicObject,
    PointerGraphicObject,
    SelectedLinearGraphicObject,
    SelectedPointerGraphicObject,
    BaseTool,
} from "..";
import { type GraphicSchemeState } from "./types";
import type { XYPosition } from "../schema/types";
import { defineStore } from "pinia";
import { resolveObjectClickSelection } from "../../lib/object-selection-click";
import {
	type EditorUiTheme,
	EDITOR_GRID_STYLE,
	resolveCanvasBackgroundHex,
} from "../../lib/editor-ui-theme";

export const useGraphicSchemeStore = defineStore("graphic-scheme", {
    state: (): GraphicSchemeState => ({
        scheme: {
            layerGraphicObject: {
                linear: [],
                pointer: [],
            },
            layerSelectedGraphicObject: {
                linear: [],
                pointer: [],
            },
        },
        app: undefined,
        lastActiveGraphicObject: null,
        tool: new BaseTool(),
        isDragObjects: true,
        isDragPan: false,
        /** id объекта слоя selection во время перетаскивания (чтобы не скрывать контур при pointerleave) */
        selectionDragObjectId: null as number | null,
        selectedObjectIds: [] as number[],
        gridVisible: true,
        gridStep: 10,
        gridLineColor: EDITOR_GRID_STYLE.dark.color,
        gridLineAlpha: EDITOR_GRID_STYLE.dark.alpha,
        gridDotSize: EDITOR_GRID_STYLE.dark.dotSize,
        uiTheme: "dark",
        backroundColor: "#141414",
        preRenderCbs: [],
        postRenderCbs: [],
    }),
    getters: {
        pointerObjs(): PointerGraphicObject[] {
            return this.scheme.layerGraphicObject.pointer as unknown as PointerGraphicObject[];
        },
        linearObjs(): LinearGraphicObject[] {
            return this.scheme.layerGraphicObject.linear as unknown as LinearGraphicObject[];
        },
        selectedPointerObjs(): SelectedPointerGraphicObject[] {
            return this.scheme.layerSelectedGraphicObject.pointer as unknown as SelectedPointerGraphicObject[];
        },
        selectedLinearObjs(): SelectedLinearGraphicObject[] {
            return this.scheme.layerSelectedGraphicObject.linear as unknown as SelectedLinearGraphicObject[];
        },

        getPositionApp(): XYPosition {
            if (this.app) {
                const bounds = this.app.canvas.getBoundingClientRect();
                return { x: bounds.x, y: bounds.y };
            }
            return { x: 0, y: 0 };
        },
    },
    actions: {
        setSelectedObjectIds(ids: number[]) {
            this.selectedObjectIds = [...new Set(ids)];
        },
        selectObjectOnClick(objectId: number, options?: { additive?: boolean }) {
            this.selectedObjectIds = resolveObjectClickSelection(
                this.selectedObjectIds,
                objectId,
                options?.additive ?? false,
            );
        },
        clearSelectedObjects() {
            this.selectedObjectIds = [];
        },
        selectAllObjects() {
            const ids = [
                ...this.pointerObjs.map((o) => o.idObject),
                ...this.linearObjs.map((o) => o.idObject),
            ];
            this.selectedObjectIds = ids;
        },
        isObjectSelected(id: number): boolean {
            return this.selectedObjectIds.includes(id);
        },
        toggleGridVisible() {
            this.gridVisible = !this.gridVisible;
        },
        applyUiTheme(theme: EditorUiTheme) {
            this.uiTheme = theme;
            const grid = EDITOR_GRID_STYLE[theme];
            this.gridLineColor = grid.color;
            this.gridLineAlpha = grid.alpha;
            this.gridDotSize = grid.dotSize;
            if (theme === "light") {
                this.backroundColor = "#ffffff";
            } else {
                this.backroundColor = "#141414";
            }
            this.refreshCanvasBackground();
        },
        refreshCanvasBackground() {
            const application = this.app;
            if (!application?.renderer) return;
            application.renderer.background.color = resolveCanvasBackgroundHex(
                this.backroundColor,
                this.uiTheme,
            );
        },
    },
});
