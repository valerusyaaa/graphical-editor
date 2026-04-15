import {
    LinearGraphicObject,
    PointerGraphicObject,
    type ObjectInfo,
    SelectedLinearGraphicObject,
    SelectedPointerGraphicObject,
    SelectedTextualGraphicObject,
    TextualGraphicObject,
    BaseTool,
    type ITool,
} from "..";
import { type XYPosition } from "@vue-flow/core";
import { type GraphicSchemeState, type CopyObject } from "./types";
import { useSelectedObjectStore } from "@/entities/select-object";
import { Viewport } from "pixi-viewport";

export const useGraphicSchemeStore = defineStore("graphic-scheme", {
    state: (): GraphicSchemeState => ({
        scheme: {
            layerGraphicObject: {
                linear: [],
                pointer: [],
                textual: [],
            },
            layerSelectedGraphicObject: {
                linear: [],
                pointer: [],
                textual: [],
            },
        },
        app: undefined,
        lastActiveGraphicObject: null,
        tool: new BaseTool(),
        panelInfo: undefined,
        isBadResponse: false,
        isRotateIcon: false,
        bufferObjects: [],
        isDragObjects: true,
        isDragPan: false,
        backroundColor: "black",
        createrCopyObjectsCb: undefined,
        preRenderCbs: [],
        postRenderCbs: [],
        tooltipManager: undefined,
        boundsSelectedArea: undefined,
    }),
    getters: {
        pointerObjs(): PointerGraphicObject[] {
            return this.scheme.layerGraphicObject.pointer as unknown as PointerGraphicObject[];
        },
        linearObjs(): LinearGraphicObject[] {
            return this.scheme.layerGraphicObject.linear as unknown as LinearGraphicObject[];
        },
        textalObjs(): TextualGraphicObject[] {
            return this.scheme.layerGraphicObject.textual as unknown as TextualGraphicObject[];
        },
        selectedPointerObjs(): SelectedPointerGraphicObject[] {
            return this.scheme.layerSelectedGraphicObject.pointer as unknown as SelectedPointerGraphicObject[];
        },
        selectedLinearObjs(): SelectedLinearGraphicObject[] {
            return this.scheme.layerSelectedGraphicObject.linear as unknown as SelectedLinearGraphicObject[];
        },
        selectedTextualObjs(): SelectedTextualGraphicObject[] {
            return this.scheme.layerSelectedGraphicObject.textual as unknown as SelectedTextualGraphicObject[];
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
        /**
         * Удаление линейного объекта
         * */
        async deleteLinearObject(selectedLinearObject: SelectedLinearGraphicObject) {
            const projectsStore = useProjectsStore();
            const viewport = this.getViewport();
            if (!viewport) return;
            const selectedObjectStore = useSelectedObjectStore();
            if (projectsStore.projectId) {
                const { error } = await deleteGraphicObject(projectsStore.projectId, selectedLinearObject.idObject);
                if (error || this.isBadResponse) return;
                await deleteTechObject(projectsStore.projectId, selectedLinearObject.techObjectId!);
                selectedLinearObject.objectScheme?.delete(viewport);
                this.scheme.layerGraphicObject.linear = this.scheme.layerGraphicObject.linear.filter(
                    o => o.idObject !== selectedLinearObject.objectScheme?.idObject
                );
                this.clearSelectionObjects();
                selectedObjectStore.selectedGraphicObjectId = undefined;
            }
        },
        /**
         * Удаление точечного объекта
         **/
        async deletePointerObject(pointerObject: PointerGraphicObject | SelectedPointerGraphicObject) {
            const projectsStore = useProjectsStore();
            const selectedObjectStore = useSelectedObjectStore();
            const viewport = this.getViewport();
            if (!viewport) return;
            if (projectsStore.projectId) {
                const resultGraph = await deleteGraphicObject(projectsStore.projectId, pointerObject.idObject);
                if (resultGraph.error || this.isBadResponse) {
                    return;
                }
                const resultTech = await deleteTechObject(projectsStore.projectId, pointerObject.techObjectId!);
                if (resultTech.error) {
                    return;
                }
                this.clearSelectionObjects();
                if (pointerObject instanceof PointerGraphicObject) {
                    pointerObject.delete(viewport);
                } else {
                    pointerObject.objectScheme?.delete(viewport);
                }
                this.scheme.layerGraphicObject.pointer = this.scheme.layerGraphicObject.pointer.filter(
                    o => o.idObject !== pointerObject.idObject
                );

                selectedObjectStore.selectedGraphicObjectId = undefined;
                selectedObjectStore.setSelectedObject(undefined);
            }
        },
        async deleteObjectsGroup() {
            const projectsStore = useProjectsStore();
            const selectedObjectStore = useSelectedObjectStore();
            const viewport = this.getViewport();
            if (!viewport) return;
            if (projectsStore.projectId) {
                const selectedGraphicObjects = [
                    ...this.scheme.layerSelectedGraphicObject.pointer,
                    ...this.scheme.layerSelectedGraphicObject.linear,
                ];
                const requestLabelsId: number[] = [];
                if (selectedGraphicObjects.length > 0) {
                    const resultGraphics = await deleteGraphicObjects(
                        projectsStore.projectId,
                        selectedGraphicObjects.map(o => o.idObject)
                    );
                    if (resultGraphics.error || this.isBadResponse) return;
                    const resultTech = await deleteTechObjects(
                        projectsStore.projectId,
                        selectedGraphicObjects.map(o => o.idObject)
                    );

                    if (resultTech.error) return;
                    this.scheme.layerSelectedGraphicObject.pointer.forEach(object => {
                        if (viewport) {
                            object.delete(viewport);
                        }

                        object.objectScheme?.delete(viewport);
                        this.scheme.layerGraphicObject.pointer = this.scheme.layerGraphicObject.pointer.filter(
                            o => o.idObject !== object.objectScheme?.idObject
                        );
                        const textObjs = this.textalObjs.filter(
                            text => (text.data as GraphicLabelDto).linkedGraphicObjectId === object.idObject
                        );
                        requestLabelsId.push(...textObjs.map(t => t.idObject));
                    });
                    this.scheme.layerSelectedGraphicObject.linear.forEach(object => {
                        object.delete(this.getViewport() as Viewport);
                        object.objectScheme?.delete(viewport);
                        this.scheme.layerGraphicObject.linear = this.scheme.layerGraphicObject.linear.filter(
                            o => o.idObject !== object.objectScheme?.idObject
                        );
                        const textObjs = this.textalObjs.filter(
                            text => (text.data as GraphicLabelDto).linkedGraphicObjectId === object.idObject
                        );
                        requestLabelsId.push(...textObjs.map(t => t.idObject));
                    });
                }

                const processedReqLabelsId: number[] = Array.from(
                    new Set([...this.selectedTextualObjs.map(sto => sto.idObject), ...requestLabelsId]).values()
                );
                const resultLabels = await deleteGraphicLabels(projectsStore.projectId, processedReqLabelsId);
                if (!resultLabels.error) {
                    this.scheme.layerSelectedGraphicObject.textual.forEach(object => {
                        if (viewport) {
                            object.delete(viewport);
                        }
                        object.objectScheme?.delete(viewport);
                        this.scheme.layerGraphicObject.textual = this.scheme.layerGraphicObject.textual.filter(
                            o => o.idObject !== object.objectScheme?.idObject
                        );
                    });
                    this.scheme.layerSelectedGraphicObject.textual = [];
                    processedReqLabelsId.forEach(prlId => {
                        const textObjectIndex = this.scheme.layerGraphicObject.textual.findIndex(
                            t => t.idObject === prlId
                        );
                        if (textObjectIndex > -1) {
                            this.scheme.layerGraphicObject.textual[textObjectIndex].delete(viewport);
                            this.scheme.layerGraphicObject.textual.splice(textObjectIndex, 1);
                        }
                    });
                }

                selectedObjectStore.selectedGraphicObjectId = undefined;
                selectedObjectStore.setSelectedObject(undefined);
            }
        },

        /**
         * Добавить линейный объект
         */
        addLinearObjects(objects: LinearGraphicObject[]) {
            (this.scheme.layerGraphicObject.linear as unknown as LinearGraphicObject[]).push(...objects);
        },
        /**
         * Добавить выделенный линейный объект
         */
        addSelectedLinearObject(object: SelectedLinearGraphicObject) {
            (this.scheme.layerSelectedGraphicObject.linear as unknown as SelectedLinearGraphicObject[]).push(object);
        },
        /**
         * Добавить выделенный линейный объект
         */
        addSelectedLinearObjects(objects: SelectedLinearGraphicObject[]) {
            (this.scheme.layerSelectedGraphicObject.linear as unknown as SelectedLinearGraphicObject[]).push(
                ...objects
            );
        },
        /**
         * Добавить точечный объекты
         */
        addPointerObjects(objects: PointerGraphicObject[]) {
            (this.scheme.layerGraphicObject.pointer as unknown as PointerGraphicObject[]).push(...objects);
        },
        /**
         * Добавить выделенный точечный объект
         */
        addSelectedPointerObject(object: SelectedPointerGraphicObject) {
            (this.scheme.layerSelectedGraphicObject.pointer as unknown as SelectedPointerGraphicObject[]).push(object);
        },
        /**
         * Добавить выделенный точечный объекты
         */
        addSelectedPointerObjects(objects: SelectedPointerGraphicObject[]) {
            (this.scheme.layerSelectedGraphicObject.pointer as unknown as SelectedPointerGraphicObject[]).push(
                ...objects
            );
        },
        addTextualObjects(objects: TextualGraphicObject[]) {
            (this.scheme.layerGraphicObject.textual as unknown as TextualGraphicObject[]).push(...objects);
        },
        addSelectedTextualObject(object: SelectedTextualGraphicObject) {
            (this.scheme.layerSelectedGraphicObject.textual as unknown as SelectedTextualGraphicObject[]).push(object);
        },
        addSelectedTextualObjects(objects: SelectedTextualGraphicObject[]) {
            (this.scheme.layerSelectedGraphicObject.textual as unknown as SelectedTextualGraphicObject[]).push(
                ...objects
            );
        },
        copy() {
            const copyPointer = this.scheme.layerSelectedGraphicObject.pointer
                .filter(
                    (object): object is SelectedPointerGraphicObject & { objectScheme: PointerGraphicObject } =>
                        object.objectScheme !== undefined
                )
                .map<CopyObject>(object => ({
                    id: object.objectScheme.idObject,
                    techObjectId: object.objectScheme.techObjectId!,
                    position: object.objectScheme.position,
                    type: object.objectScheme.graphType!,
                    rotationAngle: object.objectScheme.rotationAngle,
                    flipHorizontal: object.objectScheme.flipHorizontal,
                    flipVertical: object.objectScheme.flipVertical,
                    techType: object.objectScheme.techType!,
                    fillColor: object.objectScheme.fillColor,
                    strokeColor: object.objectScheme.strokeColor,
                }));

            const copyLinear = this.scheme.layerSelectedGraphicObject.linear
                .filter(
                    (object): object is SelectedLinearGraphicObject & { objectScheme: LinearGraphicObject } =>
                        object.objectScheme !== undefined
                )
                .map<CopyObject>(object => ({
                    id: object.objectScheme.idObject,
                    techObjectId: object.objectScheme.techObjectId!,
                    points: object.objectScheme.points,
                    type: object.objectScheme.graphType!,
                    techType: object.objectScheme.techType!,
                }));
            this.bufferObjects = [...copyPointer, ...copyLinear];
        },
        async paste(deltaMove: XYPosition) {
            this.clearSelectionObjects();
            const viewport = this.getViewport();
            if (!viewport) return;
            const movedBufferObjects = this.bufferObjects.map(obj => {
                const movedObject = { ...obj };
                if (obj.position) {
                    movedObject.position = PointerGraphicObject.getComputedPosition(
                        {
                            x: obj.position.x + deltaMove.x,
                            y: obj.position.y + deltaMove.y,
                        },
                        obj.type
                    );
                }
                if (obj.points) {
                    movedObject.points = [
                        ...obj.points.map(point => ({
                            x: point.x + deltaMove.x,
                            y: point.y + deltaMove.y,
                        })),
                    ];
                }
                return movedObject;
            });
            if (!this.createrCopyObjectsCb || !this.tool) return;
            const result = await this.createrCopyObjectsCb(movedBufferObjects, this.tool);
            if (!result) return;
            this.addPointerObjects(result.pointers);
            this.addLinearObjects(result.linears);

            const selectedObjectsPointer = result.pointers.map(p => {
                const selectedPointerObject = new SelectedPointerGraphicObject({
                    id: p.idObject,
                    techObjectId: p.techObjectId,
                    graphType: p.graphType,
                    techType: p.techType,
                    objectType: p.objectType,
                    position: p.position,
                    rotateAngle: p.rotationAngle,
                    flipHorizontal: p.flipHorizontal,
                    flipVertical: p.flipVertical,
                });
                selectedPointerObject.setObjectScheme(p);
                return selectedPointerObject;
            });
            const selectedObjectsLinear = result.linears.map(l => {
                const selectedLinearObject = new SelectedLinearGraphicObject({
                    id: l.idObject,
                    techObjectId: l.techObjectId,
                    points: l.points,
                    graphType: l.graphType,
                    techType: l.techType,
                    objectType: l.objectType,
                });
                selectedLinearObject.setObjectScheme(l);
                return selectedLinearObject;
            });

            //добавляем выделенные объекты в схему
            this.addSelectedPointerObjects(selectedObjectsPointer);
            this.addSelectedLinearObjects(selectedObjectsLinear);

            [...result.pointers, ...result.linears].forEach(obj => {
                obj.draw(viewport, this.tool, this.tooltipManager);
            });

            [...selectedObjectsPointer, ...selectedObjectsLinear].forEach(obj => {
                const graphics = obj.draw();
                if (Array.isArray(graphics)) {
                    viewport.addChild(...graphics);
                } else {
                    viewport.addChild(graphics);
                }
            });
            await nextTick();
            viewport.update(2);
            viewport._onUpdate();
        },
        onCreateObjectsForPaste(
            cb: (
                bufferObjects: CopyObject[],
                tool: ITool
            ) => Promise<{ pointers: PointerGraphicObject[]; linears: LinearGraphicObject[] } | undefined>
        ): void {
            this.createrCopyObjectsCb = cb;
        },
        onPreRender(cb: () => void) {
            this.preRenderCbs.push(cb);
        },
        onPostRender(cb: () => void) {
            this.postRenderCbs.push(cb);
        },
        clearSelectionObjects() {
            const viewport = this.getViewport();
            if (!viewport) return;

            this.scheme.layerSelectedGraphicObject.pointer.forEach(object => object.delete(viewport));
            this.scheme.layerSelectedGraphicObject.linear.forEach(object => object.delete(viewport));
            this.scheme.layerSelectedGraphicObject.textual.forEach(object => object.delete(viewport));
            this.scheme.layerSelectedGraphicObject = {
                linear: [],
                pointer: [],
                textual: [],
            };
            const areaSelected = viewport.getChildByLabel("area-selected");
            if (areaSelected) {
                areaSelected.destroy();
            }
        },
        clearStore() {
            this.scheme = {
                layerGraphicObject: {
                    linear: [],
                    pointer: [],
                    textual: [],
                },
                layerSelectedGraphicObject: {
                    linear: [],
                    pointer: [],
                    textual: [],
                },
            };
        },
        setDraggable(drag: boolean) {
            this.isDragObjects = drag;
        },
        getViewport(): Viewport | undefined {
            return this.app?.stage.getChildByLabel("viewport") as Viewport;
        },
    },
});
