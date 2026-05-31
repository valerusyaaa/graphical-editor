<script setup lang="ts">
import { useProfilesStore } from "~/stores/profiles";
import { computed, watch } from "vue";
import ECharts from "./ECharts.vue";

const props = defineProps<{
  objectId: number;
}>();

const profileStore = useProfilesStore();

const options = computed(() => {
  void profileStore.chartLayoutRevision;
  return profileStore.activeProfile?.options;
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
  profileStore.applyProfileLegendSelected(selected);
}

watch(
  () => props.objectId,
  async (objectId) => {
    await profileStore.fetchProfile(objectId);
  },
  { immediate: true }
);
</script>

<template>
  <div class="profiles-viewer">
    <div v-if="!options" class="no-data">
      Нет данных для отображения
    </div>
    <div v-else ref="echarts" class="chart-container">
      <ECharts :option="options" @legendselectchanged="onLegendSelectChanged" />
    </div>
  </div>
</template>

<style scoped>
.profiles-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.no-data {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  color: white;
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
