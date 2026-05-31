import { SeriesTrend } from "./SeriesTrend";
import moment from "moment-timezone";
import type { EChartsOption, LineSeriesOption } from "echarts";
import { syncYAxesWithLegend } from "./legend-axis-sync";
import { applyYAxisLayoutToOptions } from "./y-axis-layout";

/** Длинный интервал (~≥200 суток) или очень плотный ряд — включаем sampling / large в ECharts. */
const DENSE_TREND_SPAN_MS = 200 * 24 * 60 * 60 * 1000;
const DENSE_TREND_POINT_THRESHOLD = 2500;

export interface TrendInfo {
  startTime: moment.Moment;
  endTime: moment.Moment;
  serieses: SeriesTrend[];
}

export class Trend {
  serieses: SeriesTrend[];
  startTime: moment.Moment;
  endTime: moment.Moment;
  options: EChartsOption;
  /** Последнее состояние легенды ECharts; после refresh снова накладывается на option. */
  private lastLegendSelected: Record<string, boolean> | null = null;

  constructor(info: TrendInfo) {
    this.serieses = info.serieses;
    this.startTime = info.startTime;
    this.endTime = info.endTime;
    this.applyDenseTrendSamplingToSerieses();
    this.options = this.createOptions();
  }

  createOptions(): EChartsOption {
    const axisMap = new Map<string, { series: SeriesTrend; index: number }>();
    let axisIndex = 0;

    const axisOrder = new Map<string, number>();
    this.serieses.forEach((series) => {
      const axisId = series.activeUnit.quantity.name;
      if (!axisOrder.has(axisId)) {
        axisOrder.set(axisId, axisIndex++);
      }
    });

    this.serieses.forEach((series) => {
      const axisId = series.activeUnit.quantity.name;
      if (!axisMap.has(axisId)) {
        axisMap.set(axisId, { series, index: axisOrder.get(axisId)! });
      }
    });

    const limitSeries = this.createLimitSeries(axisMap);

    const opt: EChartsOption = {
      backgroundColor: "transparent",
      legend: {
        show: true,
        type: "scroll",
        right: "17%",
        top: "2%",
        textStyle: {
          color: "#ffffff",
          fontSize: 16,
        },
      },
      grid: {
        left: "80px",
        top: "10%",
        bottom: "10%",
      },
      tooltip: {
        show: true,
        trigger: "axis",
        backgroundColor: "#1e293b",
        borderColor: "#1e293b",
        axisPointer: { type: "cross" },
        textStyle: {
          color: "#fff",
        },
        valueFormatter: (value: number | string) => {
          if (typeof value === "string") return value;
          if (!Number.isFinite(value)) return String(value);
          if (value > 1e12) return new Date(value).toLocaleString("ru-RU");
          return value.toFixed(3);
        },
      },
      yAxis: Array.from(axisMap.values())
        .sort((a, b) => a.index - b.index)
        .map(({ series }) => ({
          id: series.activeUnit.quantity.name,
          type: "value",
          name: `${series.activeUnit.quantity.displayName}, ${series.activeUnit.displayName}`,
          nameLocation: "center",
          nameTextStyle: {
            color: "#ffffff",
            fontSize: 16,
          },
          offset: 0,
          nameGap: 28,
          position: "left",
          axisLine: {
            show: true,
            lineStyle: {
              color: "#cbd5e1",
            },
          },
          splitLine: {
            lineStyle: { color: "rgba(128,128,128,0.3)" },
          },
          axisLabel: {
            color: "#ffffff",
            fontSize: 14,
            hideOverlap: true,
            formatter: (value: number) => {
              const d = Math.min(6, Math.max(0, series.digits));
              return `${value.toFixed(d)} ${series.activeUnit.displayName}`;
            },
          },
          boundaryGap: ["10%", "10%"],
        })),
      xAxis: [
        {
          type: "time",
          name: "DateTime",
          nameTextStyle: {
            color: "#ffffff",
            fontSize: 16,
          },
          splitLine: {
            show: true,
            lineStyle: { color: "rgba(128,128,128,0.3)" },
          },
          axisLabel: {
            color: "#f1f5f9",
            fontSize: 15,
            fontWeight: 500,
            hideOverlap: true,
          },
        },
      ],
      dataZoom: [
        {
          type: "inside",
          xAxisIndex: 0,
        },
        {
          type: "slider",
          xAxisIndex: 0,
        },
      ],
      series: [...this.serieses.map((s) => s.chartSeries), ...limitSeries],
    };

    applyYAxisLayoutToOptions(opt, this.serieses);
    this.applyXAxisFromDataExtent(opt);
    return opt;
  }

  /**
   * Встроенный даунсэмплинг ECharts (series-line.sampling, large) для года и других длинных интервалов.
   * lttb — Largest-Triangle-Three-Buckets; для ступенчатых рядов — average.
   */
  private applyDenseTrendSamplingToSerieses(): void {
    const spanMs = Math.max(0, this.endTime.valueOf() - this.startTime.valueOf());
    let maxPts = 0;
    for (const s of this.serieses) {
      const d = s.chartSeries.data;
      if (Array.isArray(d)) {
        maxPts = Math.max(maxPts, d.length);
      }
    }

    const dense =
      spanMs >= DENSE_TREND_SPAN_MS || maxPts >= DENSE_TREND_POINT_THRESHOLD;

    for (const s of this.serieses) {
      const line = s.chartSeries as LineSeriesOption & Record<string, unknown>;
      if (!dense) {
        delete line.sampling;
        delete line.large;
        delete line.largeThreshold;
        continue;
      }

      line.large = true;
      line.largeThreshold = 2000;
      line.sampling = s.isStep ? "average" : "lttb";
    }
  }

