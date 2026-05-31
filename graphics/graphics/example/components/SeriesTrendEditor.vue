<script setup lang="ts">
import { SeriesTrend } from "charts-for-diplom";
import { ref, watch } from "vue";
import { ElColorPicker, ElInputNumber, ElSelect, ElOption } from "element-plus";
import { useTrendsStore } from "~/stores/trends";

const props = defineProps<{
  series: SeriesTrend;
}>();

const trendsStore = useTrendsStore();

const color = ref(props.series.color || "#5470c6");
const thickness = ref((props.series.chartSeries.lineStyle as any)?.width || 2);
const dashStyle = ref<"solid" | "dashed" | "dotted">(
  ((props.series.chartSeries.lineStyle as any)?.type as "solid" | "dashed" | "dotted") || "solid"
);
const isStep = ref(props.series.isStep);
const isArea = ref(!!props.series.chartSeries.areaStyle);
const selectedUnit = ref(props.series.activeUnit.name);

type UnitOption = {
  label: string;
  unit: {
    name: string;
    displayName: string;
    quantity: {
      name: string;
      displayName: string;
    };
  };
};

function getUnitOptions(): UnitOption[] {
  const quantityName = props.series.activeUnit.quantity.name.toLowerCase();
  if (quantityName === "pressure") {
    return [
      {
        label: "МПа",
        unit: { name: "mpa", displayName: "МПа", quantity: { name: "Pressure", displayName: "Давление" } },
      },
      {
        label: "bar",
        unit: { name: "bar", displayName: "bar", quantity: { name: "Pressure", displayName: "Давление" } },
      },
    ];
  }
  if (quantityName === "temperature") {
    return [
      {
        label: "°C",
        unit: { name: "celsius", displayName: "°C", quantity: { name: "Temperature", displayName: "Температура" } },
      },
      {
        label: "K",
        unit: { name: "kelvin", displayName: "K", quantity: { name: "Temperature", displayName: "Температура" } },
      },
    ];
  }
  if (quantityName === "flow") {
    return [
      {
        label: "м^3/с",
        unit: { name: "m3s", displayName: "м^3/с", quantity: { name: "Flow", displayName: "Расход" } },
      },
      {
        label: "м^3/ч",
        unit: { name: "m3h", displayName: "м^3/ч", quantity: { name: "Flow", displayName: "Расход" } },
      },
    ];
  }
  return [
    {
      label: props.series.activeUnit.displayName,
      unit: props.series.activeUnit,
    },
  ];
}

const unitOptions = getUnitOptions();

watch(color, (newColor) => {
  props.series.setColor(newColor);
  trendsStore.activeTrend?.updateOptions();
});

watch(thickness, (newThickness) => {
  props.series.setThickness(newThickness);
  trendsStore.activeTrend?.updateOptions();
});

watch(dashStyle, (newDash) => {
  props.series.setStyleDash(newDash);
  trendsStore.activeTrend?.updateOptions();
});

watch(isStep, (newStep) => {
  props.series.setStep(newStep);
  trendsStore.activeTrend?.updateOptions();
});

watch(isArea, (newArea) => {
  props.series.setArea(newArea);
  trendsStore.activeTrend?.updateOptions();
});

watch(selectedUnit, (newUnitName) => {
  const option = unitOptions.find((o) => o.unit.name === newUnitName);
  if (!option) return;
  props.series.setActiveUnit(option.unit);
  trendsStore.activeTrend?.updateOptions();
});
</script>

<template>
  <div class="series-editor">
    <div class="series-title">{{ series.title }}</div>
    <div class="editor-row">
      <span>Цвет:</span>
      <el-color-picker v-model="color" />
    </div>
    <div class="editor-row">
      <span>Толщина:</span>
      <el-input-number v-model="thickness" :min="1" :max="10" />
    </div>
    <div class="editor-row">
      <span>Стиль:</span>
      <el-select v-model="dashStyle">
        <el-option label="Сплошная" value="solid" />
        <el-option label="Пунктир" value="dashed" />
        <el-option label="Точки" value="dotted" />
      </el-select>
    </div>
    <div class="editor-row">
      <span>Ступенчатая:</span>
      <el-select v-model="isStep">
        <el-option :value="true" label="Да" />
        <el-option :value="false" label="Нет" />
      </el-select>
    </div>
    <div class="editor-row">
      <span>Заливка:</span>
      <el-select v-model="isArea">
        <el-option :value="true" label="Да" />
        <el-option :value="false" label="Нет" />
      </el-select>
    </div>
    <div class="editor-row">
      <span>Ед. изм.:</span>
      <el-select v-model="selectedUnit">
        <el-option
          v-for="option in unitOptions"
          :key="option.unit.name"
          :label="option.label"
          :value="option.unit.name"
        />
      </el-select>
    </div>
  </div>
</template>

<style scoped>
.series-editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.series-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.editor-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.editor-row > span {
  min-width: 100px;
  flex-shrink: 0;
  text-align: left;
}

.editor-row > :deep(.el-color-picker),
.editor-row > :deep(.el-input-number),
.editor-row > :deep(.el-select) {
  flex: 1;
  min-width: 0;
}
</style>

