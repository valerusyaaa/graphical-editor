import { Viewport } from "pixi-viewport";
import { type Application } from "pixi.js";
import {
	createGraphicObjectFromDto,
	getDescriptionByType,
	useGraphicSchemeStore,
} from "../model";
import { calculatingBoundsSchema } from "../lib";
import { GraphicObjectDto, ObjectDescription } from "../api";
import { Ref, watch } from "vue";
import { PointerGraphicObject, LinearGraphicObject } from "../model";
import { ITool } from "../api/itool";

export function useRenderSchema(
	objects: Ref<GraphicObjectDto<any>[]>,
	descriptions: Ref<ObjectDescription[]>,
) {
	let viewport: Viewport;
	const graphicSchemaStore = useGraphicSchemeStore();

	watch(
		() => objects.value,
		() => {
			const pointerObjs = objects.value.map((object) =>
				createGraphicObjectFromDto(
					object,
					getDescriptionByType(
						descriptions.value,
						object.featureObjectType,
					),
				),
			);
			const linearObjs = objects.value.map((object) =>
				createGraphicObjectFromDto(
					object,
					getDescriptionByType(
						descriptions.value,
						object.featureObjectType,
					),
				),
			);
			graphicSchemaStore.scheme.layerGraphicObject.pointer =
				pointerObjs as unknown as PointerGraphicObject[];
			graphicSchemaStore.scheme.layerGraphicObject.linear =
				linearObjs as unknown as LinearGraphicObject[];
		},{
            immediate: true,
            deep: true,
        }
	);

	function renderSchema(app: Application): Viewport {
		viewport = initViewport(app);

		const tool = graphicSchemaStore.tool;
		// fitFullSchema();

		drawGraphicLinear(viewport, tool);
		drawGraphicPointer(viewport, tool);

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
		viewport.drag({ wheel: false }).pinch();
		// Keep page scroll for regular wheel over canvas, but handle pinch-zoom inside editor.
		app.canvas.addEventListener(
			"wheel",
			(event: WheelEvent) => {
				// Trackpad pinch is emitted as ctrl + wheel in browsers.
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
		viewport.addEventListener("click", () => {
			if (!graphicSchemaStore.isDragPan) {
			}
			graphicSchemaStore.isDragPan = false;
		});
		viewport.addEventListener("drag-start", (event) => {
			graphicSchemaStore.isDragPan = true;
		});

		viewport.onrightclick = (event) => {
			graphicSchemaStore.tool.onContextMenuPane(event);
		};

		return viewport;
	}

	/**
	 * Подгоняет схему под размеры экрана
	 * @param paddingPercent - процент padding от размера экрана
	 */
	function fitFullSchema(paddingPercent = 5) {
		const bounds = calculatingBoundsSchema(
			graphicSchemaStore.pointerObjs,
			graphicSchemaStore.linearObjs,
		);
		const scaleX = viewport.screenWidth / bounds.width;
		const scaleY = viewport.screenHeight / bounds.height;

		// Берём минимальный, чтобы точно влезло
		const scale = Math.min(scaleX, scaleY);
		const paddingScale = scale - (paddingPercent * scale) / 100;

		viewport.setZoom(paddingScale, true); // true = центрировать
		viewport.moveCenter(
			bounds.x + bounds.width / 2,
			bounds.y + bounds.height / 2,
		);
		return;
	}

	function drawGraphicPointer(viewport: Viewport, tool: ITool) {
		graphicSchemaStore.pointerObjs.forEach((object) => {
			object.draw(viewport, tool);
		});
	}

	function drawGraphicLinear(viewport: Viewport, tool: ITool) {
		graphicSchemaStore.linearObjs.forEach((object) => {
			object.draw(viewport, tool);
		});
	}

	return {
		renderSchema,
	};
}
