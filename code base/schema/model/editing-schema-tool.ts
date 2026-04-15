import {
    adaptToGrid,
    LinearGraphicObject,
    PointerGraphicObject,
    SelectedLinearGraphicObject,
    SelectedPointerGraphicObject,
    TextualGraphicObject,
    SelectedTextualGraphicObject,
    type SelectedGraphicObjectsLayer,
    type XYPosition,
    type ITool,
    GraphicObjectScheme,
    SelectedGraphicObject,
} from "@/shared/graphical-editor";
import { useSelectedObjectStore } from "@/entities/select-object";
import { useGraphicSchemeStore } from "@/shared/graphical-editor/model/stores";
import { Viewport } from "pixi-viewport";
import { GraphicsContext, Matrix, type FederatedPointerEvent, type Graphics } from "pixi.js";
import type { MenuItem } from "primevue/menuitem";
import { findClosestSegment, normalizeAngle } from "@/shared/graphical-editor/lib";
import { useLabelEditorStore } from "@/pages/panels/label-editor";
import {
    createEmptyLabel,
    createLabelsByAllObjects,
    createLabelsBySelectedObjects,
    createLabelsByTechObjects,
    getAllTechTypes,
    getMenuItemTechTypes,
} from "../lib";
import { useFocusApp } from "@/shared/graphical-editor";
import { AppenderLabelItems } from "@/features/append-label";

export class EditingSchemaTool implements ITool {
    contextMenu: any;
    itemsContextMenu: MenuItem[];
    objectsPosition?: XYPosition;
    appenderLabels?: AppenderLabelItems;
    constructor() {
        this.contextMenu = undefined;
        this.itemsContextMenu = [];
        this.appenderLabels = undefined;
    }

    async onMouseDownPointerObject(event: FederatedPointerEvent, object: PointerGraphicObject) {
        const graphicSchemeStore = useGraphicSchemeStore();
        const projectsStore = useProjectsStore();
        const selectedObjectStore = useSelectedObjectStore();
        const viewport = graphicSchemeStore.getViewport();
        const positionApp = graphicSchemeStore.getPositionApp;
        if (!viewport) return;
        if (graphicSchemeStore.isDragObjects) {
            viewport.plugins.pause("drag");
        }
        graphicSchemeStore.isDragPan = true;

        let initPosition: Map<number, XYPosition>;
        let initTextualPosition: Map<number, XYPosition>;
        let initPoints: Map<number, XYPosition[]>;
        let currentPosition: XYPosition | undefined;
        const prevPosition = ref<XYPosition | undefined>();

        const moveObjectId: number = object.idObject;
        const abortController = new AbortController();

        //ЕСЛИ НЕ НАЖАТ CTRL ОЧИЩАЕМ ВЫДЕЛЕННЕЫ ОБЪЕКТЫ
        if (!event.ctrlKey) graphicSchemeStore.clearSelectionObjects();
        //СОЗДАЁМ НОВЫЙ ВЫДЕЛЕНЫЙ ОБЪЕКТ
        const selectObject = new SelectedPointerGraphicObject({
            id: object.idObject,
            graphType: object.graphType,
            techObjectId: object.techObjectId,
            position: object.position,
            rotateAngle: object.rotationAngle,
            techType: object.techType,
            flipHorizontal: object.flipHorizontal,
            flipVertical: object.flipVertical,
            objectType: object.objectType,
        });
        //ДОБАВЛЯЕМ ССЛЫКУ НА ОБЪЕКТ НИЖНЕГО СЛОЯ
        selectObject.setObjectScheme(object);

        //ДОБАВЛЯЕМ В СЛОЙ ВЫДЕЛЕННЫХ ОБЪЕКТОВ
        graphicSchemeStore.addSelectedPointerObject(selectObject);
        graphicSchemeStore.isDragPan = true;

        //ОТРИСОВКА ОБЪЕКТА
        if (viewport) {
            const container = selectObject.draw();
            viewport.addChild(container);
            await nextTick();
            viewport.update(2);
            viewport._onUpdate();
        }

        //ИЗМЕНЯЕМ  ID ВЫДЕЛЕННОГО ОБЪЕКТА В СТОРЕ ВЫДЕЛЕНЫХ ОБЪХЕКТОВ ТЕХ. И ГРАФ.
        selectedObjectStore.setSelectedObject(
            {
                id: selectObject.techObjectId!,
                type: object.techType!,
            },
            event.ctrlKey
        );
        selectedObjectStore.selectedGraphicObjectId = selectObject.idObject;

        //ИНИЦИАЛИЗИРУЕМ ПОЗИЦИИ
        prevPosition.value = viewport.toWorld(event.clientX - positionApp.x, event.clientY - positionApp.y);
        currentPosition = { ...object.position };

        const selectedObjects = graphicSchemeStore.scheme.layerSelectedGraphicObject;
        initPosition = new Map<number, XYPosition>(selectedObjects.pointer.map(n => [n.idObject, n.position]));
        initTextualPosition = new Map<number, XYPosition>(selectedObjects.textual.map(n => [n.idObject, n.position]));
        initPoints = new Map<number, XYPosition[]>(selectedObjects.linear.map(n => [n.idObject, n.points]));

        //ДОБАВЛЯЕМ СОБЫТИЯ НА ПЕРЕМЕЩЕНИ И ОТПУСКАНИЯ МЫШИ
        if (graphicSchemeStore.isDragObjects) {
            EditingSchemaTool.initEventsMoues(
                selectedObjects as unknown as SelectedGraphicObjectsLayer,
                viewport as Viewport,
                abortController,
                initPosition,
                initTextualPosition,
                initPoints,
                positionApp,
                projectsStore.projectId!,
                prevPosition,
                currentPosition,
                moveObjectId
            );
        }
    }

