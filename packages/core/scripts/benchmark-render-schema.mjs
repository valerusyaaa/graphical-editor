/**
 * Оценка стоимости проходов синхронизации (условные единицы работы viewport).
 * Запуск: pnpm --dir packages/core bench:render-schema
 */
import { performance } from "node:perf_hooks";

/** Условные единицы, калиброваны под Pixi (destroy tree дороже draw). */
const CLEAR_ALL = 800;
const DRAW_ONE = 15;
const PATCH_ONE = 12;
const SELECTION_ALL = 200;
const SELECTION_PINNED_ONLY = 4;

function buildStructuralKey(objects) {
	return objects.map((o) => `${o.id}:${o.graphObjectType}`).join("|");
}

function buildFingerprint(dto) {
	return JSON.stringify(
		dto.graphObjectType === "pointer"
			? { p: dto.position }
			: { pts: dto.points },
	);
}

function collectPatchIds(objects, previous) {
	const patch = new Set();
	const current = new Set();
	for (const dto of objects) {
		current.add(dto.id);
		if (previous.get(dto.id) !== buildFingerprint(dto)) patch.add(dto.id);
	}
	for (const id of previous.keys()) {
		if (!current.has(id)) patch.add(id);
	}
	return patch;
}

function makeScheme(count) {
	const objects = [];
	for (let i = 1; i <= count; i++) {
		if (i % 5 === 0) {
			objects.push({
				id: i,
				graphObjectType: "linear",
				points: [
					{ x: i * 10, y: i * 5 },
					{ x: i * 10 + 80, y: i * 5 },
				],
			});
		} else {
			objects.push({
				id: i,
				graphObjectType: "pointer",
				position: { x: i * 12, y: i * 8 },
			});
		}
	}
	return objects;
}

function legacyViewportCost(objectCount) {
	return CLEAR_ALL + objectCount * DRAW_ONE + SELECTION_ALL;
}

function optimizedViewportCost(patchCount, selectionRebuild) {
	return (
		patchCount * PATCH_ONE +
		(selectionRebuild ? SELECTION_ALL : SELECTION_PINNED_ONLY)
	);
}

function bench(label, fn) {
	const t0 = performance.now();
	const value = fn();
	const ms = performance.now() - t0;
	console.log(`${label}: ${ms.toFixed(2)} ms`);
	return value;
}

const count = 120;
const pointerCount = Math.floor((count * 4) / 5);
const dragFrames = 300;

console.log("--- benchmark: use-render-schema (оценка viewport-работы) ---");
console.log(`objects=${count}, pointer≈${pointerCount}, frames=${dragFrames}\n`);

let objects = makeScheme(count);
let structuralKey = buildStructuralKey(objects);
let fingerprints = rebuildMap(objects);

function rebuildMap(objs) {
	const m = new Map();
	for (const o of objs) m.set(o.id, buildFingerprint(o));
	return m;
}

let legacyUnits = 0;
bench("legacy: drag — полная пересборка каждый кадр", () => {
	for (let f = 0; f < dragFrames; f++) {
		objects = objects.map((o) =>
			o.position
				? { ...o, position: { x: o.position.x + 1, y: o.position.y + 1 } }
				: o,
		);
		legacyUnits += legacyViewportCost(count);
	}
});

objects = makeScheme(count);
structuralKey = buildStructuralKey(objects);
fingerprints = rebuildMap(objects);
let optimizedUnits = 0;
let patchFrames = 0;

bench("optimized: drag — patch только изменённых", () => {
	for (let f = 0; f < dragFrames; f++) {
		objects = objects.map((o) =>
			o.position
				? { ...o, position: { x: o.position.x + 1, y: o.position.y + 1 } }
				: o,
		);
		const nextStructural = buildStructuralKey(objects);
		if (nextStructural !== structuralKey) {
			optimizedUnits += legacyViewportCost(count);
			structuralKey = nextStructural;
			fingerprints = rebuildMap(objects);
			continue;
		}
		const patchIds = collectPatchIds(objects, fingerprints);
		fingerprints = rebuildMap(objects);
		if (patchIds.size === 0) continue;
		patchFrames++;
		optimizedUnits += optimizedViewportCost(
			patchIds.size,
			false,
		);
	}
});

const ratio = legacyUnits / optimizedUnits;
console.log(`\nlegacy units:   ${legacyUnits}`);
console.log(`optimized units: ${optimizedUnits}`);
console.log(`оценка ускорения viewport-работы: ~${ratio.toFixed(1)}×`);
console.log(`patch frames: ${patchFrames}/${dragFrames}`);
console.log(
	"\nЕдиницы (условные): clear≈800, draw≈15/объект, patch≈12/объект, selection≈200.",
);
