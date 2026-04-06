import { Viewport } from "pixi-viewport";
import { type Application } from "pixi.js";
import { Grid, useGraphicSchemeStore, type ITool } from "../model";
import { calculatingBoundsSchema } from "../lib";
import type { IGraphicalEditorTooltip, ManagerTooltip } from "./use-tooltip";

export function useRenderSchema() {
    let viewport: Viewport;
    const graphicSchemaStore = useGraphicSchemeStore();
    function renderSchema(app: Application): Viewport {
        viewport = initViewport(app);

        const tool = graphicSchemaStore.tool;
        const tooltip = graphicSchemaStore.tooltipManager;
        fitFullSchema();

        drawGraphicLinear(viewport, tool, tooltip);
        //drawGrid(app, viewport);
        drawGraphicPointer(viewport, tool, tooltip);
        drawGraphicTextual(viewport, tool);

        return viewport;
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
        // viewport.cullable = true;
        // viewport.cullableChildren = true;
        app.stage.addChild(viewport);
        viewport.drag().pinch().wheel();
        viewport.label = "viewport";
        viewport.addEventListener("click", () => {
            if (!graphicSchemaStore.isDragPan) {
                graphicSchemaStore.clearSelectionObjects();
            }
            graphicSchemaStore.isDragPan = false;
        });
        viewport.addEventListener("drag-start", event => {
            graphicSchemaStore.isDragPan = true;
        });

        viewport.onrightclick = event => {
            graphicSchemaStore.tool.onContextMenuPane(event);
        };

        return viewport;
    }

    function fitFullSchema(paddingPercent = 5) {
        const bounds = calculatingBoundsSchema(graphicSchemaStore.pointerObjs, graphicSchemaStore.linearObjs);
        const scaleX = viewport.screenWidth / bounds.width;
        const scaleY = viewport.screenHeight / bounds.height;

        // Берём минимальный, чтобы точно влезло
        const scale = Math.min(scaleX, scaleY);
        const paddingScale = scale - (paddingPercent * scale) / 100;

        viewport.setZoom(paddingScale, true); // true = центрировать
        viewport.moveCenter(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        return;
    }

    function drawGraphicPointer(viewport: Viewport, tool: ITool, tooltip?: IGraphicalEditorTooltip) {
        graphicSchemaStore.pointerObjs.forEach(object => {
            object.draw(viewport, tool, tooltip);
        });
    }

    function drawGraphicLinear(viewport: Viewport, tool: ITool, tooltip?: IGraphicalEditorTooltip) {
        graphicSchemaStore.linearObjs.forEach(object => {
            object.draw(viewport, tool, tooltip);
        });
    }

    function drawGraphicTextual(viewport: Viewport, tool: ITool) {
        graphicSchemaStore.textalObjs.forEach(object => {
            object.draw(viewport, tool);
        });
    }

    function drawGrid(app: Application, viewport: Viewport) {
        const grid = new Grid(app, viewport, 10);
        viewport.addChild(grid);
    }

    return {
        renderSchema,
    };
}