    async onMouseDownLinearObject(event: FederatedPointerEvent, object: LinearGraphicObject, selectedNodeId?: string) {
        const graphicSchemeStore = useGraphicSchemeStore();
        const projectsStore = useProjectsStore();
        const selectedObjectStore = useSelectedObjectStore();
        const viewport = graphicSchemeStore.getViewport();
        const positionApp = graphicSchemeStore.getPositionApp;
        if (!viewport) return;

        if (graphicSchemeStore.isDragObjects) {
            viewport.plugins.pause("drag");
        }

        graphicSchemeStore.isDragPan = true;

        let initPosition: Map<number, XYPosition>;
        let initTextualPosition: Map<number, XYPosition>;
        let initPoints: Map<number, XYPosition[]>;
        const prevPosition = ref<XYPosition | undefined>();
        const abortController = new AbortController();
        const moveObjectId: number = object.idObject;

        if (!event.ctrlKey) graphicSchemeStore.clearSelectionObjects();
        const selectedObjects = graphicSchemeStore.scheme.layerSelectedGraphicObject;

        const selectObject = new SelectedLinearGraphicObject({
            id: object.idObject,
            graphType: object.graphType,
            techObjectId: object.techObjectId,
            points: object.points,
            techType: object.techType,
            objectType: object.objectType,
        });

        selectObject.setObjectScheme(object);
        graphicSchemeStore.addSelectedLinearObject(selectObject);
        if (viewport) {
            viewport.addChild(...selectObject.draw());
            await nextTick();
            viewport._onUpdate();
        }

        prevPosition.value = viewport.toWorld(event.clientX - positionApp.x, event.clientY - positionApp.y);
        selectedObjectStore.setSelectedObject(
            {
                id: selectObject.techObjectId!,
                type: object.techType!,
            },
            event.ctrlKey
        );
        selectedObjectStore.selectedGraphicObjectId = selectObject.idObject;

        initPosition = new Map<number, XYPosition>(selectedObjects.pointer.map(n => [n.idObject, n.position]));
        initTextualPosition = new Map<number, XYPosition>(selectedObjects.textual.map(n => [n.idObject, n.position]));
        initPoints = new Map<number, XYPosition[]>(selectedObjects.linear.map(n => [n.idObject, n.points]));

        //ДОБАВЛЯЕМ СОБЫТИЯ НА ПЕРЕМЕЩЕНИ И ОТПУСКАНИЯ МЫШИ
        if (graphicSchemeStore.isDragObjects) {
            EditingSchemaTool.initEventsMoues(
                selectedObjects as unknown as SelectedGraphicObjectsLayer,
                viewport as Viewport,
                abortController,
                initPosition,
                initTextualPosition,
                initPoints,
                positionApp,
                projectsStore.projectId!,
                prevPosition,
                undefined,
                moveObjectId,
                selectedNodeId
            );
        }
    }

    async onMouseDownTextualObject(event: MouseEvent, object: TextualGraphicObject) {
        const graphicSchemeStore = useGraphicSchemeStore();
        const projectsStore = useProjectsStore();
        const selectedObjectStore = useSelectedObjectStore();
        const labelEditorStore = useLabelEditorStore();
        const viewport = graphicSchemeStore.getViewport();
        const positionApp = graphicSchemeStore.getPositionApp;
        if (!viewport) return;

        graphicSchemeStore.isDragPan = true;

        let initObjectsPosition: Map<number, XYPosition>;
        let initTextualPosition: Map<number, XYPosition>;
        let initPoints: Map<number, XYPosition[]>;
        let currentPosition: XYPosition | undefined;
        const prevPosition = ref<XYPosition | undefined>();

        const moveObjectId: number = object.idObject;
        const abortController = new AbortController();

        //ЕСЛИ НЕ НАЖАТ CTRL ОЧИЩАЕМ ВЫДЕЛЕННЕЫ ОБЪЕКТЫ
        if (!event.ctrlKey) graphicSchemeStore.clearSelectionObjects();
        //СОЗДАЁМ НОВЫЙ ВЫДЕЛЕНЫЙ ОБЪЕКТ
        const selectObject = new SelectedTextualGraphicObject({
            id: object.idObject,
            graphType: object.graphType,
            techObjectId: object.techObjectId,
            position: object.position,
            techType: object.techType,
            objectType: object.objectType,
        });
        //ДОБАВЛЯЕМ ССЛЫКУ НА ОБЪЕКТ НИЖНЕГО СЛОЯ
        selectObject.setObjectScheme(object);

        //ДОБАВЛЯЕМ В СЛОЙ ВЫДЕЛЕННЫХ ОБЪЕКТОВ
        graphicSchemeStore.addSelectedTextualObject(selectObject);
        viewport.plugins.pause("drag");
        graphicSchemeStore.isDragPan = true;

        //ОТРИСОВКА ОБЪЕКТА
        if (viewport) {
            const container = selectObject.draw();
            viewport.addChild(container);
            await nextTick();
            viewport.update(2);
            viewport._onUpdate();
        }

        //ИЗМЕНЯЕМ  ID ВЫДЕЛЕННОГО ОБЪЕКТА В СТОРЕ ВЫДЕЛЕНЫХ ОБЪХЕКТОВ ТЕХ. И ГРАФ.
        selectedObjectStore.setSelectedObject(
            {
                id: selectObject.techObjectId!,
                type: object.techType!,
            },
            event.ctrlKey
        );
        selectedObjectStore.selectedGraphicObjectId = selectObject.idObject;

        //Добавляем в стор мониторов
        labelEditorStore.setSelectedLabel(object as GraphicObjectLabel);

        //ИНИЦИАЛИЗИРУЕМ ПОЗИЦИИ
        prevPosition.value = viewport.toWorld(event.clientX - positionApp.x, event.clientY - positionApp.y);
        currentPosition = { ...object.position };

        const selectedObjects = graphicSchemeStore.scheme.layerSelectedGraphicObject;
        initObjectsPosition = new Map<number, XYPosition>(selectedObjects.pointer.map(n => [n.idObject, n.position]));
        initTextualPosition = new Map<number, XYPosition>(selectedObjects.textual.map(n => [n.idObject, n.position]));
        initPoints = new Map<number, XYPosition[]>(selectedObjects.linear.map(n => [n.idObject, n.points]));

        //ДОБАВЛЯЕМ СОБЫТИЯ НА ПЕРЕМЕЩЕНИ И ОТПУСКАНИЯ МЫШИ
        EditingSchemaTool.initEventsMoues(
            selectedObjects as unknown as SelectedGraphicObjectsLayer,
            viewport as Viewport,
            abortController,
            initObjectsPosition,
            initTextualPosition,
            initPoints,
            positionApp,
            projectsStore.projectId!,
            prevPosition,
            currentPosition,
            moveObjectId
        );
    }

    async onMouseDownSelectedPointerObject(event: MouseEvent, object: SelectedPointerGraphicObject) {
        const graphicSchemeStore = useGraphicSchemeStore();
        const projectsStore = useProjectsStore();

        const viewport = graphicSchemeStore.getViewport();
        const positionApp = graphicSchemeStore.getPositionApp;
        const selectedObjects = graphicSchemeStore.scheme.layerSelectedGraphicObject;
        const abortController = new AbortController();

        const moveObjectId: number = object.idObject;
        let initObjectsPosition: Map<number, XYPosition>;
        let initTextualPosition: Map<number, XYPosition>;
        let initPoints: Map<number, XYPosition[]>;
        let currentPosition: XYPosition | undefined;
        const prevPosition = ref<XYPosition | undefined>();

        if (!viewport) return;
        if (graphicSchemeStore.isDragObjects) {
            viewport.plugins.pause("drag");
        }
        graphicSchemeStore.isDragPan = true;

        prevPosition.value = viewport.toWorld(event.clientX - positionApp.x, event.clientY - positionApp.y);
        currentPosition = { ...object.position };
        initObjectsPosition = new Map<number, XYPosition>(selectedObjects.pointer.map(n => [n.idObject, n.position]));
        initTextualPosition = new Map<number, XYPosition>(selectedObjects.textual.map(n => [n.idObject, n.position]));
        initPoints = new Map<number, XYPosition[]>(selectedObjects.linear.map(n => [n.idObject, n.points]));

        if (graphicSchemeStore.isDragObjects) {
            EditingSchemaTool.initEventsMoues(
                selectedObjects as unknown as SelectedGraphicObjectsLayer,
                viewport as Viewport,
                abortController,
                initObjectsPosition,
                initTextualPosition,
                initPoints,
                positionApp,
                projectsStore.projectId!,
                prevPosition,
                currentPosition,
                moveObjectId
            );
        }
    }

