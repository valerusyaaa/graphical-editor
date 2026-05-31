import { defineStore } from "pinia";
import {
	EDITOR_CHARTS_OPEN_MESSAGE,
	type ChartOpenItemMessage,
} from "./chart-open";

/** Один канал на origin: окно редактора и окно графиков синхронизируют id выбранного объекта схемы */
const CHANNEL = "graphical-editor-scheme-selection-v1";

let sharedChannel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
	if (typeof globalThis === "undefined" || typeof BroadcastChannel === "undefined") {
		return null;
	}
	if (!sharedChannel) {
		sharedChannel = new BroadcastChannel(CHANNEL);
	}
	return sharedChannel;
}

let listenerAttached = false;

export const useEditorSelectionBridgeStore = defineStore("editor-selection-bridge", {
	state: () => ({
		/** id экземпляра на схеме (как `GraphicObjectDto.id` / `focusedObjectId` в редакторе) */
		selectedSchemeObjectId: null as number | null,
		/** id в data-service для графиков (1…6), если объект — кран/труба */
		selectedChartObjectId: null as number | null,
	}),
	actions: {
		/** Вызвать в окне графиков: подписка на обновления из редактора */
		attachCrossWindowListener(
			onOpenCharts?: (items: ChartOpenItemMessage[]) => void,
		): void {
			if (listenerAttached) return;
			const ch = getChannel();
			if (!ch) return;
			ch.addEventListener(
				"message",
				(ev: MessageEvent<{ type?: string; id?: number | null; items?: ChartOpenItemMessage[] }>) => {
					const d = ev.data;
					if (!d?.type) return;
					if (d.type === "editor-scheme-selection") {
						this.selectedSchemeObjectId = d.id ?? null;
						this.selectedChartObjectId =
							typeof (d as { chartObjectId?: number | null }).chartObjectId ===
							"number"
								? (d as { chartObjectId: number }).chartObjectId
								: null;
						return;
					}
					if (d.type === EDITOR_CHARTS_OPEN_MESSAGE && Array.isArray(d.items)) {
						onOpenCharts?.(d.items);
					}
				},
			);
			listenerAttached = true;
		},

		/** Вызвать из демо-редактора при смене выделения */
		setSelectedSchemeObjectId(
			id: number | null,
			chartObjectId: number | null = null,
		): void {
			this.selectedSchemeObjectId = id;
			this.selectedChartObjectId = chartObjectId;
			getChannel()?.postMessage({
				type: "editor-scheme-selection",
				id,
				chartObjectId,
			});
		},

		/** Открыть вкладки графиков в окне charts.html (BroadcastChannel + sessionStorage). */
		requestOpenCharts(items: ChartOpenItemMessage[]): void {
			if (!items.length) return;
			getChannel()?.postMessage({
				type: EDITOR_CHARTS_OPEN_MESSAGE,
				items,
			});
		},
	},
});
