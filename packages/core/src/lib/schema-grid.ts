import { Texture, TilingSprite } from "pixi.js";

export const SCHEMA_GRID_LABEL = "schema-grid";
export const DEFAULT_SCHEMA_GRID_STEP = 10;

export type SchemaGridOptions = {
	step?: number;
	/** Цвет точек (hex). */
	color?: number;
	/** Прозрачность точек 0…1. */
	alpha?: number;
	/** Размер точки в пикселях (1 — как на референсе). */
	dotSize?: number;
	/** @deprecated Используйте `dotSize`. */
	width?: number;
	/** Полуразмер области сетки в мировых координатах. */
	extent?: number;
};

function colorToCss(hex: number): string {
	return `#${hex.toString(16).padStart(6, "0")}`;
}

/** Тайл `step×step` с одной точкой в углу — повторяется по всему холсту. */
function createDotGridTexture(
	step: number,
	color: number,
	alpha: number,
	dotSize: number,
): Texture {
	const canvas = document.createElement("canvas");
	canvas.width = step;
	canvas.height = step;
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Не удалось создать 2D-контекст для текстуры сетки");
	}
	ctx.clearRect(0, 0, step, step);
	const size = Math.max(1, Math.round(dotSize));
	ctx.fillStyle = colorToCss(color);
	ctx.globalAlpha = alpha;
	ctx.fillRect(0, 0, size, size);
	return Texture.from(canvas);
}

/** Точечная сетка в мировых координатах (под объектами схемы). */
export function createSchemaGridGraphics(
	options: SchemaGridOptions = {},
): TilingSprite {
	const step = options.step ?? DEFAULT_SCHEMA_GRID_STEP;
	const color = options.color ?? 0x6a6a6a;
	const alpha = options.alpha ?? 0.55;
	const dotSize = options.dotSize ?? options.width ?? 1;
	const extent = options.extent ?? 25_000;

	const texture = createDotGridTexture(step, color, alpha, dotSize);
	const tile = new TilingSprite({
		texture,
		width: extent * 2,
		height: extent * 2,
		roundPixels: true,
	});
	tile.label = SCHEMA_GRID_LABEL;
	tile.position.set(-extent, -extent);
	tile.zIndex = -10_000;
	tile.eventMode = "none";

	return tile;
}