    async onMouseDownSelectedLinearObject(
        event: MouseEvent,
        object: SelectedLinearGraphicObject,
        selectNodeId?: string
    ) {
        const graphicSchemeStore = useGraphicSchemeStore();
        const projectsStore = useProjectsStore();

        const viewport = graphicSchemeStore.getViewport();
        const positionApp = graphicSchemeStore.getPositionApp;
        const selectedObjects = graphicSchemeStore.scheme.layerSelectedGraphicObject;
        const abortController = new AbortController();

        const moveObjectId: number = object.idObject;
        let initObjectsPosition: Map<number, XYPosition>;
        let initTextualPosition: Map<number, XYPosition>;
        let initPoints: Map<number, XYPosition[]>;
        let currentPosition: XYPosition | undefined;
        const prevPosition = ref<XYPosition | undefined>();

        if (!viewport) return;
        if (graphicSchemeStore.isDragObjects) {
            viewport.plugins.pause("drag");
        }
        graphicSchemeStore.isDragPan = true;

        prevPosition.value = viewport.toWorld(event.clientX - positionApp.x, event.clientY - positionApp.y);
        initObjectsPosition = new Map<number, XYPosition>(selectedObjects.pointer.map(n => [n.idObject, n.position]));
        initTextualPosition = new Map<number, XYPosition>(selectedObjects.textual.map(n => [n.idObject, n.position]));
        initPoints = new Map<number, XYPosition[]>(selectedObjects.linear.map(n => [n.idObject, n.points]));

        if (graphicSchemeStore.isDragObjects) {
            EditingSchemaTool.initEventsMoues(
                selectedObjects as unknown as SelectedGraphicObjectsLayer,
                viewport as Viewport,
                abortController,
                initObjectsPosition,
                initTextualPosition,
                initPoints,
                positionApp,
                projectsStore.projectId!,
                prevPosition,
                currentPosition,
                moveObjectId,
                selectNodeId
            );
        }
    }

    async onMouseDownSelectedArea(event: FederatedPointerEvent) {
        const graphicSchemeStore = useGraphicSchemeStore();
        const projectsStore = useProjectsStore();
        const viewport = graphicSchemeStore.getViewport();
        const positionApp = graphicSchemeStore.getPositionApp;
        const selectedObjects = graphicSchemeStore.scheme.layerSelectedGraphicObject;
        const abortController = new AbortController();

        let initPosition: Map<number, XYPosition>;
        let initTextualPosition: Map<number, XYPosition>;
        let initPoints: Map<number, XYPosition[]>;
        let currentPosition: XYPosition | undefined;
        const prevPosition = ref<XYPosition | undefined>();

        if (!viewport) return;
        if (graphicSchemeStore.isDragObjects) {
            viewport.plugins.pause("drag");
        }
        graphicSchemeStore.isDragPan = true;

        prevPosition.value = viewport.toWorld(event.clientX - positionApp.x, event.clientY - positionApp.y);
        initPosition = new Map<number, XYPosition>(selectedObjects.pointer.map(n => [n.idObject, n.position]));
        initTextualPosition = new Map<number, XYPosition>(selectedObjects.textual.map(n => [n.idObject, n.position]));
        initPoints = new Map<number, XYPosition[]>(selectedObjects.linear.map(n => [n.idObject, n.points]));
        if (graphicSchemeStore.isDragObjects) {
            EditingSchemaTool.initEventsMoues(
                selectedObjects as unknown as SelectedGraphicObjectsLayer,
                viewport as Viewport,
                abortController,
                initPosition,
                initTextualPosition,
                initPoints,
                positionApp,
                projectsStore.projectId!,
                prevPosition,
                currentPosition
            );
        }
    }

    async onSelectionAreaEnd(
        hitPointerObjects: PointerGraphicObject[],
        hitLinearObjects: LinearGraphicObject[],
        isDraw: boolean
    ) {
        const graphicSchemaStore = useGraphicSchemeStore();
        const selectedObjectStore = useSelectedObjectStore();
        const viewport = graphicSchemaStore.getViewport();
        graphicSchemaStore.clearSelectionObjects();
        if (!viewport) {
            return {
                selectedPointerObjects: [],
                selectedLinearObjects: [],
            };
        }

        const selectedPointerObjects: SelectedPointerGraphicObject[] = [];
        const selectedLinearObjects: SelectedLinearGraphicObject[] = [];

        hitPointerObjects.forEach(object => {
            const selectedObject = new SelectedPointerGraphicObject({
                id: object.idObject,
                graphType: object.graphType,
                techObjectId: object.techObjectId,
                position: object.position,
                rotateAngle: object.rotationAngle,
                techType: object.techType,
                flipHorizontal: object.flipHorizontal,
                flipVertical: object.flipVertical,
                objectType: object.objectType,
            });
            //ДОБАВЛЯЕМ ССЛЫКУ НА ОБЪЕКТ НИЖНЕГО СЛОЯ
            selectedObject.setObjectScheme(object);
            selectedPointerObjects.push(selectedObject);
        });

        hitLinearObjects.forEach(object => {
            const selectedObject = new SelectedLinearGraphicObject({
                id: object.idObject,
                graphType: object.graphType,
                techObjectId: object.techObjectId,
                points: object.points,
                techType: object.techType,
                objectType: object.objectType,
            });
            selectedObject.setObjectScheme(object);
            selectedLinearObjects.push(selectedObject);
        });
        if (isDraw) {
            if (selectedLinearObjects.length > 0) {
                viewport.addChild(...selectedLinearObjects.flatMap(obj => obj.draw()));
            }
            if (selectedPointerObjects.length > 0) {
                viewport.addChild(...selectedPointerObjects.map(obj => obj.draw()));
            }
            await nextTick();
            viewport.update(2);
            viewport._onUpdate();
        }

        graphicSchemaStore.addSelectedPointerObjects(selectedPointerObjects);
        graphicSchemaStore.addSelectedLinearObjects(selectedLinearObjects);
        await nextTick();
        const allObjects = [...selectedPointerObjects, ...selectedLinearObjects];

        if (allObjects.length > 0) {
            selectedObjectStore.setSelectedObject(
                allObjects.map(obj => ({
                    id: obj.techObjectId!,
                    type: obj.techType!,
                }))
            );
            selectedObjectStore.selectedGraphicObjectId = allObjects[0].idObject;
        }

        return {
            selectedPointerObjects,
            selectedLinearObjects,
        };
    }

