<script setup lang="ts">
import VChart from "vue-echarts";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
} from "echarts/components";
import type { EChartsOption } from "echarts";

use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
]);

defineProps<{
  option: EChartsOption;
  loading?: boolean;
}>();

const emit = defineEmits<{
  legendselectchanged: [payload: unknown];
}>();
</script>

<template>
  <v-chart
    :option="option"
    :loading="loading"
    class="echarts-container"
    @legendselectchanged="emit('legendselectchanged', $event)"
  />
</template>

<style scoped>
.echarts-container {
  width: 100%;
  height: 100%;
}
</style>
