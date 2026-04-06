import { uuid } from "@primeuix/utils";
import type { XYPosition } from "@vue-flow/core";
import type { ObjectType, } from "@/shared/graphical-editor/model";
import type { DndState, DropInfo } from "./types";

export const useDndStore = defineStore("dnd-graphic-editor", {
    state: (): DndState => ({
        dragNodeId: "0",
        isDragging: false,
        isDragOver: false,
        position: {
            x: 0,
            y: 0,
        } as XYPosition,
        draggedType: "pointer" as ObjectType,
        info: undefined as DropInfo | undefined,
        createrCallback: undefined,
    }),
    actions: {
        createGraphicObject() {
            //TODO: post request to create object
            this.dragNodeId = uuid();
        },
        clearStore() {
            this.isDragging = false;
            this.isDragOver = false;
        },
    },
});