    async onMouseDownSelectedTextualObject(event: MouseEvent, object: SelectedTextualGraphicObject) {
        const graphicSchemeStore = useGraphicSchemeStore();
        const projectsStore = useProjectsStore();

        const viewport = graphicSchemeStore.getViewport();
        const positionApp = graphicSchemeStore.getPositionApp;
        const selectedObjects = graphicSchemeStore.scheme.layerSelectedGraphicObject;
        const abortController = new AbortController();

        const moveObjectId: number = object.idObject;
        let initObjectPosition: Map<number, XYPosition>;
        let initTextualPosition: Map<number, XYPosition>;
        let initPoints: Map<number, XYPosition[]>;
        let currentPosition: XYPosition | undefined;
        const prevPosition = ref<XYPosition | undefined>();

        if (!viewport) return;
        viewport.plugins.pause("drag");
        graphicSchemeStore.isDragPan = true;

        prevPosition.value = viewport.toWorld(event.clientX - positionApp.x, event.clientY - positionApp.y);
        currentPosition = { ...object.position };
        initTextualPosition = new Map<number, XYPosition>(selectedObjects.textual.map(t => [t.idObject, t.position]));
        initObjectPosition = new Map<number, XYPosition>(selectedObjects.pointer.map(t => [t.idObject, t.position]));
        initPoints = new Map<number, XYPosition[]>(selectedObjects.linear.map(n => [n.idObject, n.points]));

        EditingSchemaTool.initEventsMoues(
            selectedObjects as unknown as SelectedGraphicObjectsLayer,
            viewport as Viewport,
            abortController,
            initObjectPosition,
            initTextualPosition,
            initPoints,
            positionApp,
            projectsStore.projectId!,
            prevPosition,
            currentPosition,
            moveObjectId
        );
    }

    private static initEventsMoues(
        selectedObjects: SelectedGraphicObjectsLayer,
        viewport: Viewport,
        abortController: AbortController,
        initPosition: Map<number, XYPosition>,
        initTextualPosition: Map<number, XYPosition>,
        initPoints: Map<number, XYPosition[]>,
        positionApp: XYPosition,
        projectId: number,
        prevPosition: Ref<XYPosition | undefined>,
        currentPosition?: XYPosition,
        moveObjectId?: number,
        selectedNodeId?: string
    ) {
        document.addEventListener(
            "mouseup",
            async event =>
                await EditingSchemaTool.onMouseUp(
                    selectedObjects,
                    viewport as Viewport,
                    abortController,
                    initPosition,
                    initTextualPosition,
                    initPoints,
                    prevPosition,
                    currentPosition,
                    moveObjectId,
                    projectId
                ),
            {
                signal: abortController.signal,
            }
        );
        document.addEventListener(
            "mousemove",
            async event =>
                await EditingSchemaTool.onMouseMove(
                    event,
                    viewport as Viewport,
                    selectedObjects,
                    positionApp,
                    prevPosition,
                    currentPosition,
                    moveObjectId,
                    selectedNodeId
                ),
            {
                signal: abortController.signal,
            }
        );
    }

    private static async onMouseMove(
        event: MouseEvent,
        viewport: Viewport,
        selectedObjects: SelectedGraphicObjectsLayer,
        positionApp: XYPosition,
        prevPosition: Ref<XYPosition | undefined>,
        currentPosition?: XYPosition,
        moveObjectId?: number,
        selectedNodeId?: string
    ) {
        const graphicSchemeStore = useGraphicSchemeStore();
        // Преобразуем координаты мыши в координаты canvas
        const position = viewport.toWorld(event.clientX - positionApp.x, event.clientY - positionApp.y);

        //ИНИЦИАЛИЗИРУЕМ ПОЗИЦИЮ И ДЕЛЬТУ ПРЕМЕЩЕНИЯ
        if (!prevPosition.value) return;
        const delta: XYPosition = {
            x: position.x - prevPosition.value.x,
            y: position.y - prevPosition.value.y,
        };

        const selectedArea = viewport.getChildByLabel("area-selected") as Graphics | undefined;
        if (selectedArea && graphicSchemeStore.boundsSelectedArea) {
            const newBoundsArea = graphicSchemeStore.boundsSelectedArea.clone();
            newBoundsArea.applyMatrix(new Matrix().translate(delta.x, delta.y));
            const position: XYPosition = adaptToGrid({ x: newBoundsArea.minX, y: newBoundsArea.minY });

            selectedArea.context = new GraphicsContext()
                .rect(position.x, position.y, newBoundsArea.width, newBoundsArea.height)
                .stroke({ width: 4, color: 0x3399ff })
                .fill({ color: "#0369a1", alpha: 0.3 });

            graphicSchemeStore.boundsSelectedArea = newBoundsArea;
        }
        //ПРОХОДИМСЯ ПО СЛОЮ ВЫДЕЛЕННЫХ ОБЪЕКТОВ (ОТДЕЛЬНО ПО ТОЧЕЧНЫМ И ОТДЕЛЬНО ПО ЛИНЕЙНЫМ)
        selectedObjects.pointer.forEach(selectObject => {
            //ОБНОВЛЯЕМ ПОЗИЦИИИ НА ДЕЛЬТУ
            selectObject.position = {
                x: selectObject.position.x + delta.x,
                y: selectObject.position.y + delta.y,
            };
            if (!selectedArea) {
                selectObject.draw();
            }
        });

        selectedObjects.linear.forEach(selectObject => {
            //ЕСЛИ МЫ ПЕРЕДВИГАЕМ ОПОРНУЮ ТОЧНКУ У ВЫДЛЕННОГО  ОБЪЕКТА ЗНАЧИТ ОСТАЛЬНЫЕ ТОЧИК НЕ ОБНОВЛЯЮТСЯ
            const object = selectObject.idObject === moveObjectId ? selectObject : undefined;
            const nodeIndex = object !== undefined ? object.nodes.findIndex(n => n.objectId == selectedNodeId) : -1;
            if (object && nodeIndex !== -1) {
                object.points[nodeIndex].x += delta.x;
                object.points[nodeIndex].y += delta.y;
            } else {
                selectObject.points = selectObject.points.map(p => ({
                    x: p.x + delta.x,
                    y: p.y + delta.y,
                }));
            }
            if (!selectedArea) {
                selectObject.draw();
            }
        });

        selectedObjects.textual.forEach(selectObject => {
            //ОБНОВЛЯЕМ ПОЗИЦИИИ НА ДЕЛЬТУ
            selectObject.position = {
                x: selectObject.position.x + delta.x,
                y: selectObject.position.y + delta.y,
            };
            selectObject.draw();
        });

        prevPosition.value = position;
        await nextTick();
    }

