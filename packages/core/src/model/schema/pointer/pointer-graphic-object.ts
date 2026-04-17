import {
	type ObjectInfo,
	type XYPosition,
	adaptToGrid,
	GraphicObjectScheme,
	Offsets,
} from "../";
import {
	Bounds,
	Container,
	Graphics,
	GraphicsContext,
	Matrix,
	Point,
	Polygon,
	type BoundsData,
	type IHitArea,
} from "pixi.js";
import type { Viewport } from "pixi-viewport";
import type { ITool } from "../../tools";

export class PointerGraphicObject extends GraphicObjectScheme {
    // world position
	position: XYPosition;
	rotationAngle: number;
	flipHorizontal: boolean;
	flipVertical: boolean;
	offsets: Offsets;
	fillColor: string;
	strokeColor: string;
	strokeWidth: number;
    // local position
	polynom: XYPosition[];
	transformBounds: BoundsData;

	constructor(info: ObjectInfo) {
		super(info);
		this.rotationAngle = info.rotateAngle ?? 0;
		this.flipHorizontal = info.flipHorizontal ?? false;
		this.flipVertical = info.flipVertical ?? false;
		this.objectType = "pointer";
		this.offsets = info.offsets ?? { left: 0, top: 0 };

		this.position = this.getComputedPosition(info.position!);
		this.fillColor = info.fillColor ?? "transparent";
		this.strokeColor = info.strokeColor ?? "transparent";
		this.polynom = info.polynom ?? [];
		this.strokeWidth = info.strokeWidth ?? 1;
		this.transformBounds = new Bounds(); // TODO: Возможно нужнео брать из description
	}

	/**
	 * Draw the object.
	 * @param viewport - The viewport of the object.
	 * @param tool - The tool of the object.
	 * @param tooltip - The tooltip of the object.
	 */
	draw(viewport: Viewport, tool: ITool): void {
		//create container
		const container = new Container();
		container.label = this.idObject.toString();
		container.interactive = true;
		container.origin.set(this.offsets.left, this.offsets.top);
		container.rotation = (this.rotationAngle * Math.PI) / 180;
		container.position.set(this.position.x, this.position.y);

		//add event listeners
		container.onmousedown = async (event) => {
			await tool.onMouseDownPointerObject(event, this);
		};
		container.onrightclick = async (event) => {
			event.stopPropagation();
			tool.onContextMenuPointerObject(event, this);
			await tool.onMouseDownPointerObject(event, this);
		};

		container.hitArea = this.getProcessingHitArea();

		//create graphics (фигурка объекта)
		const graphics = new Graphics();
		graphics.label = "graphics";
		this.drawElement(graphics.context);

		const scaleX = this.flipHorizontal ? -1 : 1;
		const scaleY = this.flipVertical ? -1 : 1;
		graphics.origin.set(this.offsets.left, this.offsets.top);
		graphics.scale.set(scaleX, scaleY);

        //add graphics in container
		container.addChild(graphics);

		// подпись объекта (label) строго ниже объекта
		viewport.addChild(container);
		this.transformBounds = this.getBounds(viewport);
	}

	/**
	 * Refresh the position of the object.
	 * @param position - The position of the object.
	 * @param viewport - The viewport of the object.
	 */
	refreshPosition(position: XYPosition, viewport: Viewport) {
		this.position = adaptToGrid(position);
		const container = viewport.getChildByLabel(
			this.idObject.toString(),
		);
		if (container) {
			container.position.x = position.x;
			container.position.y = position.y;
			viewport._onUpdate();
			this.transformBounds = this.getBounds(viewport);
		}
	}

	/**
	 * Rotate the object.
	 * @param angle - The angle of the object.
	 * @param viewport - The viewport of the object.
	 */
	rotate(angle: number, viewport: Viewport) {
		this.rotationAngle = angle;
		const container = viewport.getChildByLabel(
			this.idObject.toString(),
		);
		if (container) {
			container.rotation =
				(this.rotationAngle * Math.PI) / 180;
			this.transformBounds = this.getBounds(viewport);
			viewport._onUpdate();
		}
	}