  /** Минимальное и максимальное время по всем рядам (мс). */
  private getSeriesTimeExtent(): { min: number; max: number } | null {
    let min = Infinity;
    let max = -Infinity;
    for (const s of this.serieses) {
      const data = s.chartSeries.data as [number, number][] | undefined;
      if (!data?.length) continue;
      for (const row of data) {
        const t = row[0];
        if (typeof t === "number" && Number.isFinite(t)) {
          min = Math.min(min, t);
          max = Math.max(max, t);
        }
      }
    }
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
      return null;
    }
    return { min, max };
  }

  /** Сокращает горизонтальную ось до диапазона реальных точек (без пустого места после последнего значения). */
  private applyXAxisFromDataExtent(options: EChartsOption): void {
    if (!options.xAxis || !Array.isArray(options.xAxis)) return;
    const xa = options.xAxis[0] as Record<string, unknown>;
    if (xa.type !== "time") return;

    const ext = this.getSeriesTimeExtent();
    if (!ext) {
      options.xAxis[0] = {
        ...xa,
        min: this.startTime.valueOf(),
        max: this.endTime.valueOf(),
        boundaryGap: [0, 0],
      };
      return;
    }

    options.xAxis[0] = {
      ...xa,
      min: ext.min,
      max: ext.max,
      boundaryGap: [0, 0],
    };
  }

  private createLimitSeries(axisMap: Map<string, { series: SeriesTrend; index: number }>): any[] {
    const limitSeries: any[] = [];
    const minLimit = 60;
    const maxLimit = 140;

    const ext = this.getSeriesTimeExtent();
    const t0 = ext?.min ?? this.startTime.valueOf();
    const t1 = ext?.max ?? this.endTime.valueOf();
    const spanMs = Math.max(t1 - t0, 1);
    const durationHours = spanMs / 3600000;
    const numPoints = Math.max(Math.min(Math.floor(durationHours), 100), 24);

    const timePoints: Date[] = [];
    if (spanMs <= 0 || numPoints < 2) {
      timePoints.push(new Date(t0));
    } else {
      for (let i = 0; i < numPoints; i++) {
        const tMs = t0 + (spanMs * i) / (numPoints - 1);
        timePoints.push(new Date(tMs));
      }
    }

    Array.from(axisMap.values()).forEach(({ series }) => {
      const axisId = series.activeUnit.quantity.name;

      limitSeries.push({
        yAxisId: axisId,
        name: `Мин. лимит (${minLimit})`,
        type: "line",
        data: timePoints.map((time) => [time, minLimit]),
        lineStyle: {
          color: "#ff4757",
          width: 2,
          type: "dashed",
        },
        symbol: "none",
        silent: true,
        legend: {
          show: false,
        },
        tooltip: {
          show: false,
        },
      });

      limitSeries.push({
        yAxisId: axisId,
        name: `Макс. лимит (${maxLimit})`,
        type: "line",
        data: timePoints.map((time) => [time, maxLimit]),
        lineStyle: {
          color: "#ff4757",
          width: 2,
          type: "dashed",
        },
        symbol: "none",
        silent: true,
        legend: {
          show: false,
        },
        tooltip: {
          show: false,
        },
      });
    });

    return limitSeries;
  }

  setTime(startTime: moment.Moment, endTime: moment.Moment) {
    this.startTime = startTime;
    this.endTime = endTime;
  }

  async refresh(): Promise<void> {
    for (const series of this.serieses) {
      await series.refresh(this.startTime, this.endTime);
    }
    this.updateOptions();
  }

  updateOptions(): void {
    const axisMap = new Map<string, { series: SeriesTrend; index: number }>();
    let axisIndex = 0;

    const axisOrder = new Map<string, number>();
    this.serieses.forEach((series) => {
      const axisId = series.activeUnit.quantity.name;
      if (!axisOrder.has(axisId)) {
        axisOrder.set(axisId, axisIndex++);
      }
    });

    this.serieses.forEach((series) => {
      const axisId = series.activeUnit.quantity.name;
      if (!axisMap.has(axisId)) {
        axisMap.set(axisId, { series, index: axisOrder.get(axisId)! });
      }
    });

    const limitSeries = this.createLimitSeries(axisMap);
    this.applyDenseTrendSamplingToSerieses();
    this.options.series = [...this.serieses.map((s) => s.chartSeries), ...limitSeries];
    if (this.options.yAxis && Array.isArray(this.options.yAxis) && this.options.yAxis.length > 0) {
      this.refreshYAxisOffsets();
    }
    if (this.lastLegendSelected) {
      this.options = syncYAxesWithLegend(this.options, this.serieses, this.lastLegendSelected);
    }
    this.applyXAxisFromDataExtent(this.options);
  }

  /** Вызывать из legendselectchanged: убрать ось и лимиты, если ряд скрыт легендой. */
  syncAxesWithLegend(selected: Record<string, boolean>): void {
    this.lastLegendSelected = selected;
    this.options = syncYAxesWithLegend(this.options, this.serieses, selected);
    this.applyXAxisFromDataExtent(this.options);
  }

  refreshYAxisOffsets(): void {
    applyYAxisLayoutToOptions(this.options, this.serieses);
  }
}