    private static async onMouseUp(
        selectedObjects: SelectedGraphicObjectsLayer,
        viewport: Viewport,
        abortController: AbortController,
        initPosition: Map<number, XYPosition>,
        initTextualPosition: Map<number, XYPosition>,
        initPoints: Map<number, XYPosition[]>,
        prevPosition: Ref<XYPosition | undefined>,
        currentPosition: XYPosition | undefined,
        moveObjectId: number | undefined,
        projectId: number
    ) {
        const graphicSchemeStore = useGraphicSchemeStore();
        viewport.plugins.resume("drag");
        graphicSchemeStore.isDragPan = false;
        abortController.abort();
        const objectRequests: GraphicObjectDto[] = [];
        const labelsRequests: GraphicLabelDto[] = [];
        for (const selectObject of selectedObjects.pointer) {
            selectObject.normalizeToGrid();
            objectRequests.push({
                id: selectObject.idObject,
                type: selectObject.graphType!,
                position: selectObject.getComputedObjectPosition(selectObject.position),
                techObjectId: selectObject.techObjectId!,
                rotationAngle: selectObject.rotationAngle,
                flipHorizontal: selectObject.flipHorizontal,
                flipVertical: selectObject.flipVertical,
            });
            if (selectObject.objectScheme) {
                const textObjs = graphicSchemeStore.textalObjs.filter(
                    text => (text.data as GraphicLabelDto).linkedGraphicObjectId === selectObject.idObject
                );
                const delta: XYPosition = {
                    x: selectObject.position.x - selectObject.objectScheme.position.x,
                    y: selectObject.position.y - selectObject.objectScheme.position.y,
                };
                labelsRequests.push(
                    ...textObjs.map<GraphicLabelDto>(t => ({
                        ...t.data,
                        position: { x: t.position.x + delta.x, y: t.position.y + delta.y },
                    }))
                );
                textObjs.forEach(t => {
                    t.refreshPosition({ x: t.position.x + delta.x, y: t.position.y + delta.y }, viewport);
                });
            }
        }
        for (const selectObject of selectedObjects.linear) {
            selectObject.normalizeToGrid();
            const points = selectObject.points;
            if (moveObjectId == selectObject.idObject) {
            }
            objectRequests.push({
                id: selectObject.idObject,
                type: selectObject.graphType!,
                techObjectId: selectObject.techObjectId!,
                points: points,
            });
            if (selectObject.objectScheme) {
                const textObjs = graphicSchemeStore.textalObjs.filter(
                    text => (text.data as GraphicLabelDto).linkedGraphicObjectId === selectObject.idObject
                );
                const delta: XYPosition = {
                    x: selectObject.points[0].x - selectObject.objectScheme.points[0].x,
                    y: selectObject.points[0].y - selectObject.objectScheme.points[0].y,
                };
                labelsRequests.push(
                    ...textObjs.map<GraphicLabelDto>(t => ({
                        ...t.data,
                        position: { x: t.position.x + delta.x, y: t.position.y + delta.y },
                    }))
                );
            }
        }
        for (const selectObject of selectedObjects.textual) {
            selectObject.normalizeToGrid();
            if (selectObject.objectScheme) {
                labelsRequests.push({
                    ...selectObject.objectScheme.data,
                    position: selectObject.position,
                });
            }
        }

        const responseObjects = await editGraphicObjects(projectId!, objectRequests);
        const responseLabels = await redactGraphicLabels(projectId!, labelsRequests);

        if (!responseObjects.error) {
            selectedObjects.linear.forEach(selectObject => {
                selectObject.move(selectObject.points, viewport);
            });
            selectedObjects.pointer.forEach(selectObject => {
                selectObject.move(selectObject.position, viewport);
            });
        } else {
            selectedObjects.pointer.forEach(selectObject => {
                selectObject.cancel(initPosition.get(selectObject.idObject)!);
            });
            selectedObjects.linear.forEach(selectObject => {
                selectObject.cancel(initPoints.get(selectObject.idObject)!);
            });
        }

        if (!responseLabels.error) {
            selectedObjects.textual.forEach(selectObject => {
                selectObject.move(selectObject.position, viewport);
            });
        } else {
            selectedObjects.textual.forEach(selectObject => {
                selectObject.cancel(initTextualPosition.get(selectObject.idObject)!);
            });
        }

        prevPosition.value = undefined;
        currentPosition = undefined;
    }

    async onContextMenuPointerObject(
        event: FederatedPointerEvent,
        pointerObject: PointerGraphicObject | SelectedPointerGraphicObject
    ) {
        this.itemsContextMenu = this.getItemsContextMenuPointer(pointerObject);
        await nextTick();
        this.contextMenu.show(event);
    }
    async onContextMenuLinearObject(event: FederatedPointerEvent, objectId: number) {
        this.itemsContextMenu = this.getItemsContextMenuLinear(event, objectId);
        await nextTick();
        this.contextMenu.show(event);
    }
    async onContextMenuTextualObject(event: FederatedPointerEvent, objectId: number) {
        this.itemsContextMenu = this.getItemsContextMenuTextual(event, objectId);
        await nextTick();
        this.contextMenu.show(event);
    }

    async onContextMenuNodeObject(event: FederatedPointerEvent, objectId: number, nodeIndex: number) {
        this.itemsContextMenu = this.getItemsContextMenuNode(objectId, nodeIndex);
        await nextTick();
        this.contextMenu.show(event);
    }

    async onContextMenuPane(event: FederatedPointerEvent) {
        this.itemsContextMenu = this.getItemsContextMenuPane(event);
        await nextTick();
        this.contextMenu.show(event);
    }

    async onContextMenuSelectedArea(event: FederatedPointerEvent) {
        this.itemsContextMenu = this.getItemsContextSelectedArea();
        await nextTick();
        this.contextMenu.show(event);
    }

