<script setup lang="ts">

import { onMounted, watch } from "vue";

import ChartsPanel from "~/components/ChartsPanel.vue";

import {

	useEditorSelectionBridgeStore,

	PENDING_CHARTS_OPEN_STORAGE_KEY,

	type ChartOpenItemMessage,

} from "@graphical-editor/editor-bridge";

import { useExplorerStore } from "~/stores/explorer";

import { useChartTabsStore, type ChartKind } from "~/stores/chartTabs";

import { useRabbitMQStore } from "~/stores/rabbitmq";

import type { ExplorerObject } from "~/stores/explorer";



const bridge = useEditorSelectionBridgeStore();

const rabbit = useRabbitMQStore();



const defaultOpenMode: ChartKind = "profiles";



async function applyChartOpenItems(items: ChartOpenItemMessage[]) {

	if (!items.length) return;

	const explorer = useExplorerStore();

	const chartTabs = useChartTabsStore();

	if (!explorer.objects.length) {

		try {

			await explorer.fetchObjects();

		} catch {

			return;

		}

	}

	for (const item of items) {

		await explorer.selectObject(item.chartObjectId);

		chartTabs.openTab(item.chartObjectId, item.chartKind, item.title);

	}

	const last = items[items.length - 1]!;

	bridge.setSelectedSchemeObjectId(last.schemeObjectId);

}



function readPendingFromStorage(): ChartOpenItemMessage[] | null {

	const raw = sessionStorage.getItem(PENDING_CHARTS_OPEN_STORAGE_KEY);

	if (!raw) return null;

	sessionStorage.removeItem(PENDING_CHARTS_OPEN_STORAGE_KEY);

	try {

		const parsed = JSON.parse(raw) as ChartOpenItemMessage[];

		return Array.isArray(parsed) ? parsed : null;

	} catch {

		return null;

	}

}



watch(
	() => bridge.selectedChartObjectId,
	async (chartObjectId) => {
		if (chartObjectId == null) return;
		const explorer = useExplorerStore();
		const chartTabs = useChartTabsStore();
		if (!explorer.objects.length) {
			try {
				await explorer.fetchObjects();
			} catch {
				return;
			}
		}
		const item = explorer.objects.find(
			(o: ExplorerObject) => o.id === chartObjectId,
		);
		if (!item) return;
		const isPipeline = item.kind === "pipeline";
		const chartKind: ChartKind = isPipeline ? "profiles" : defaultOpenMode;
		const suffix = chartKind === "profiles" ? "Профиль" : "Тренд";
		const name = item.name ?? `Объект ${chartObjectId}`;
		await explorer.selectObject(chartObjectId);
		chartTabs.openTab(chartObjectId, chartKind, `${name} · ${suffix}`);
	},
);



onMounted(async () => {

	bridge.attachCrossWindowListener((items) => {

		void applyChartOpenItems(items);

	});

	rabbit.connect();

	const pending = readPendingFromStorage();

	if (pending?.length) {

		await applyChartOpenItems(pending);

	}

});

</script>



<template>

  <div class="charts-root">

    <ChartsPanel />

  </div>

</template>



<style>

.charts-root {

  height: 100vh;

  width: 100vw;

  background: #0f172a;

  position: relative;

  overflow: hidden;

}



* {

  margin: 0;

  padding: 0;

  box-sizing: border-box;

}



html,

body {

  height: 100%;

  width: 100%;

  background-color: #0f172a;

  color: white;

  font-family:

    -apple-system,

    BlinkMacSystemFont,

    "Segoe UI",

    Roboto,

    "Helvetica Neue",

    Arial,

    sans-serif;

}



#app {

  height: 100vh;

  width: 100vw;

}

</style>

