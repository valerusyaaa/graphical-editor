import type { Viewport } from "pixi-viewport";
import { useGraphicSchemeStore } from "../../../packages/core/src/model/stores/graphic-scheme.store";

/** Координаты курсора в мировых координатах сцены редактора (как у буфера обмена). */
export function clientToWorld(
	clientX: number,
	clientY: number,
): { x: number; y: number } | null {
	const store = useGraphicSchemeStore();
	const app = store.app;
	if (!app?.canvas) return null;
	const vp = app.stage.getChildByLabel("viewport") as Viewport | undefined;
	if (!vp) return null;
	const r = app.canvas.getBoundingClientRect();
	return vp.toWorld(clientX - r.left, clientY - r.top);
}
