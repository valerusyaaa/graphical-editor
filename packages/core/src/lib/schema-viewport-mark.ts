/** Помечает дочерние узлы viewport, относящиеся к схеме (базовые + selection), для полной перерисовки при изменении `objects`. */
export const GV_SCHEMA_VIEWPORT_KEY = "__gvSchemaViewportChild" as const;

/** У Pixi v8 `userData` есть в рантайме, но не всегда попадает в публичный тип `Container` / `Graphics` — из‑за этого TS2559. */
type PixiUserDataHost = { userData?: Record<string, unknown> };

export function markSchemaViewportChild(node: object): void {
	const n = node as PixiUserDataHost;
	if (!n.userData) n.userData = {};
	(n.userData as Record<string, boolean>)[GV_SCHEMA_VIEWPORT_KEY] = true;
}

export function isSchemaViewportChild(node: object): boolean {
	const n = node as PixiUserDataHost;
	return Boolean(
		(n.userData as Record<string, boolean> | undefined)?.[
			GV_SCHEMA_VIEWPORT_KEY
		],
	);
}