	/**
	 * Reflect the object horizontally.
	 * @param viewport - The viewport of the object.
	 */
	reflectHorizontal(viewport: Viewport) {
		this.flipHorizontal = !this.flipHorizontal;
		const container = viewport.getChildByLabel(
			this.idObject.toString(),
		);
		if (container) {
			const graphics = container.getChildByLabel("graphics");
			if (graphics) {
				graphics.scale.x = this.flipHorizontal ? -1 : 1;
				container.hitArea = this.getProcessingHitArea();
				this.transformBounds = this.getBounds(viewport);
				viewport._onUpdate();
			}
		}
	}

	/**
	 * Reflect the object vertically.
	 * @param viewport - The viewport of the object.
	 */
	reflectVertical(viewport: Viewport) {
		this.flipVertical = !this.flipVertical;
		const container = viewport.getChildByLabel(
			this.idObject.toString(),
		);
		if (container) {
			const graphics = container.getChildByLabel("graphics");
			if (graphics) {
				graphics.scale.y = this.flipVertical ? -1 : 1;
				container.hitArea = this.getProcessingHitArea();
				this.transformBounds = this.getBounds(viewport);
			}
		}
	}

	/**
	 * Delete the object from the viewport.
	 * @param viewport - The viewport of the object.
	 */
	delete(viewport: Viewport) {
		const container = viewport.getChildByLabel(
			this.idObject.toString(),
		);
		if (container) {
			viewport.removeChild(container);
			container.destroy();
		}
	}

	async setFillStrokeAndDraw(
		fillColor: string,
		strokeColor: string,
		viewport: Viewport,
	) {
		this.fillColor = fillColor;
		this.strokeColor = strokeColor;
		const container = viewport.getChildByLabel(
			this.idObject.toString(),
		);
		if (container) {
			const graphics = container.getChildByLabel(
				"graphics",
			) as Graphics;
			if (graphics) {
				this.drawElement(graphics.context);
			}
		}
	}

	async setFillStrokeColor(fillColor: string, strokeColor: string) {
		this.fillColor = fillColor;
		this.strokeColor = strokeColor;
	}

	/**
	 * Get the computed position of the object.
	 * @param position - The position of the object.
	 * @returns The computed position of the object.
	 */
	private getComputedPosition(position: XYPosition): XYPosition {
		return {
			x: position.x - this.offsets.left,
			y: position.y - this.offsets.top,
		};
	}

	async drawElement(context: GraphicsContext): Promise<void> {
		const points = this.polynom.map((p) => new Point(p.x, p.y));
		context.poly(points)
			.fill({ color: this.fillColor })
			.stroke({
				width: this.strokeWidth,
				color: this.strokeColor,
			});
	}

	redraw(viewport: Viewport) {
		const container = viewport.getChildByLabel(`${this.idObject}`);
		if (container) {
			const graphics = container.getChildByLabel(
				"graphics",
			) as Graphics | undefined;
			if (graphics) {
				this.drawElement(graphics.context);
			}
		}
	}

	drawSelectedElement(position: XYPosition): GraphicsContext {
		return new GraphicsContext();
	}

	getProcessingHitArea() {
		const scaleX = this.flipHorizontal ? -1 : 1;
		const scaleY = this.flipVertical ? -1 : 1;
		const matrix = new Matrix()
			.translate(-this.offsets.left, -this.offsets.top)
			.scale(scaleX, scaleY)
			.translate(this.offsets.left, this.offsets.top);
		const points = this.getHitAreaPoints();
		const transformedPoints = points
			.map((p) => matrix.apply(p))
			.flatMap((p) => [p.x, p.y]);
		return new Polygon(transformedPoints);
	}

	getHitAreaPoints(): Point[] {
		return [];
	}
	getBounds(viewport: Viewport): BoundsData {
		const points = this.getHitAreaPoints();
		const transformPoints = points.map((p) => {
			return viewport.worldTransform.apply(p);
		});
		const width = Math.max(...points.map((p) => p.x));
		const height = Math.max(...points.map((p) => p.y));
		return {
			minX: this.position.x,
			minY: this.position.y,
			maxX: width + this.position.x,
			maxY: height + this.position.y,
		};
	}
	transformHitArea(position: XYPosition): IHitArea | undefined {
		return;
	}
}