    private getItemsContextMenuPointer(pointerObject: PointerGraphicObject | SelectedPointerGraphicObject): MenuItem[] {
        this.appenderLabels = new AppenderLabelItems(
            pointerObject.techObjectId!,
            pointerObject.idObject,
            pointerObject.techType!,
            undefined,
            pointerObject.position
        );

        const graphicSchemaStore = useGraphicSchemeStore();
        const viewport = graphicSchemaStore.getViewport();
        if (!viewport) return [];
        return [
            {
                label: "Copy",
                url: "Ctrl + C",
                icon: "fluent:copy-24-regular",
                class: "text-slate-300",
                command: () => {
                    this.copy(pointerObject.position);
                },
            },
            {
                label: "Turn right",
                icon: "fluent:rotate-right-24-regular",
                class: "text-slate-300",
                command: async () => await this.rotateObject(90),
                disabled: () => !graphicSchemaStore.isDragObjects,
            },
            {
                label: "Turn left",
                icon: "fluent:rotate-left-24-regular",
                class: "text-slate-300",
                command: async () => await this.rotateObject(-90),
                disabled: () => !graphicSchemaStore.isDragObjects,
            },
            {
                label: "Reflect horizontal",
                icon: "fluent:flip-horizontal-24-regular",
                command: async () => await this.reflectObject(),
                disabled: () => !graphicSchemaStore.isDragObjects,
            },
            {
                label: "Reflect vertical",
                icon: "fluent:flip-vertical-24-regular",
                command: async () => await this.reflectObject(false),
                disabled: () => !graphicSchemaStore.isDragObjects,
            },
            {
                separator: true,
            },
            {
                label: "Add label",
                icon: "fluent:slide-text-24-regular",
                items: [
                    {
                        label: "Add empty label",
                        icon: "fluent:slide-text-24-regular",
                        command: async () => {
                            await this.addMointor(pointerObject, pointerObject.position, viewport);
                        },
                    },
                    {
                        label: "Add spectial...",
                        icon: "fluent:settings-20-regular",
                        items: this.appenderLabels.addSpecialPresetsLabel(),
                    },
                    this.appenderLabels.addPassportsPresetsLabel(),
                    this.appenderLabels.addCalculationPresetsLabel(),
                    this.appenderLabels.addRawDataPresetsLabel(),
                    this.appenderLabels.addProcessedDataPresetsLabel(),
                ],
            },
            {
                separator: true,
            },
            {
                label: "Delete object",
                icon: "fluent:delete-24-regular",
                class: "text-red-500",
                url: "Delete",
                command: async () => {
                    await graphicSchemaStore.deleteObjectsGroup();
                },
                disabled: () => !graphicSchemaStore.isDragObjects,
            },
        ];
    }

    private getItemsContextMenuLinear(event: FederatedPointerEvent, linearObjectId: number) {
        //TODO: переделать на linearGraphicObject
        const graphicSchemaStore = useGraphicSchemeStore();
        const selectedLinearObject = graphicSchemaStore.selectedLinearObjs.find(lo => lo.idObject === linearObjectId);
        const linearObject = graphicSchemaStore.linearObjs.find(lo => lo.idObject === linearObjectId);
        if (!linearObject) return [];
        const projectsStore = useProjectsStore();
        const selectedObjectStore = useSelectedObjectStore();
        const viewport = graphicSchemaStore.getViewport();
        if (!viewport) return [];
        const tooltip = graphicSchemaStore.tooltipManager;
        const positionApp = graphicSchemaStore.getPositionApp;
        const selectedPosition = adaptToGrid(
            viewport.toWorld(event.clientX - positionApp.x, event.clientY - positionApp.y)
        );
        this.appenderLabels = new AppenderLabelItems(
            linearObject.techObjectId!,
            linearObject.idObject!,
            linearObject.techType!,
            undefined,
            linearObject.points[0]
        );
        return [
            {
                label: "Copy",
                url: "Ctrl + C",
                icon: "fluent:copy-24-regular",
                class: "text-slate-300",
                command: () => {
                    this.copy(linearObject.points[0]);
                },
            },
            {
                label: "Add intermediate point",
                icon: "fluent:data-line-24-regular",
                class: "text-slate-300",
                command: async () => {
                    if (selectedLinearObject) {
                        const selectedSegment = findClosestSegment(selectedPosition, selectedLinearObject.points);
                        if (!selectedSegment) return;
                        const interPoint: XYPosition = adaptToGrid({
                            x: (selectedSegment.pointStar.x + selectedSegment.pointEnd.x) / 2,
                            y: (selectedSegment.pointStar.y + selectedSegment.pointEnd.y) / 2,
                        });
                        const index = selectedSegment.index + 1;
                        const points = selectedLinearObject.points.toSpliced(index, 0, interPoint);
                        const { error } = await editGraphicObject(projectsStore.projectId!, {
                            id: selectedLinearObject.idObject,
                            type: selectedLinearObject.objectScheme!.graphType!,
                            techObjectId: selectedLinearObject.techObjectId!,
                            points: points,
                        });
                        if (error || graphicSchemaStore.isBadResponse) {
                            return;
                        }
                        await selectedLinearObject.resetPath(points, viewport, tooltip);
                        selectedObjectStore.isUpdated = !selectedObjectStore.isUpdated;
                    }
                },
                disabled: () => !graphicSchemaStore.isDragObjects,
            },
            {
                label: "Add label",
                icon: "fluent:slide-text-24-regular",
                items: [
                    {
                        label: "Add empty label",
                        icon: "fluent:slide-text-24-regular",
                        command: async () => {
                            await this.addMointor(linearObject, linearObject.points[0], viewport);
                        },
                    },
                    {
                        label: "Add spectial...",
                        icon: "fluent:settings-20-regular",
                        items: this.appenderLabels.addSpecialPresetsLabel(),
                    },
                    this.appenderLabels.addPassportsPresetsLabel(),
                    this.appenderLabels.addCalculationPresetsLabel(),
                    this.appenderLabels.addRawDataPresetsLabel(),
                    this.appenderLabels.addProcessedDataPresetsLabel(),
                ],
            },
            {
                label: "Delete object",
                icon: "fluent:delete-24-regular",
                class: "text-red-500",
                url: "Delete",
                command: async () => {
                    if (selectedLinearObject) {
                        await graphicSchemaStore.deleteObjectsGroup();
                    }
                },
                disabled: () => !graphicSchemaStore.isDragObjects,
            },
        ];
    }

