import { onMounted, onUnmounted, ref, type Ref } from "vue";

const STORAGE_KEY = "ge-sidebar-layout-v1";

const WIDTH = { default: 168, min: 120, max: 520 };
const TOOLBOX_H = { default: 300, min: 100 };
const PROPS_MIN = 100;
const SPLITTER = 5;

type StoredLayout = {
	width: number;
	toolboxHeight: number;
};

function clamp(n: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, n));
}

function loadStored(): StoredLayout {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { width: WIDTH.default, toolboxHeight: TOOLBOX_H.default };
		const parsed = JSON.parse(raw) as Partial<StoredLayout>;
		return {
			width: clamp(
				Number(parsed.width) || WIDTH.default,
				WIDTH.min,
				WIDTH.max,
			),
			toolboxHeight: Math.max(
				TOOLBOX_H.min,
				Number(parsed.toolboxHeight) || TOOLBOX_H.default,
			),
		};
	} catch {
		return { width: WIDTH.default, toolboxHeight: TOOLBOX_H.default };
	}
}

function saveLayout(layout: StoredLayout): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
	} catch {
		/* ignore */
	}
}

function setDragCursor(cursor: string | null): void {
	document.body.style.cursor = cursor ?? "";
	document.body.style.userSelect = cursor ? "none" : "";
}

export function useSidebarLayout(sidebarEl: Ref<HTMLElement | null>) {
	const sidebarWidth = ref(WIDTH.default);
	const toolboxHeight = ref(TOOLBOX_H.default);

	function maxToolboxHeight(): number {
		const total = sidebarEl.value?.clientHeight ?? 600;
		return Math.max(TOOLBOX_H.min, total - PROPS_MIN - SPLITTER);
	}

	function clampToolboxHeight(): void {
		toolboxHeight.value = clamp(
			toolboxHeight.value,
			TOOLBOX_H.min,
			maxToolboxHeight(),
		);
	}

	function persist(): void {
		saveLayout({
			width: sidebarWidth.value,
			toolboxHeight: toolboxHeight.value,
		});
	}

	function startWidthResize(e: PointerEvent): void {
		if (e.button !== 0) return;
		const target = e.currentTarget as HTMLElement;
		target.setPointerCapture(e.pointerId);
		const startX = e.clientX;
		const startW = sidebarWidth.value;

		const onMove = (ev: PointerEvent) => {
			sidebarWidth.value = clamp(
				startW + (ev.clientX - startX),
				WIDTH.min,
				WIDTH.max,
			);
		};

		const onUp = (ev: PointerEvent) => {
			target.releasePointerCapture(ev.pointerId);
			target.removeEventListener("pointermove", onMove);
			target.removeEventListener("pointerup", onUp);
			target.removeEventListener("pointercancel", onUp);
			setDragCursor(null);
			persist();
		};

		target.addEventListener("pointermove", onMove);
		target.addEventListener("pointerup", onUp);
		target.addEventListener("pointercancel", onUp);
		setDragCursor("col-resize");
		e.preventDefault();
	}

	function startToolboxResize(e: PointerEvent): void {
		if (e.button !== 0) return;
		const target = e.currentTarget as HTMLElement;
		target.setPointerCapture(e.pointerId);
		const startY = e.clientY;
		const startH = toolboxHeight.value;

		const onMove = (ev: PointerEvent) => {
			toolboxHeight.value = clamp(
				startH + (ev.clientY - startY),
				TOOLBOX_H.min,
				maxToolboxHeight(),
			);
		};

		const onUp = (ev: PointerEvent) => {
			target.releasePointerCapture(ev.pointerId);
			target.removeEventListener("pointermove", onMove);
			target.removeEventListener("pointerup", onUp);
			target.removeEventListener("pointercancel", onUp);
			setDragCursor(null);
			persist();
		};

		target.addEventListener("pointermove", onMove);
		target.addEventListener("pointerup", onUp);
		target.addEventListener("pointercancel", onUp);
		setDragCursor("row-resize");
		e.preventDefault();
	}

	let resizeObserver: ResizeObserver | null = null;

	onMounted(() => {
		const stored = loadStored();
		sidebarWidth.value = stored.width;
		toolboxHeight.value = stored.toolboxHeight;
		clampToolboxHeight();

		if (sidebarEl.value && typeof ResizeObserver !== "undefined") {
			resizeObserver = new ResizeObserver(() => clampToolboxHeight());
			resizeObserver.observe(sidebarEl.value);
		}
	});

	onUnmounted(() => {
		resizeObserver?.disconnect();
		setDragCursor(null);
	});

	return {
		sidebarWidth,
		toolboxHeight,
		startWidthResize,
		startToolboxResize,
	};
}
