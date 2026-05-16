import { Viewport } from "pixi-viewport";
import { type Application, type Container } from "pixi.js";
import {
	createGraphicObjectFromDto,
	getDescriptionByType,
	isLinearGraphicObjectDto,
	isPointerGraphicObjectDto,
	useGraphicSchemeStore,
} from "../model";
import { calculatingBoundsSchema } from "../lib";
import {
	isSchemaViewportChild,
	markSchemaViewportChild,
} from "../lib/schema-viewport-mark";
import { GraphicObjectDto, ObjectDescription } from "../api";
import { Ref, watch } from "vue";
import {
	PointerGraphicObject,
	LinearGraphicObject,
	SelectedPointerGraphicObject,
	SelectedLinearGraphicObject,
} from "../model";
import { ITool } from "../api/itool";

export function useRenderSchema(
	objects: Ref<GraphicObjectDto<any>[]>,
	descriptions: Ref<ObjectDescription[]>,
) {
	let viewport: Viewport;
	const graphicSchemaStore = useGraphicSchemeStore();

	function clearSchemaViewportLayers(vp: Viewport) {
		for (const child of [...vp.children]) {
			if (isSchemaViewportChild(child)) {
				vp.removeChild(child);
				child.destroy({ children: true });
			}
		}
	}

	function redrawSchemaOnViewport(vp: Viewport) {
		const tool = graphicSchemaStore.tool;
		clearSchemaViewportLayers(vp);
		drawGraphicLinear(vp, tool);
		drawGraphicPointer(vp, tool);
		buildSelectionLayers(vp);
	}

	watch(
		() => objects.value,
		() => {
			const pointerObjs = objects.value
				.filter(isPointerGraphicObjectDto)
				.map((object) =>
					createGraphicObjectFromDto(
						object,
						getDescriptionByType(
							descriptions.value,
							object.featureObjectType,
						),
					),
				);
			const linearObjs = objects.value
				.filter(isLinearGraphicObjectDto)
				.map((object) =>
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

			if (viewport) {
				redrawSchemaOnViewport(viewport);
			}
		},
		{
			immediate: true,
			deep: true,
		},
	);

	function renderSchema(app: Application): Viewport {
		viewport = initViewport(app);

		const tool = graphicSchemaStore.tool;
		// fitFullSchema();

		drawGraphicLinear(viewport, tool);
		drawGraphicPointer(viewport, tool);
		buildSelectionLayers(viewport);

		return viewport;
	}

	/** Слой selection: контур поверх базового объекта, hover и отрисовка в DemoTool. */
	function buildSelectionLayers(viewport: Viewport) {
		const pointerSelected: SelectedPointerGraphicObject[] = [];
		const linearSelected: SelectedLinearGraphicObject[] = [];

		for (const o of graphicSchemaStore.pointerObjs) {
			const selected = new SelectedPointerGraphicObject({
				id: o.idObject,
				objectType: "pointer",
				techObjectId: o.data?.techObjectId,
				position: { ...o.position },
				rotateAngle: o.rotationAngle,
				flipHorizontal: o.flipHorizontal,
				flipVertical: o.flipVertical,
				offsets: o.offsets,
			});
			selected.setObjectScheme(o);
			selected.graphics.visible = false;
			selected.graphics.zIndex = 15;
			/** Пока контур скрыт — не участвуем в hit-test, иначе блокируем контейнер объекта снизу и hover не сработает. */
			selected.graphics.eventMode = "none";
			viewport.addChild(selected.draw());

			const showPointerSelection = () => {
				selected.graphics.visible = true;
				selected.graphics.eventMode = "static";
			};
			const hidePointerSelection = () => {
				if (
					graphicSchemaStore.selectionDragObjectId === o.idObject
				) {
					return;
				}
				selected.graphics.visible = false;
				selected.graphics.eventMode = "none";
			};

			const container = viewport.getChildByLabel(
				o.idObject.toString(),
			) as Container | null;
			if (container) {
				container.eventMode = "static";
				container.onpointerenter = showPointerSelection;
				/** Контур по hover вешался только на контейнер; при пустом/битом hitArea события шли с фигуры — дублируем на graphics. */
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
			const selected = new SelectedLinearGraphicObject({
				id: o.idObject,
				objectType: "linear",
				techObjectId: o.data?.techObjectId,
				points: o.points.map((p) => ({ ...p })),
			});
			selected.setObjectScheme(o);
			selected.setOutlineVisible(false);
			viewport.addChild(...selected.draw());

			const baseShadow = viewport.getChildByLabel(
				`${o.idObject}-shadow`,
			);
			const baseLine = viewport.getChildByLabel(
				o.idObject.toString(),
			);
			const showLinear = () => {
				if (
					graphicSchemaStore.selectionDragObjectId === o.idObject
				) {
					return;
				}
				selected.setOutlineVisible(true);
			};
			const hideLinear = () => {
				if (
					graphicSchemaStore.selectionDragObjectId === o.idObject
				) {
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
		viewport.sortableChildren = true;
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
