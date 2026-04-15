import { useVueFlow } from "@vue-flow/core";
import { watch } from "vue";
import { useDndStore, type DndState, type DropInfo } from "..";
import { type ObjectType, adaptToGrid, PointerGraphicObject, LinearGraphicObject } from "@/shared/graphical-editor";
import { useGraphicSchemeStore } from "@/shared/graphical-editor";
import type { Viewport } from "pixi-viewport";
import type { XYPosition } from "../../model";

export function useDragAndDrop() {
    const dndStore = useDndStore();
    const projectsStore = useProjectsStore();
    const graphicSchemeStore = useGraphicSchemeStore();

    watch(
        () => dndStore.isDragging,
        dragging => {
            document.body.style.userSelect = dragging ? "none" : "";
        }
    );

    function onDragStart(event: DragEvent, type: ObjectType, info?: DropInfo) {
        if (event.dataTransfer) {
            event.dataTransfer.setData("application/vueflow", type);
            event.dataTransfer.effectAllowed = "move";
        }
        dndStore.draggedType = type;
        dndStore.info = info;
        dndStore.isDragging = true;
        document.addEventListener("drop", onDragEnd);
    }

    /**
     * Handles the drag over event.
     *
     * @param {DragEvent} event
     */
    function onDragOver(event: DragEvent) {
        event.preventDefault();
        if (dndStore.draggedType) {
            dndStore.isDragOver = true;
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = "move";
            }
        }
    }
    function onDragLeave() {
        dndStore.isDragOver = false;
    }
    function onDragEnd() {
        dndStore.isDragging = false;
        dndStore.isDragOver = false;
        dndStore.draggedType = "pointer";
        document.removeEventListener("drop", onDragEnd);
    }
    /**
     * Handles the drop event.
     * @param {DragEvent} event
     */
    async function onDrop(event: DragEvent) {
        const dndStore = useDndStore();
        const graphicSchemaStore = useGraphicSchemeStore();
        const viewport = graphicSchemaStore.getViewport();
        const tooltip = graphicSchemeStore.tooltipManager;
        const tool = graphicSchemaStore.tool;
        const positionApp = graphicSchemeStore.getPositionApp;
        if (!viewport) return;
        const position: XYPosition = adaptToGrid(viewport.toWorld(event.clientX - positionApp.x, event.clientY - positionApp.y));
        dndStore.position = {
            x: Number.isNaN(position.x) ? 0 : position.x,
            y: Number.isNaN(position.y) ? 0 : position.y,
        };

        if (dndStore.info && projectsStore.projectId !== undefined && dndStore.createrCallback) {
            const graphicObjects = await dndStore.createrCallback(dndStore.$state);
            graphicObjects.forEach(go => {
                //TODO Сделать отдельный массив чтобы изменить состояние стора скопом
                if (go instanceof PointerGraphicObject) {
                    graphicSchemaStore.addPointerObjects([go]);
                } else {
                    graphicSchemaStore.addLinearObjects([go]);
                }
                go.draw(viewport as Viewport, tool, tooltip);
                viewport.update(2);
                viewport._onUpdate();
            });
        }
    }

    function onCreateObjectDnd(
        createrCallback: (
            state: Omit<DndState, "createrCallback">
        ) => Promise<(PointerGraphicObject | LinearGraphicObject)[]>
    ) {
        dndStore.createrCallback = createrCallback;
    }

    return {
        isDragOver: () => dndStore.isDragOver,
        onDragStart,
        onDragLeave,
        onDragOver,
        onDrop,
        onCreateObjectDnd,
    };
}
