import { PointerGraphicObject } from "..";
import { LinearGraphicObject } from "./../model/schema/linear/linear-graphic-object";
import type { Viewport } from "pixi-viewport";
import { Bounds, Graphics, Rectangle, type BoundsData, type FederatedPointerEvent } from "pixi.js";
import { useGraphicSchemeStore, type XYPosition } from "../model";

export function useSelectionArea() {
    const graphicSchemeStore = useGraphicSchemeStore();
    const selectionAreaLabel = "selection-area";
    const selectedAreaLabel = "selected-area";
    const start = ref<{ x: number; y: number }>();
    const limitSelectedObject = 100;
    let viewport: Viewport | undefined;
    let selectionArea: Graphics | undefined;

    onUnmounted(() => {
        if (viewport) {
            viewport.off("pointerdown", onDown);
            viewport.off("pointermove", onMove);
            viewport.off("pointerup", onUp);
        }
        selectionArea?.destroy();
    });

    function onInitSelectionArea(_viewport: Viewport): void {
        selectionArea?.destroy();
        viewport = _viewport;
        const graphics = new Graphics();
        graphics.label = selectionAreaLabel;
        graphics.alpha = 0.5;
        viewport.addChild(graphics);
        viewport.on("pointerdown", onDown);
        viewport.on("pointermove", onMove);
        viewport.on("pointerup", onUp);
        selectionArea = graphics;
        viewport._onUpdate();
        viewport.update(2);
    }

    async function onDown(e: FederatedPointerEvent) {
        const graphicSchemeStore = useGraphicSchemeStore();
        viewport = graphicSchemeStore.getViewport();
        selectionArea = getSelectionArea();
        if (!selectionArea) {
            if (viewport) {
                onInitSelectionArea(viewport);
            }
        }
        await nextTick();
        if (!viewport || !e.shiftKey) return;
        viewport.plugins.pause("drag");
        const pos = viewport.toWorld(e.global);
        start.value = pos;
        selectionArea?.clear();
    }

    function onMove(e: FederatedPointerEvent) {
        if (!start.value || !viewport || !selectionArea || !e.shiftKey) return;
        const pos = viewport.toWorld(e.global);
        const x = Math.min(start.value.x, pos.x);
        const y = Math.min(start.value.y, pos.y);
        const w = Math.abs(pos.x - start.value.x);
        const h = Math.abs(pos.y - start.value.y);
        selectionArea.clear();
        selectionArea.rect(x, y, w, h).stroke({ width: 1, color: 0x3399ff }).fill({ color: "#0369a1", alpha: 0.5 });
        viewport._onUpdate();
        viewport.update(2);
    }

    async function onUp(e: FederatedPointerEvent) {
        if (!start.value || !viewport) return;

        viewport.plugins.resume("drag");
        const pos = viewport.toWorld(e.global);
        graphicSchemeStore.isDragPan = true;
        const selectionRect = new Rectangle(
            Math.min(start.value.x, pos.x),
            Math.min(start.value.y, pos.y),
            Math.abs(pos.x - start.value.x),
            Math.abs(pos.y - start.value.y)
        );

        const hitPointerObjects = graphicSchemeStore.pointerObjs.filter(obj =>
            isIntersectingByBounds(obj.transformBounds, selectionRect)
        );
        const hitLinearObjects = graphicSchemeStore.linearObjs.filter(obj =>
            isIntersectingByPoints(obj.points, selectionRect)
        );

        //TODO временный костыьл с флагном, но пока нет времени(
        const isDraw = hitLinearObjects.length + hitPointerObjects.length <= limitSelectedObject;
        await graphicSchemeStore.tool.onSelectionAreaEnd(hitPointerObjects, hitLinearObjects, isDraw);
        selectionArea?.clear();
        if (!isDraw) {
            const boundsData = getBoundsForArea(hitPointerObjects, hitLinearObjects);
            const areaGraphics = new Graphics();
            areaGraphics.label = "area-selected";
            areaGraphics
                .rect(
                    boundsData.minX,
                    boundsData.minY,
                    boundsData.maxX - boundsData.minX,
                    boundsData.maxY - boundsData.minY
                )
                .stroke({ width: 4, color: 0x3399ff })
                .fill({ color: "#0369a1", alpha: 0.3 });
            areaGraphics.interactive = true;
            areaGraphics.onmousedown = async event => {
                await graphicSchemeStore.tool.onMouseDownSelectedArea(event);
            };
            areaGraphics.onrightclick = async event => {
                event.stopPropagation();
                await graphicSchemeStore.tool.onContextMenuSelectedArea(event);
            };
            graphicSchemeStore.boundsSelectedArea = new Bounds(
                boundsData.minX,
                boundsData.minY,
                boundsData.maxX,
                boundsData.maxY
            );
            viewport.addChild(areaGraphics);
            viewport.update(2);
            viewport._onUpdate();
        }
        start.value = undefined;
    }

    function isIntersectingByBounds(objBounds: BoundsData, selection: Rectangle) {
        return !(
            objBounds.minX < selection.x ||
            objBounds.maxX > selection.x + selection.width ||
            objBounds.minY < selection.y ||
            objBounds.maxY > selection.y + selection.height
        );
    }

    function isIntersectingByPoints(points: XYPosition[], selection: Rectangle) {
        const isIntersecting = points.find(p => !selection.contains(p.x, p.y));
        return isIntersecting === undefined;
    }

    function getBoundsForArea(pointerObject: PointerGraphicObject[], linearObjects: LinearGraphicObject[]): BoundsData {
        const boundsToLinears = linearObjects
            .flatMap(l => l.points)
            .reduce(
                (acc, l) => {
                    const minX = acc.minX > l.x ? l.x : acc.minX;
                    const minY = acc.minY > l.y ? l.y : acc.minY;
                    const maxX = acc.maxX < l.x ? l.x : acc.maxX;
                    const maxY = acc.maxY < l.y ? l.y : acc.maxY;
                    return {
                        minX,
                        minY,
                        maxX,
                        maxY,
                    };
                },
                {
                    minX: Infinity,
                    maxX: -Infinity,
                    minY: Infinity,
                    maxY: -Infinity,
                } as BoundsData
            );

        const boundsToPointers = pointerObject
            .map(p => p.transformBounds)
            .reduce(
                (acc, bounds) => {
                    const minX = acc.minX > bounds.minX ? bounds.minX : acc.minX;
                    const minY = acc.minY > bounds.minY ? bounds.minY : acc.minY;
                    const maxX = acc.maxX < bounds.maxX ? bounds.maxX : acc.maxX;
                    const maxY = acc.maxY < bounds.maxY ? bounds.maxY : acc.maxY;
                    return {
                        minX,
                        minY,
                        maxX,
                        maxY,
                    };
                },
                {
                    minX: Infinity,
                    minY: Infinity,
                    maxX: -Infinity,
                    maxY: -Infinity,
                } as BoundsData
            );

        return {
            minX: boundsToLinears.minX < boundsToPointers.minX ? boundsToLinears.minX : boundsToPointers.minX,
            minY: boundsToLinears.minY < boundsToPointers.minY ? boundsToLinears.minY : boundsToPointers.minY,
            maxX: boundsToLinears.maxX > boundsToPointers.maxX ? boundsToLinears.maxX : boundsToPointers.maxX,
            maxY: boundsToLinears.maxY > boundsToPointers.maxY ? boundsToLinears.maxY : boundsToPointers.maxY,
        };
    }

    const getSelectionArea = (): Graphics | undefined => {
        const viewport = graphicSchemeStore.getViewport();
        if (!viewport) {
            return;
        }
        return viewport.getChildByLabel(selectionAreaLabel) as Graphics | undefined;
    };

    return { onInitSelectionArea };
}
