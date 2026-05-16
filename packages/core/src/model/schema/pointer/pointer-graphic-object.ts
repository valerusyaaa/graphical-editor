import {
	type ObjectInfo,
	type XYPosition,
	GraphicObjectScheme,
	Offsets,
} from "../";
import { markSchemaViewportChild } from "../../../lib/schema-viewport-mark";
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

/** Локальный размер иконки «поставщик» (квадрат + стрелка), совпадает с polynom в дескрипторе. */
export const PRODUCER_POINTER_SIZE = 48;

/** Длина стороны внешнего равностороннего треугольника «потребитель» (основание слева). */
export const CONSUMER_POINTER_SIDE = 56;

/** Доля стороны внутреннего △ от внешнего (меньше — уже «чёрное» тело). */
const CONSUMER_INNER_SIDE_SCALE = 0.46;
/** Скругление вершин внутреннего △ (радиус roundPoly, пиксели локальных координат). */
const CONSUMER_INNER_CORNER_RADIUS = 5;

/** Вершины внешнего △ вправо: основание (0,0)–(0,side), вершина (w, side/2), w = side·√3/2. */
export function getConsumerOuterPolynom(side: number): XYPosition[] {
	const w = (side * Math.sqrt(3)) / 2;
	return [
		{ x: 0, y: 0 },
		{ x: 0, y: side },
		{ x: w, y: side / 2 },
	];
}

export function getConsumerOuterTriangleFlat(side: number): number[] {
	const w = (side * Math.sqrt(3)) / 2;
	return [0, 0, 0, side, w, side / 2];
}

export class PointerGraphicObject extends GraphicObjectScheme {
    // world position
	position: XYPosition;
	/** Например `valve`, `producer`, `consumer` — влияет на drawElement. */
	featureObjectType: string;
	rotationAngle: number;
	flipHorizontal: boolean;
	flipVertical: boolean;
	offsets: Offsets;
	fillColor: string;
	strokeColor: string;
	strokeWidth: number;
	selectionStrokeColor: string;
    // local position
	polynom: XYPosition[];
	transformBounds: BoundsData;

	constructor(info: ObjectInfo) {
		super(info);
		this.featureObjectType = info.featureObjectType ?? "";
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
		this.selectionStrokeColor = info.selectionStrokeColor ?? "#fca5a5";
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
		container.eventMode = "static";
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
		graphics.eventMode = "static";
		this.drawElement(graphics.context);

		const scaleX = this.flipHorizontal ? -1 : 1;
		const scaleY = this.flipVertical ? -1 : 1;
		graphics.origin.set(this.offsets.left, this.offsets.top);
		graphics.scale.set(scaleX, scaleY);

        //add graphics in container
		container.addChild(graphics);
		markSchemaViewportChild(container);

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
		this.position = { x: position.x, y: position.y };
		const container = viewport.getChildByLabel(
			this.idObject.toString(),
		);
		if (container) {
			container.position.x = this.position.x;
			container.position.y = this.position.y;
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
		if (
			this.featureObjectType === "producer" ||
			this.featureObjectType === "supplier"
		) {
			this.drawProducerIcon(context);
			return;
		}
		if (this.featureObjectType === "consumer") {
			this.drawConsumerIcon(context);
			return;
		}
		const points = this.polynom.map((p) => new Point(p.x, p.y));
		context.poly(points)
			.fill({ color: this.fillColor })
			.stroke({
				width: this.strokeWidth,
				color: this.strokeColor,
			});
	}

	/** Серый квадрат, чёрная обводка, чёрная стрелка вправо (как на схеме поставщика). */
	private drawProducerIcon(context: GraphicsContext): void {
		const s = PRODUCER_POINTER_SIZE;
		context
			.poly([0, 0, s, 0, s, s, 0, s])
			.fill({ color: this.fillColor })
			.stroke({
				width: Math.max(3, this.strokeWidth + 2),
				color: this.strokeColor,
			});
		// стрелка вправо: прямоугольник + треугольник
		const shaft = [10, 20, 28, 20, 28, 28, 10, 28];
		const head = [28, 16, 40, 24, 28, 32];
		context.poly(shaft).fill({ color: 0x000000 });
		context.poly(head).fill({ color: 0x000000 });
	}

	/**
	 * Равносторонний треугольник вправо: серая заливка, чёрная обводка; внутри — меньший чёрный △.
	 * Геометрия внешнего контура совпадает с `polynom` из дескриптора (`getConsumerOuterPolynom`).
	 */
	private drawConsumerIcon(context: GraphicsContext): void {
		const side = CONSUMER_POINTER_SIDE;
		const outer = getConsumerOuterTriangleFlat(side);
		const w = (side * Math.sqrt(3)) / 2;
		const cx = w / 3;
		const cy = side / 2;
		const innerSide = CONSUMER_INNER_SIDE_SCALE * side;
		const innerCircumR = innerSide / Math.sqrt(3);
		context
			.poly(outer)
			.fill({ color: this.fillColor })
			.stroke({
				width: Math.max(2, this.strokeWidth + 1),
				color: this.strokeColor,
			});
		// Внутренний △ меньше, с мягкими углами (Pixi roundPoly + rotation π/2 → вершина вправо).
		context
			.roundPoly(
				cx,
				cy,
				innerCircumR,
				3,
				CONSUMER_INNER_CORNER_RADIUS,
				Math.PI / 2,
			)
			.fill({ color: 0x000000 });
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
		const context = new GraphicsContext();
		if (this.polynom.length < 3) {
			return context;
		}
		const angle = (this.rotationAngle * Math.PI) / 180;
		const scaleX = this.flipHorizontal ? -1 : 1;
		const scaleY = this.flipVertical ? -1 : 1;
		const points = this.polynom.map((p) => new Point(p.x, p.y));
		const matrix = new Matrix()
			.translate(-this.offsets.left, -this.offsets.top)
			.scale(scaleX, scaleY)
			.rotate(angle)
			.translate(
				position.x + this.offsets.left,
				position.y + this.offsets.top,
			);
		const tPoly = points.flatMap((p) => {
			const tp = matrix.apply(p);
			return [tp.x, tp.y];
		});
		context
			.poly(tPoly)
			.fill({ color: 0xffffff, alpha: 0 })
			.stroke({
				width: Math.max(2, this.strokeWidth),
				color: this.selectionStrokeColor,
			});
		return context;
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
		return this.polynom.map((p) => new Point(p.x, p.y));
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
		if (this.polynom.length < 3) {
			return undefined;
		}
		const angle = (this.rotationAngle * Math.PI) / 180;
		const scaleX = this.flipHorizontal ? -1 : 1;
		const scaleY = this.flipVertical ? -1 : 1;
		const points = this.polynom.map((p) => new Point(p.x, p.y));
		const matrix = new Matrix()
			.translate(-this.offsets.left, -this.offsets.top)
			.scale(scaleX, scaleY)
			.rotate(angle)
			.translate(
				position.x + this.offsets.left,
				position.y + this.offsets.top,
			);
		const transformed = points.map((p) => matrix.apply(p));
		return new Polygon(transformed.flatMap((p) => [p.x, p.y]));
	}
}
