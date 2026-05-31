export type EditorUiTheme = "dark" | "light";

/** Фон холста Pixi (темнее панелей UI `#1e1e1e`). */
export const EDITOR_CANVAS_BG = {
	dark: 0x141414,
	light: 0xffffff,
} as const;

/** Точечная сетка — контрастные 1px-точки на фоне холста. */
export const EDITOR_GRID_STYLE = {
	dark: { color: 0x8a8a8a, alpha: 1, dotSize: 1 },
	light: { color: 0x1a1a1a, alpha: 1, dotSize: 1 },
} as const;

const STORAGE_KEY = "ge-editor-ui-theme";
const ATTR = "data-ge-theme";

export function getEditorUiTheme(): EditorUiTheme {
	if (typeof document === "undefined") return "dark";
	const attr = document.documentElement.getAttribute(ATTR);
	if (attr === "light" || attr === "dark") return attr;
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === "light" || stored === "dark") return stored;
	} catch {
		/* ignore */
	}
	return "dark";
}

export function applyEditorUiTheme(theme: EditorUiTheme): void {
	if (typeof document === "undefined") return;
	document.documentElement.setAttribute(ATTR, theme);
	try {
		localStorage.setItem(STORAGE_KEY, theme);
	} catch {
		/* ignore */
	}
}

export function toggleEditorUiTheme(): EditorUiTheme {
	const next: EditorUiTheme = getEditorUiTheme() === "dark" ? "light" : "dark";
	applyEditorUiTheme(next);
	return next;
}

/** Вызвать до монтирования приложения, чтобы не мигала тема. */
export function initEditorUiTheme(): EditorUiTheme {
	const theme = getEditorUiTheme();
	applyEditorUiTheme(theme);
	return theme;
}

/** Цвет фона Pixi из строки дескриптора или темы. */
export function resolveCanvasBackgroundHex(
	color: string,
	theme: EditorUiTheme = "dark",
): number {
	if (color === "white" || color === "#ffffff") {
		return EDITOR_CANVAS_BG.light;
	}
	if (color.startsWith("#")) {
		return Number.parseInt(color.slice(1), 16);
	}
	if (color === "black") {
		return EDITOR_CANVAS_BG.dark;
	}
	return EDITOR_CANVAS_BG[theme];
}
