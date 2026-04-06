import {
    convertToStyleName,
    PointerGraphicObject,
    adaptToGrid,
    type ObjectInfo,
    SelectedGraphicObject,
    type XYPosition,
} from "..";
import { getOffsetsGraphicObject, type GraphicPointDto, type OffsetsDto } from "@/entities/projects";
import { type Graphics } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { useGraphicSchemeStore } from "../../stores";
import type { ITool } from "../../tools";

export class SelectedPointerGraphicObject extends SelectedGraphicObject {
    objectScheme?: PointerGraphicObject | null;
    position: GraphicPointDto;
    rotationAngle: number;
    flipHorizontal: boolean;
    flipVertical: boolean;
    offsets: OffsetsDto;
    tool: ITool;

    constructor(info: ObjectInfo) {
        super({
            id: info.id,
            typeSelect: convertToStyleName(info.graphType!, true),
            typeGraph: info.graphType,
            isActive: false,
            techObjectId: info.techObjectId,
            techType: info.techType,
        });
        this.offsets = getOffsetsGraphicObject(this.graphType!);
        this.position = info.position ?? {
            x: 0,
            y: 0,
        };
        const graphicSchemeStore = useGraphicSchemeStore();
        this.tool = graphicSchemeStore.tool;
        this.rotationAngle = info.rotateAngle ?? 0;
        this.flipHorizontal = info.flipHorizontal ?? false;
        this.flipVertical = info.flipVertical ?? false;
        this.graphics.interactive = true;
        this.graphics.onmousedown = async event => {
            event.stopPropagation();
            await this.tool.onMouseDownSelectedPointerObject(event, this);
        };
        this.graphics.onrightclick = async event => {
            event.stopPropagation();
            this.tool.onContextMenuPointerObject(event, this);
        };

        const tooltip = graphicSchemeStore.tooltipManager;
        this.graphics.onmouseenter = event => {
            tooltip?.showTooltip(event.pageX, event.pageY, this);
        };

        this.graphics.onmouseleave = event => {
            tooltip?.hideTooltip();
        };
    }

    move(position: XYPosition, viewport: Viewport): void {
        this.position = position;
        if (this.objectScheme) {
            this.objectScheme.refreshPosition(position, viewport);
        }
    }

    cancel(initPoints: XYPosition) {
        this.position = initPoints;
    }

    rotate(angle: number, viewport: Viewport): void {
        this.rotationAngle = angle;
        if (this.objectScheme) {
            this.objectScheme.rotate(this.rotationAngle, viewport);
            this.graphics.context = this.objectScheme.drawSelectedElement(adaptToGrid(this.position));
        }
    }

    reflectHorizontal(viewport: Viewport): void {
        if (!this.objectScheme) {
            return;
        }
        this.flipHorizontal = !this.flipHorizontal;
        this.objectScheme.reflectHorizontal(viewport);
        this.graphics.context = this.objectScheme.drawSelectedElement(adaptToGrid(this.position));
    }

    reflectVertical(viewport: Viewport): void {
        if (!this.objectScheme) {
            return;
        }
        this.flipVertical = !this.flipVertical;
        this.objectScheme.reflectVertical(viewport);
        this.graphics.context = this.objectScheme.drawSelectedElement(adaptToGrid(this.position));
    }

    delete(viewport: Viewport) {
        viewport.removeChild(this.graphics);
        this.graphics.destroy();
    }

    getComputedObjectPosition(nodePosition: XYPosition): GraphicPointDto {
        return {
            x: nodePosition.x + this.offsets.left,
            y: nodePosition.y + this.offsets.top,
        };
    }

    setObjectScheme(object: PointerGraphicObject) {
        this.objectScheme = object;
    }

    draw(): Graphics {
        if (this.objectScheme) {
            this.graphics.context = this.objectScheme.drawSelectedElement(adaptToGrid(this.position));
            this.graphics.hitArea = this.objectScheme.transformHitArea(adaptToGrid(this.position));
        }
        return this.graphics;
    }
    normalizeToGrid(): void {
        this.position = adaptToGrid(this.position);
    }
}
