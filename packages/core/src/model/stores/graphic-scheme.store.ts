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
        backroundColor: "black",
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

    },
});
