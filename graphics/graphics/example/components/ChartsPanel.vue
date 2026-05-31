<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { TabPaneName } from "element-plus";
import ProfilesViewer from "./ProfilesViewer.vue";
import TrendsViewer from "./TrendsViewer.vue";
import SeriesProfileEditor from "./SeriesProfileEditor.vue";
import SeriesTrendEditor from "./SeriesTrendEditor.vue";
import { useTrendsStore } from "~/stores/trends";
import { useProfilesStore } from "~/stores/profiles";
import { useExplorerStore } from "~/stores/explorer";
import { useChartTabsStore, type ChartKind } from "~/stores/chartTabs";
import { ElMessage, ElMessageBox } from "element-plus";

const chartTabsStore = useChartTabsStore();
const openMode = ref<ChartKind>("profiles");

const chartPanelType = computed<"trends" | "profiles" | null>(
  () => chartTabsStore.activeTab?.kind ?? null
);

const chartTabModel = computed({
  get: () =>
    chartTabsStore.activeTabId != null ? String(chartTabsStore.activeTabId) : "",
  set: (v: string) => {
    if (v) chartTabsStore.setActive(Number(v));
  },
});

// Состояния видимости панелей: старт — только область графика; проводник и редактор поверх
const showExplorer = ref(false);
const showCharts = ref(true);
const showEditor = ref(false);

const trendsStore = useTrendsStore();
const profilesStore = useProfilesStore();
const explorerStore = useExplorerStore();

const trendRangeModel = computed({
  get(): [Date, Date] {
    return [new Date(trendsStore.rangeFromIso), new Date(trendsStore.rangeToIso)];
  },
  set(v: [Date, Date] | null) {
    if (!v?.[0] || !v?.[1]) return;
    trendsStore.rangeFromIso = v[0].toISOString();
    trendsStore.rangeToIso = v[1].toISOString();
  },
});

const trendRangeShortcuts = [
  {
    text: "7 дней",
    value: () => {
      const end = new Date();
      const start = new Date(end.getTime() - 7 * 86400000);
      return [start, end];
    },
  },
  {
    text: "30 дней",
    value: () => {
      const end = new Date();
      const start = new Date(end.getTime() - 30 * 86400000);
      return [start, end];
    },
  },
  {
    text: "Год",
    value: () => {
      const end = new Date();
      const start = new Date(end.getTime() - 365 * 86400000);
      return [start, end];
    },
  },
];

async function applyTrendRange() {
  const tab = chartTabsStore.activeTab;
  if (!tab || tab.kind !== "trends") return;
  await trendsStore.fetchTrend(tab.objectId);
}

async function refreshActiveChartsFromServer() {
  const tab = chartTabsStore.activeTab;
  if (!tab) return;
  if (tab.kind === "trends") {
    await trendsStore.fetchTrend(tab.objectId);
  } else {
    await profilesStore.fetchProfile(tab.objectId);
  }
}

const demoDataLoading = ref(false);

async function onDemoDataUpdated() {
  const config = useRuntimeConfig();
  demoDataLoading.value = true;
  try {
    await $fetch(`${config.public.apiBase}/demo/data-updated`, { method: "POST" });
  } catch {
    ElMessage.error("Не удалось применить имитацию новых данных. Запущен ли data-service?");
    return;
  } finally {
    demoDataLoading.value = false;
  }

  try {
    await ElMessageBox.confirm(
      "На сервер поступили новые измерения. Обновить графики на экране?",
      "Данные обновились",
      {
        confirmButtonText: "Обновить",
        cancelButtonText: "Позже",
        type: "info",
      }
    );
    await refreshActiveChartsFromServer();
    ElMessage.success("Графики обновлены");
  } catch {
    ElMessage.info(
      "Графики обновятся автоматически при следующем открытии вкладки или переключении на другой график."
    );
  }
}

async function onExplorerObjectClick(item: {
  id: number;
  name: string;
  kind?: string;
}) {
  await explorerStore.selectObject(item.id);
  const isPipeline = item.kind === "pipeline";
  const chartKind = isPipeline ? "profiles" : openMode.value;
  const suffix = chartKind === "profiles" ? "Профиль" : "Тренд";
  chartTabsStore.openTab(item.id, chartKind, `${item.name} · ${suffix}`);
}

