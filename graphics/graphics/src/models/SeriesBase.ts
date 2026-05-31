import type { SeriesOption } from "echarts";

export interface SeriesBaseInfo {
  title: string;
  color: string | null;
  chartSeries: SeriesOption;
  activeUnit: Unit;
  digits: number;
  isStep?: boolean;
}

export interface Unit {
  name: string;
  displayName: string;
  quantity: {
    name: string;
    displayName: string;
  };
}

export abstract class SeriesBase {
  title: string;
  activeUnit: Unit;
  color: string | null;
  digits: number;
  formatYValue: string;
  chartSeries: SeriesOption;
  isStep: boolean;

  constructor(info: SeriesBaseInfo) {
    this.title = info.title;
    this.activeUnit = info.activeUnit;
    this.color = info.color;
    this.chartSeries = info.chartSeries;
    this.digits = info.digits ?? 0;
    this.formatYValue = `,.${this.digits}f`;
    this.isStep = info.isStep ?? false;
  }

  public setColor(color: string) {
    if (this.chartSeries.lineStyle) {
      this.chartSeries.color = color;
      this.color = color;
    }
  }

  public setThickness(thickness: number) {
    if (this.chartSeries.lineStyle) {
      this.chartSeries.lineStyle.width = thickness;
    }
  }

  public setStyleDash(dash: "solid" | "dashed" | "dotted") {
    if (this.chartSeries.lineStyle) {
      this.chartSeries.lineStyle.type = dash;
    }
  }

  public setStep(isStep: boolean) {
    this.isStep = isStep;
    this.chartSeries.step = isStep ? "start" : false;
  }

  public setArea(isArea: boolean) {
    if (isArea) {
      this.chartSeries.areaStyle = {};
    } else {
      this.chartSeries.areaStyle = undefined;
    }
  }

  public setActiveUnit(unit: Unit) {
    this.activeUnit = unit;
    this.chartSeries.yAxisId = unit.quantity.name;
  }
}
