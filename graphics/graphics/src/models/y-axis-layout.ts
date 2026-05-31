import type { EChartsOption } from "echarts";
import type { SeriesBase } from "./SeriesBase";

/** Отступ между колонками соседних осей Y (пиксели). */
const AXIS_GAP_PX = 20;
/** Минимальная ширина колонки одной оси (подписи + запас под название оси). */
const MIN_AXIS_COLUMN_PX = 88;
/** Запас справа от последней колонки до области графика. */
const GRID_RIGHT_MARGIN_PX = 48;
/** Дополнительный запас к измеренной ширине текста подписей. */
const LABEL_PADDING_PX = 32;

function sampleTickLabel(series: SeriesBase): string {
  const data = series.chartSeries.data as unknown;
  let maxAbs = 0;
  if (Array.isArray(data)) {
    for (const row of data) {
      const v = Array.isArray(row) ? row[1] : (row as { value?: number }).value;
      if (typeof v === "number" && Number.isFinite(v)) {
        maxAbs = Math.max(maxAbs, Math.abs(v));
      }
    }
  }
  if (maxAbs === 0) maxAbs = 100;
  const d = Math.min(6, Math.max(0, series.digits));
  const formatted = maxAbs.toFixed(d);
  return `${formatted} ${series.activeUnit.displayName}`;
}

function measureTextWidthPx(text: string, fontSize = 14): number {
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.font = `${fontSize}px Inter, system-ui, "Segoe UI", sans-serif`;
      return ctx.measureText(text).width;
    }
  }
  return text.length * fontSize * 0.58;
}

/** Ширина колонки для одной физической оси (подписи делений). */
export function estimateAxisColumnWidth(series: SeriesBase): number {
  const sample = sampleTickLabel(series);
  const w = measureTextWidthPx(sample, 14) + LABEL_PADDING_PX;
  return Math.max(MIN_AXIS_COLUMN_PX, Math.ceil(w));
}

/** Уникальные оси в порядке первого появления ряда. */
export function orderedAxisIds(serieses: SeriesBase[]): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const s of serieses) {
    const id = s.activeUnit.quantity.name;
    if (!seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  }
  return order;
}

/**
 * Накопительные offset для осей Y и отступ grid.left.
 * Каждая следующая ось сдвигается на ширину предыдущих колонок + зазор.
 */
export function computeYAxisLayout(serieses: SeriesBase[]): {
  offsetByAxisId: Map<string, number>;
  columnWidthByAxisId: Map<string, number>;
  gridLeftPx: number;
} {
  const offsetByAxisId = new Map<string, number>();
  const columnWidthByAxisId = new Map<string, number>();

  const ids = orderedAxisIds(serieses);
  if (ids.length === 0) {
    return {
      offsetByAxisId,
      columnWidthByAxisId,
      gridLeftPx: GRID_RIGHT_MARGIN_PX,
    };
  }

  let cumulative = 0;
  for (const axisId of ids) {
    const series = serieses.find((s) => s.activeUnit.quantity.name === axisId);
    const col = series ? estimateAxisColumnWidth(series) : MIN_AXIS_COLUMN_PX;
    columnWidthByAxisId.set(axisId, col);
    offsetByAxisId.set(axisId, cumulative);
    cumulative += col + AXIS_GAP_PX;
  }

  const gridLeftPx = Math.max(GRID_RIGHT_MARGIN_PX, cumulative + GRID_RIGHT_MARGIN_PX);

  return { offsetByAxisId, columnWidthByAxisId, gridLeftPx };
}

/** Проставляет offset по оси и grid.left в уже собранном option. */
export function applyYAxisLayoutToOptions(options: EChartsOption, serieses: SeriesBase[]): void {
  const { offsetByAxisId, gridLeftPx } = computeYAxisLayout(serieses);
  if (!options.yAxis || !Array.isArray(options.yAxis)) return;

  options.grid = {
    ...(typeof options.grid === "object" && options.grid !== null ? options.grid : {}),
    left: `${gridLeftPx}px`,
  };

  options.yAxis = (options.yAxis as object[]).map((ax: Record<string, unknown>) => {
    const id = String(ax.id ?? "");
    const off = offsetByAxisId.get(id);
    if (off === undefined) return ax;
    return {
      ...ax,
      offset: off,
      nameGap: 28,
      axisLabel: {
        ...(typeof ax.axisLabel === "object" && ax.axisLabel !== null ? ax.axisLabel : {}),
        hideOverlap: true,
      },
    };
  });
}