    private getItemsContextMenuTextual(event: FederatedPointerEvent, textualObjectId: number): MenuItem[] {
        const graphicSchemaStore = useGraphicSchemeStore();
        const viewport = graphicSchemaStore.getViewport();
        if (!viewport) return [];
        const textualObject = graphicSchemaStore.textalObjs.find(lo => lo.idObject === textualObjectId);
        let delta: XYPosition | undefined;
        if (!textualObject) return [];
        const graphicObject = [...graphicSchemaStore.pointerObjs, ...graphicSchemaStore.linearObjs].find(
            o => o.idObject === textualObject?.data.linkedGraphicObjectId
        );

        const menuItems: MenuItem[] = [
            {
                label: "Apply to...",
                icon: "fluent:slide-arrow-right-20-regular",
                items: [
                    {
                        label: "All Objects",
                        icon: "fluent:flowchart-20-regular",
                        command: async () => {
                            const graphicSchemeStore = useGraphicSchemeStore();
                            const labels = await createLabelsByAllObjects(textualObjectId, delta);
                            if (labels) {
                                labels.forEach(label => {
                                    label.draw(viewport, this);
                                });
                                graphicSchemeStore.addTextualObjects(labels);
                                viewport._onUpdate();
                            }
                        },
                    },
                    {
                        label: "Selected objects",
                        icon: "fluent:flowchart-circle-20-regular",
                        command: async () => {
                            const graphicSchemeStore = useGraphicSchemeStore();
                            const labels = await createLabelsBySelectedObjects(textualObjectId, delta);
                            if (labels) {
                                labels.forEach(label => {
                                    label.draw(viewport, this);
                                });
                                graphicSchemeStore.addTextualObjects(labels);
                                viewport._onUpdate();
                            }
                        },
                    },
                    {
                        label: "Current tech type object",
                        icon: "fluent:wrench-20-regular",
                        visible: () => {
                            return textualObject?.techType !== undefined;
                        },
                        command: async () => {
                            if (textualObject?.techType !== undefined) {
                                const graphicSchemeStore = useGraphicSchemeStore();
                                const labels = await createLabelsByTechObjects(
                                    textualObjectId,
                                    [textualObject.techType],
                                    delta
                                );
                                if (labels) {
                                    labels.forEach(label => {
                                        label.draw(viewport, this);
                                    });
                                    graphicSchemeStore.addTextualObjects(labels);
                                    viewport._onUpdate();
                                }
                            }
                        },
                    },
                    {
                        label: "Tech types object",
                        icon: "fluent:wrench-settings-20-regular",
                        items: getAllTechTypes().map(({ label, techTypes }) =>
                            getMenuItemTechTypes(label, textualObjectId, techTypes, viewport, this, delta)
                        ),
                    },
                ],
            },
        ];

        if (graphicObject && graphicObject instanceof PointerGraphicObject) {
            delta = {
                x: textualObject.position.x - graphicObject.position.x,
                y: textualObject.position.y - graphicObject.position.y,
            };
            this.appenderLabels = new AppenderLabelItems(
                graphicObject.techObjectId!,
                graphicObject.idObject,
                graphicObject.techType!,
                textualObjectId
            );
            menuItems.push({
                label: "Add items...",
                icon: "fluent:slide-text-24-regular",
                items: [
                    {
                        label: "Add spectial...",
                        icon: "fluent:settings-20-regular",
                        items: this.appenderLabels.addSpecialPresetsLabel(),
                    },
                    this.appenderLabels.addPassportsPresetsLabel(),
                    this.appenderLabels.addCalculationPresetsLabel(),
                    this.appenderLabels.addRawDataPresetsLabel(),
                    this.appenderLabels.addProcessedDataPresetsLabel(),
                ],
            });
        }

        return menuItems.concat([
            {
                label: "Delete label",
                icon: "fluent:delete-24-regular",
                class: "text-red-500",
                url: "Delete",
                command: async () => {
                    if (textualObject) {
                        graphicSchemaStore.deleteObjectsGroup();
                    }
                },
                disabled: () => !graphicSchemaStore.isDragObjects,
            },
        ]);
    }