function onChartTabRemove(name: TabPaneName) {
  chartTabsStore.closeTab(Number(name));
}

const profileSerieses = computed(() => {
  return profilesStore.activeProfile?.serieses || [];
});

const trendGroups = computed(() => {
  return trendsStore.groups || [];
});

onMounted(async () => {
  await explorerStore.fetchObjects();
  if (explorerStore.selectedObjectId) {
    await explorerStore.fetchObjectProperties(explorerStore.selectedObjectId);
  }
});

</script>

<template>
  <div class="charts-panel-container">
    <!-- Основная часть с графиками на весь фон (панели не сдвигают эту область) -->
    <div v-if="showCharts" class="charts-main">
      <div v-if="chartTabsStore.tabs.length === 0" class="charts-empty-hint">
        В проводнике выберите «Профиль» или «Тренд», затем нажмите на объект — график откроется вкладкой сверху.
      </div>
      <div v-else class="charts-tab-stack">
        <el-tabs
          v-model="chartTabModel"
          type="card"
          class="chart-el-tabs chart-el-tabs--headers-only"
          closable
          @tab-remove="onChartTabRemove"
        >
          <el-tab-pane
            v-for="tab in chartTabsStore.tabs"
            :key="tab.id"
            :label="tab.title"
            :name="String(tab.id)"
          >
            <span class="chart-tab-pane-placeholder" />
          </el-tab-pane>
        </el-tabs>
        <div class="charts-single-view">
          <ProfilesViewer
            v-if="chartTabsStore.activeTab?.kind === 'profiles'"
            :key="chartTabsStore.activeTab.id"
            :object-id="chartTabsStore.activeTab.objectId"
          />
          <TrendsViewer
            v-else-if="chartTabsStore.activeTab?.kind === 'trends'"
            :key="chartTabsStore.activeTab.id"
            :object-id="chartTabsStore.activeTab.objectId"
          />
        </div>
      </div>
    </div>

    <!-- Проводник поверх графика слева -->
    <div v-show="showExplorer" class="explorer-panel explorer-panel--overlay">
      <div class="explorer-header">
        <span class="explorer-header-title">Проводник</span>
        <button
          type="button"
          class="explorer-close"
          title="Закрыть проводник"
          aria-label="Закрыть проводник"
          @click="showExplorer = false"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="explorer-open-mode">
        <div class="explorer-open-mode-label">Открыть график</div>
        <div class="explorer-open-mode-buttons">
          <button
            type="button"
            class="explorer-mode-btn"
            :class="{ active: openMode === 'profiles' }"
            @click="openMode = 'profiles'"
          >
            Профиль
          </button>
          <button
            type="button"
            class="explorer-mode-btn"
            :class="{
              active: openMode === 'trends',
              disabled: explorerStore.selectedObject?.kind === 'pipeline',
            }"
            :disabled="explorerStore.selectedObject?.kind === 'pipeline'"
            title="Для трубы доступен только профиль высоты по длине"
            @click="openMode = 'trends'"
          >
            Тренд
          </button>
        </div>
      </div>
      <div class="explorer-demo-block">
        <button
          type="button"
          class="explorer-demo-btn"
          :disabled="demoDataLoading"
          @click.stop="onDemoDataUpdated"
        >
          {{ demoDataLoading ? "…" : "Данные обновились" }}
        </button>
        <div class="explorer-demo-hint">
          Имитация поступления новых точек на сервер
        </div>
      </div>
      <div class="explorer-items">
        <div
          v-for="item in explorerStore.objects"
          :key="item.id"
          class="explorer-item"
          :class="{ active: explorerStore.selectedObjectId === item.id }"
          @click="onExplorerObjectClick(item)"
        >
          {{ item.name }}
        </div>
      </div>
      <div v-if="explorerStore.selectedObjectProperties.length" class="explorer-properties">
        <div class="explorer-properties-title">Свойства объекта</div>
        <div
          v-for="prop in explorerStore.selectedObjectProperties"
          :key="prop.key"
          class="explorer-property-row"
        >
          <span class="explorer-property-name">{{ prop.displayName }}</span>
          <span class="explorer-property-value">
            {{ prop.value }}<template v-if="prop.unit"> {{ prop.unit }}</template>
          </span>
        </div>
      </div>
    </div>

    <!-- Панель редактирования поверх графика справа (слева от полосы иконок) -->
    <div v-show="showEditor" class="editor-panel editor-panel--overlay">
      <div class="editor-header">Панель редактирования</div>
      
      <div v-if="chartPanelType === 'profiles' && profilesStore.activeProfile">
        <div class="editor-title">{{ profilesStore.activeProfile.pipeName }}</div>
        <SeriesProfileEditor
          v-for="(series, index) in profileSerieses"
          :key="index"
          :series="series"
        />
      </div>

      <div v-else-if="chartPanelType === 'trends'">
        <div class="editor-range-block">
          <div class="editor-range-label">Интервал времени</div>
          <el-date-picker
            v-model="trendRangeModel"
            type="datetimerange"
            range-separator="—"
            start-placeholder="Начало"
            end-placeholder="Конец"
            format="DD.MM.YYYY HH:mm"
            :shortcuts="trendRangeShortcuts"
            :disabled="trendsStore.loading"
            class="editor-datetimerange"
          />
          <el-button
            type="primary"
            class="editor-apply-btn"
            :loading="trendsStore.loading"
            :disabled="
              !chartTabsStore.activeTab || chartTabsStore.activeTab.kind !== 'trends'
            "
            @click="applyTrendRange"
          >
            Применить
          </el-button>
        </div>

        <template v-if="trendsStore.activeTrend">
          <div
            v-for="group in trendGroups"
            :key="group[0]"
            class="editor-group"
          >
            <div class="editor-group-title">{{ group[0] }}</div>
            <SeriesTrendEditor
              v-for="(series, index) in group[1].serieses"
              :key="index"
              :series="series"
            />
          </div>
        </template>
      </div>

      <div v-else class="editor-empty">
        Выберите график для редактирования
      </div>
    </div>

    <!-- Правая панель с иконками (всегда видна, самая маленькая) -->
    <div class="icons-panel">
      <div class="icon-button" @click="showExplorer = !showExplorer" :class="{ active: showExplorer }" title="Проводник">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
      </div>
      <div class="icon-button" @click="showCharts = !showCharts" :class="{ active: showCharts }" title="Графики">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
      </div>
      <div class="icon-button" @click="showEditor = !showEditor" :class="{ active: showEditor }" title="Редактирование">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.charts-panel-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  background: #0f172a;
  position: relative;
  padding-right: 80px; /* Место под закреплённую панель с иконками */
  overflow: hidden;
}

