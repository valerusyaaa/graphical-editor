<script setup lang="ts">
import { useTrendsStore } from "~/stores/trends";
import { computed, watch } from "vue";
import ECharts from "./ECharts.vue";

const props = defineProps<{
  objectId: number;
}>();

const trendsStore = useTrendsStore();

const options = computed(() => {
  void trendsStore.chartLayoutRevision;
  return trendsStore.activeTrend?.options;
});

function pickLegendSelected(payload: unknown): Record<string, boolean> | null {
  if (!payload || typeof payload !== "object") return null;
  const sel = (payload as Record<string, unknown>).selected;
  if (!sel || typeof sel !== "object" || Array.isArray(sel)) return null;
  return sel as Record<string, boolean>;
}

function onLegendSelectChanged(payload: unknown) {
  const selected = pickLegendSelected(payload);
  if (!selected) return;
  trendsStore.applyTrendLegendSelected(selected);
}

const hasData = computed(() => {
  return (
    trendsStore.activeTrend &&
    trendsStore.activeTrend.serieses.length > 0 &&
    trendsStore.activeTrend.serieses.some(
      (s) => s.chartSeries.data && (s.chartSeries.data as unknown[]).length > 0
    )
  );
});

watch(
  () => props.objectId,
  async (objectId) => {
    await trendsStore.fetchTrend(objectId);
  },
  { immediate: true }
);
</script>

<template>
  <div class="trends-viewer">
    <div v-if="trendsStore.loading" class="loading-container">
      Загрузка...
    </div>
    <div v-else-if="hasData && options" class="chart-container">
      <ECharts :option="options" @legendselectchanged="onLegendSelectChanged" />
    </div>
    <div v-else class="no-data-message">
      Нет данных за выбранный интервал
    </div>
  </div>
</template>

<style scoped>
.trends-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.loading-container,
.no-data-message {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;
}

.chart-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  height: 100%;
  padding: 0.5rem;
  min-height: 0;
}
</style>
