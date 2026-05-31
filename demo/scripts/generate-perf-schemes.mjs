/**
 * Генерация JSON-схем для замеров FPS (формат SchemeFileV1 демо).
 *
 * Запуск из корня репозитория:
 *   node demo/scripts/generate-perf-schemes.mjs
 *   node demo/scripts/generate-perf-schemes.mjs 250
 *
 * Файлы: demo/public/perf-schemes/scheme-perf-{S|M|L|XL}.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FILE_VERSION = 1;
const POINTER_TYPES = ["Valve", "Producer", "consumer"];

/** Доли как в bench:render-schema (~80 % pointer, ~20 % linear). */
const LINEAR_EVERY = 5;

const PRESETS = [
	{ tag: "S", count: 40, label: "малая" },
	{ tag: "M", count: 120, label: "рабочая (как bench)" },
	{ tag: "L", count: 300, label: "стресс" },
	{ tag: "XL", count: 500, label: "экстрем" },
];

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../public/perf-schemes");

/**
 * @param {number} totalCount
 * @param {{ cols?: number; cellW?: number; cellH?: number }} [layout]
 */
export function buildPerfSchemeObjects(totalCount, layout = {}) {
	const cols = layout.cols ?? Math.max(8, Math.ceil(Math.sqrt(totalCount * 1.4)));
	const cellW = layout.cellW ?? 112;
	const cellH = layout.cellH ?? 88;
	const originX = 48;
	const originY = 48;

	/** @type {Array<Record<string, unknown>>} */
	const objects = [];

	for (let i = 1; i <= totalCount; i++) {
		const row = Math.floor((i - 1) / cols);
		const col = (i - 1) % cols;
		const x = originX + col * cellW;
		const y = originY + row * cellH;

		if (i % LINEAR_EVERY === 0) {
			objects.push({
				id: i,
				featureObjectType: "pipe",
				graphObjectType: "linear",
				points: [
					{ x, y: y + 24 },
					{ x: x + cellW - 16, y: y + 24 },
				],
				data: { techObjectId: i },
			});
		} else {
			const featureObjectType =
				POINTER_TYPES[(i - 1) % POINTER_TYPES.length];
			objects.push({
				id: i,
				featureObjectType,
				graphObjectType: "pointer",
				position: { x, y },
				data: { techObjectId: i },
			});
		}
	}

	return objects;
}

/** @param {number} totalCount */
export function buildSchemeFileV1(totalCount) {
	const objects = buildPerfSchemeObjects(totalCount);
	const pointers = objects.filter((o) => o.graphObjectType === "pointer").length;
	const lines = objects.length - pointers;

	return {
		version: FILE_VERSION,
		meta: {
			generator: "generate-perf-schemes.mjs",
			totalObjects: objects.length,
			pointerObjects: pointers,
			linearObjects: lines,
			note: "Загрузить в демо: «Загрузить схему» → выбрать файл",
		},
		objects,
	};
}

function writePreset({ tag, count, label }) {
	const body = buildSchemeFileV1(count);
	const filename = `scheme-perf-${tag}.json`;
	const path = join(OUT_DIR, filename);
	writeFileSync(path, `${JSON.stringify(body, null, 2)}\n`, "utf8");
	const { pointerObjects, linearObjects } = body.meta;
	console.log(
		`${filename}: ${count} объектов (${label}) — pointer ${pointerObjects}, pipe ${linearObjects}`,
	);
}

function main() {
	mkdirSync(OUT_DIR, { recursive: true });

	const custom = Number(process.argv[2]);
	if (Number.isFinite(custom) && custom > 0) {
		const body = buildSchemeFileV1(Math.floor(custom));
		const path = join(OUT_DIR, `scheme-perf-custom-${Math.floor(custom)}.json`);
		writeFileSync(path, `${JSON.stringify(body, null, 2)}\n`, "utf8");
		console.log(`custom: ${path}`);
		return;
	}

	console.log(`Каталог: ${OUT_DIR}\n`);
	for (const preset of PRESETS) {
		writePreset(preset);
	}
	console.log(
		"\nДля draw.io: создайте сетку из ~N прямоугольников и ~(N/5) соединителей (см. docs/эксперименты-производительность.md).",
	);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main();
}