    private getItemsContextMenuNode(linearObjectId: number, nodeIndex: number): MenuItem[] {
        const graphicSchemaStore = useGraphicSchemeStore();
        const projectsStore = useProjectsStore();
        const selectedLinearObject = graphicSchemaStore.selectedLinearObjs.find(lo => lo.idObject === linearObjectId);
        const selectedObjectStore = useSelectedObjectStore();
        const viewport = graphicSchemaStore.getViewport();
        if (!viewport) return [];
        const tooltip = graphicSchemaStore.tooltipManager;
        const linearObject = graphicSchemaStore.linearObjs.find(lo => lo.idObject === linearObjectId);
        if (!linearObject) return [];
        this.appenderLabels = new AppenderLabelItems(
            linearObject.techObjectId!,
            linearObject.idObject!,
            linearObject.techType!,
            undefined,
            linearObject.points[0]
        );
        return [
            {
                label: "Copy",
                url: "Ctrl + C",
                icon: "fluent:copy-24-regular",
                class: "text-slate-300",
                command: () => {
                    this.copy(selectedLinearObject?.points[0]);
                },
            },
            {
                label: "Add label",
                icon: "fluent:slide-text-24-regular",
                items: [
                    {
                        label: "Add empty label",
                        icon: "fluent:slide-text-24-regular",
                        command: async () => {
                            await this.addMointor(linearObject, linearObject.points[0], viewport);
                        },
                    },
                    {
                        label: "Add spectial...",
                        icon: "fluent:settings-20-regular",
                        items: this.appenderLabels.addSpecialPresetsLabel(),
                    },
                    this.appenderLabels.addPassportsPresetsLabel(),
                    this.appenderLabels.addCalculationPresetsLabel(),
                    this.appenderLabels.addRawDataPresetsLabel(),
                    this.appenderLabels.addProcessedDataPresetsLabel(),
                ],
            },
            {
                label: "Delete intermediate point",
                icon: "fluent:circle-hint-dismiss-16-filled",
                class: "text-red-500",
                disabled: () => {
                    if (!graphicSchemaStore.isDragObjects) {
                        return true;
                    }
                    if (selectedLinearObject) {
                        return selectedLinearObject.points.length <= 2;
                    }
                    return true;
                },
                command: async () => {
                    if (selectedLinearObject && projectsStore.projectId) {
                        if (selectedLinearObject) {
                            const points = selectedLinearObject.points.toSpliced(nodeIndex, 1);
                            const { error } = await editGraphicObject(projectsStore.projectId, {
                                id: selectedLinearObject.idObject,
                                type: selectedLinearObject.graphType!,
                                techObjectId: selectedLinearObject.techObjectId!,
                                points: points,
                            });
                            if (error || graphicSchemaStore.isBadResponse) {
                                return;
                            }
                            await selectedLinearObject.resetPath(points, viewport, tooltip);
                            selectedObjectStore.isUpdated = !selectedObjectStore.isUpdated;
                        }
                    }
                },
            },
            {
                label: "Delete object",
                icon: "fluent:delete-24-regular",
                class: "text-red-500",
                url: "Delete",
                command: async () => {
                    if (selectedLinearObject) {
                        await graphicSchemaStore.deleteObjectsGroup();
                    }
                },
            },
        ];
    }
    private getItemsContextMenuPane(event: FederatedPointerEvent): MenuItem[] {
        const graphicSchemaStore = useGraphicSchemeStore();
        const viewport = graphicSchemaStore.getViewport();
        if (!viewport) {
            return [];
        }
        const positionApp = graphicSchemaStore.getPositionApp;
        const selectedPosition = adaptToGrid(
            viewport.toWorld(event.clientX - positionApp.x, event.clientY - positionApp.y)
        );
        return [
            {
                label: "Paste here",
                url: "Ctrl + V",
                icon: "fluent:clipboard-paste-24-regular",
                class: "text-slate-300",
                disabled: () => graphicSchemaStore.bufferObjects.length == 0 || !graphicSchemaStore.isDragObjects,
                command: async () => {
                    if (selectedPosition && this.objectsPosition) {
                        const delta: XYPosition = {
                            x: selectedPosition.x - this.objectsPosition.x,
                            y: selectedPosition.y - this.objectsPosition.y,
                        };
                        await graphicSchemaStore.paste(delta);
                    }
                },
            },
        ];
    }
    private getItemsContextSelectedArea(): MenuItem[] {
        const graphicSchemaStore = useGraphicSchemeStore();
        return [
            {
                label: "Copy",
                url: "Ctrl + C",
                icon: "fluent:copy-24-regular",
                class: "text-slate-300",
                command: () => {
                    const bounds = graphicSchemaStore.boundsSelectedArea;
                    if (bounds) {
                        this.copy({
                            x: bounds.minX,
                            y: bounds.minY,
                        });
                    }
                },
            },
            {
                label: "Delete objects",
                icon: "fluent:delete-24-regular",
                class: "text-red-500",
                url: "Delete",
                command: async () => {
                    await graphicSchemaStore.deleteObjectsGroup();
                },
                disabled: () => !graphicSchemaStore.isDragObjects,
            },
        ];
    }
    rotateObject = async (step: number) => {
        const projectsStore = useProjectsStore();
        const graphicSchemaStore = useGraphicSchemeStore();
        const selectedObjectStore = useSelectedObjectStore();
        const viewport = graphicSchemaStore.getViewport();
        if (projectsStore.projectId && viewport) {
            const requests = graphicSchemaStore.scheme.layerSelectedGraphicObject.pointer.map<GraphicObjectDto>(
                object => ({
                    id: object.idObject,
                    type: object.graphType!,
                    position: object.getComputedObjectPosition(object.position),
                    flipHorizontal: object.flipHorizontal,
                    flipVertical: object.flipVertical,
                    techObjectId: object.techObjectId!,
                    rotationAngle: normalizeAngle(object.rotationAngle + step),
                })
            );
            const response = await editGraphicObjects(projectsStore.projectId, requests);
            if (!response.error && !graphicSchemaStore.isBadResponse) {
                graphicSchemaStore.scheme.layerSelectedGraphicObject.pointer.forEach(object => {
                    object.rotate(normalizeAngle(object.rotationAngle + step), viewport);
                });
                selectedObjectStore.isUpdated = !selectedObjectStore.isUpdated;
            }
        }
    };
    //TODO нужно перенести tooltip в бизнес логику PPS
    private async addMointor(
        object: GraphicObjectScheme | SelectedGraphicObject,
        position: XYPosition,
        viewport: Viewport
    ) {
        const graphicSchemeStore = useGraphicSchemeStore();

        const label = await createEmptyLabel(position, object);
        if (!label) return;
        graphicSchemeStore.addTextualObjects([label]);
        label.draw(viewport, this);
        viewport._onUpdate();
    }
    async reflectObject(isHorizontal: boolean = true): Promise<void> {
        const projectsStore = useProjectsStore();
        const graphicSchemaStore = useGraphicSchemeStore();
        const selectedObjectStore = useSelectedObjectStore();
        const viewport = graphicSchemaStore.getViewport();
        if (!projectsStore.projectId || !viewport) return;
        const requests = graphicSchemaStore.scheme.layerSelectedGraphicObject.pointer.map<GraphicObjectDto>(object => ({
            id: object.idObject,
            type: object.graphType!,
            rotationAngle: object.rotationAngle,
            position: object.getComputedObjectPosition(object.position),
            flipHorizontal: isHorizontal ? !object.flipHorizontal : object.flipHorizontal,
            flipVertical: !isHorizontal ? !object.flipVertical : object.flipVertical,
            techObjectId: object.techObjectId!,
        }));
        const response = await editGraphicObjects(projectsStore.projectId, requests);
        if (!response.error && !graphicSchemaStore.isBadResponse) {
            graphicSchemaStore.scheme.layerSelectedGraphicObject.pointer.forEach(object => {
                if (isHorizontal) {
                    object.reflectHorizontal(viewport);
                } else {
                    object.reflectVertical(viewport);
                }
            });
            selectedObjectStore.isUpdated = !selectedObjectStore.isUpdated;
        }
    }

    useHotKeys(schemeRef: Ref<any>): void {
        const keys = useMagicKeys();
        let deltaPaste: XYPosition = { x: 0, y: 0 };
        // const isHover = useElementHover(schemeRef);
        const { isFocused } = useFocusApp(schemeRef);
        const graphicSchemeStore = useGraphicSchemeStore();

        // Отслеживаем конкретные комбинации
        const ctrlC = keys["Ctrl+C"];
        const ctrlV = keys["Ctrl+V"];
        const del = keys["Delete"];

        function addDeltaPaste() {
            deltaPaste = { x: deltaPaste.x + 10, y: deltaPaste.y + 10 };
            return deltaPaste;
        }

        const cleareDeltaPaste = () => {
            deltaPaste = { x: 0, y: 0 };
        };

        watch(
            () => ctrlC.value,
            async value => {
                if (!isFocused.value || value || !graphicSchemeStore.isDragObjects) return;
                const selectedObjects = [
                    ...graphicSchemeStore.scheme.layerSelectedGraphicObject.pointer,
                    ...graphicSchemeStore.scheme.layerSelectedGraphicObject.linear,
                ];
                if (selectedObjects.length > 0) {
                    const object = selectedObjects[0];
                    if (object instanceof SelectedPointerGraphicObject) {
                        this.copy(object.position);
                    } else {
                        this.copy((object as unknown as SelectedLinearGraphicObject).points[0]);
                    }

                    cleareDeltaPaste();
                }
            }
        );
        watch(
            () => ctrlV.value,
            async value => {
                if (!isFocused.value || value || !graphicSchemeStore.isDragObjects) return;
                await graphicSchemeStore.paste(addDeltaPaste());
            }
        );
        watch(
            () => del.value,
            async value => {
                if (!isFocused.value || value || !graphicSchemeStore.isDragObjects) return;
                await graphicSchemeStore.deleteObjectsGroup();
            }
        );
    }

    private copy(position: XYPosition | undefined) {
        const graphicSchemeStore = useGraphicSchemeStore();
        graphicSchemeStore.copy();
        this.objectsPosition = position;
    }

    static lastPosition = (pos: XYPosition, delta: XYPosition) => ({
        x: pos.x - delta.x,
        y: pos.y - delta.y,
    });
    static nextPosition = (pos: XYPosition, delta: XYPosition) => ({
        x: pos.x + delta.x,
        y: pos.y + delta.y,
    });
}