/* Проводник */
.explorer-panel {
  width: 250px;
  min-width: 250px;
  background-color: #1e293b;
  color: white;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.explorer-panel--overlay {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 900;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.45);
}

.explorer-header {
  box-sizing: border-box;
  min-height: calc(2rem + 1.125rem * 1.25);
  padding: 0 0.35rem 0 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-weight: bold;
  font-size: 1.125rem;
  line-height: 1.25;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background-color: #1e293b;
}

.explorer-header-title {
  flex: 1;
  min-width: 0;
}

.explorer-close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.explorer-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
}

.explorer-items {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.explorer-properties {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.75rem 1rem 0.85rem;
  background-color: rgba(15, 23, 42, 0.55);
}

.explorer-properties-title {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-bottom: 0.5rem;
}

.explorer-property-row {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.82rem;
  color: #e2e8f0;
  margin-bottom: 0.35rem;
}

.explorer-property-name {
  color: #cbd5e1;
}

.explorer-property-value {
  color: #f8fafc;
  text-align: right;
}

.explorer-item {
  padding: 0.75rem 1rem;
  margin-bottom: 0.25rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  user-select: none;
}

.explorer-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.explorer-item.active {
  background-color: #409eff;
  color: white;
}

/* Область графика на всю ширину контейнера (панели не меняют её размер) */
.charts-main {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  z-index: 0;
}

.charts-empty-hint {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  color: #94a3b8;
  font-size: 1rem;
  text-align: center;
  max-width: 28rem;
  margin: 0 auto;
}

.charts-tab-stack {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.charts-single-view {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.chart-tab-pane-placeholder {
  display: none !important;
}

.chart-el-tabs {
  flex-shrink: 0;
  --el-tabs-header-height: 42px;
}

.chart-el-tabs :deep(.el-tabs__header) {
  margin: 0;
  background: #1e293b;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.chart-el-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.chart-el-tabs :deep(.el-tabs__item) {
  color: #cbd5e1;
  border-bottom-color: transparent;
}

.chart-el-tabs :deep(.el-tabs__item.is-active) {
  color: #fff;
}

.chart-el-tabs :deep(.el-tabs__active-bar) {
  background-color: #409eff;
}

.chart-el-tabs--headers-only :deep(.el-tabs__content) {
  display: none !important;
  padding: 0 !important;
  margin: 0 !important;
}

.explorer-open-mode {
  padding: 0.65rem 1rem 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background-color: #1e293b;
}

.explorer-open-mode-label {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-bottom: 0.45rem;
}

.explorer-open-mode-buttons {
  display: flex;
  gap: 0.35rem;
}

.explorer-mode-btn {
  flex: 1;
  padding: 0.4rem 0.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  transition: background 0.15s;
}

.explorer-mode-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.explorer-mode-btn.active {
  background: #409eff;
  color: #fff;
}

.explorer-mode-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.explorer-demo-block {
  padding: 0.65rem 1rem 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.explorer-demo-btn {
  width: 100%;
  padding: 0.5rem 0.65rem;
  border: 1px solid rgba(96, 165, 250, 0.45);
  border-radius: 6px;
  background: rgba(59, 130, 246, 0.2);
  color: #e2e8f0;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.explorer-demo-btn:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.35);
  border-color: rgba(147, 197, 253, 0.55);
}

.explorer-demo-btn:disabled {
  opacity: 0.55;
  cursor: wait;
}

.explorer-demo-hint {
  margin-top: 0.35rem;
  font-size: 0.7rem;
  color: #64748b;
  line-height: 1.25;
}

/* Панель редактирования */
.editor-panel {
  width: 460px;
  min-width: 460px;
  background-color: #1f2937;
  color: white;
  overflow-y: auto;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.editor-panel--overlay {
  position: absolute;
  right: 80px;
  top: 0;
  bottom: 0;
  z-index: 900;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.45);
}

.editor-header {
  box-sizing: border-box;
  min-height: calc(2rem + 1.125rem * 1.25);
  padding: 0 1rem;
  display: flex;
  align-items: center;
  font-weight: bold;
  font-size: 1.125rem;
  line-height: 1.25;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background-color: #1f2937;
  position: sticky;
  top: 0;
  z-index: 10;
}

.editor-title {
  padding: 0.5rem 1rem;
  font-weight: 600;
}

.editor-group {
  margin-bottom: 1rem;
}

.editor-group-title {
  padding: 0.5rem 1rem;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.editor-empty {
  padding: 1rem;
  text-align: center;
  color: #9ca3af;
}

.editor-range-block {
  padding: 0.75rem 1rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.editor-range-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: #e2e8f0;
  letter-spacing: 0.02em;
}

.editor-datetimerange {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  display: block;
}

.editor-panel :deep(.editor-datetimerange.el-date-editor),
.editor-panel :deep(.editor-datetimerange.el-range-editor) {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box;
}

.editor-apply-btn {
  align-self: stretch;
  width: 100%;
  box-sizing: border-box;
  height: 40px;
}

/* Правая панель с иконками (всегда видна, закреплена) */
.icons-panel {
  width: 80px;
  background-color: #1e293b;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem 0;
  gap: 0.75rem;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 1000;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.3);
}

.icon-button {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 6px;
  color: #94a3b8;
  transition: all 0.2s;
}

.icon-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
}

.icon-button.active {
  background-color: #409eff;
  color: white;
}

.icon-button svg {
  width: 24px;
  height: 24px;
}

/* Поля ввода менее выделяющиеся на фоне панели */
.editor-panel :deep(.el-input-number .el-input__wrapper),
.editor-panel :deep(.el-select .el-select__wrapper) {
  background-color: rgba(31, 41, 55, 0.9) !important;
  box-shadow: 0 0 0 1px rgba(75, 85, 99, 0.4) !important;
}

.editor-panel :deep(.el-input-number .el-input__wrapper:hover),
.editor-panel :deep(.el-select .el-select__wrapper:hover),
.editor-panel :deep(.el-input-number.is-focus .el-input__wrapper),
.editor-panel :deep(.el-select.is-focus .el-select__wrapper) {
  box-shadow: 0 0 0 1px rgba(107, 114, 128, 0.5) !important;
}

.editor-panel :deep(.el-input-number .el-input__inner),
.editor-panel :deep(.el-select .el-select__placeholder),
.editor-panel :deep(.el-select .el-select__selected-item) {
  color: #d1d5db !important;
}

.editor-panel :deep(.el-color-picker__trigger) {
  background-color: rgba(31, 41, 55, 0.9) !important;
  border: 1px solid rgba(75, 85, 99, 0.4) !important;
}

.editor-panel :deep(.el-color-picker__trigger:hover) {
  border-color: rgba(107, 114, 128, 0.5) !important;
}

/* Кнопки +/- у ElInputNumber в том же сером стиле */
.editor-panel :deep(.el-input-number__decrease),
.editor-panel :deep(.el-input-number__increase) {
  background-color: rgba(31, 41, 55, 0.9) !important;
  border-color: rgba(75, 85, 99, 0.4) !important;
  color: #d1d5db !important;
}

.editor-panel :deep(.el-input-number__decrease:hover),
.editor-panel :deep(.el-input-number__increase:hover) {
  background-color: rgba(55, 65, 81, 0.9) !important;
  border-color: rgba(107, 114, 128, 0.6) !important;
  color: #e5e7eb !important;
}

.editor-panel :deep(.editor-datetimerange .el-input__wrapper) {
  width: 100%;
  box-sizing: border-box;
  height: 40px;
  min-height: 40px;
  padding: 0 12px !important;
  padding-inline: 12px !important;
  background-color: #fafafa !important;
  box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.45) !important;
  overflow: visible !important;
}

.editor-panel :deep(.editor-datetimerange .el-range-editor.el-input__wrapper) {
  justify-content: flex-start;
  align-items: center;
  gap: 0 !important;
  column-gap: 0 !important;
  overflow: visible !important;
}

.editor-panel :deep(.editor-datetimerange .el-range__icon) {
  margin-inline-end: 6px !important;
  flex-shrink: 0 !important;
  color: #64748b !important;
  font-size: 18px !important;
}

.editor-panel :deep(.editor-datetimerange .el-input__wrapper:hover),
.editor-panel :deep(.editor-datetimerange .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.65) !important;
}

.editor-panel :deep(.editor-datetimerange input.el-range-input) {
  flex: 1 1 0 !important;
  /* не даём flex-сжатию обрезать «DD.MM.YYYY HH:mm» */
  min-width: 10.5rem !important;
  width: auto !important;
  max-width: none !important;
  color: #1e293b !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  letter-spacing: 0.02em;
  overflow: visible !important;
  text-overflow: clip !important;
}

/* Заполненные даты — по центру своей половины, без сильного прижатия к тире */
.editor-panel :deep(
    .editor-datetimerange input.el-range-input:first-of-type:not(:placeholder-shown)
  ) {
  text-align: center !important;
}

.editor-panel :deep(.editor-datetimerange input.el-range-input:first-of-type:placeholder-shown) {
  text-align: left !important;
}

.editor-panel :deep(.editor-datetimerange input.el-range-input:last-of-type) {
  text-align: center !important;
}

.editor-panel :deep(
    .editor-datetimerange input.el-range-input:last-of-type:placeholder-shown
  ) {
  text-align: left !important;
}

.editor-panel :deep(.editor-datetimerange .el-range-input::placeholder) {
  color: #64748b !important;
  font-weight: 500 !important;
}

.editor-panel :deep(.editor-datetimerange .el-range-separator) {
  padding: 0 3px !important;
  margin: 0 !important;
  min-width: 0 !important;
  width: auto !important;
  flex-shrink: 0 !important;
  color: #475569 !important;
  font-size: 14px !important;
  font-weight: 600 !important;
}

.editor-panel :deep(.editor-datetimerange .el-range__close-icon) {
  color: #94a3b8 !important;
}

.editor-panel :deep(.editor-datetimerange .el-range__close-icon:hover) {
  color: #475569 !important;
}
</style>
