import { TextualGraphicObject, useGraphicSchemeStore, type ObjectInfo } from "@/shared/graphical-editor";
import { AlignmentDto, type GraphicLabelDto, type GraphicLabelItemDto } from "../../api";
import { Assets, BitmapText, Bounds, Container, Graphics, Rectangle, type BoundsData } from "pixi.js";
import type { Viewport } from "pixi-viewport";
import { getPositionLabelByGraphType } from "../../lib";

export type GraphicLabelItem = Pick<
    GraphicLabelItemDto,
    | "alignment"
    | "column"
    | "columnSpan"
    | "row"
    | "rowSpan"
    | "marginLeft"
    | "marginBottom"
    | "marginRight"
    | "marginTop"
> & {
    text: BitmapText;
};

export type RedactStyleLabel = Partial<Pick<GraphicLabelDto, "backgroundColor" | "borderColor" | "borderThickness">>;

export class GraphicObjectLabel extends TextualGraphicObject {
    items: GraphicLabelItem[];
    style: Pick<GraphicLabelDto, "backgroundColor" | "borderColor" | "borderThickness">;
    columnsMaxWidth: number[];
    rowsMaxHeight: number[];
    constructor(objectInfo: ObjectInfo<GraphicLabelDto>) {
        super(objectInfo);
        this.data = objectInfo.data;
        this.style = {
            backgroundColor: objectInfo.data?.backgroundColor ?? "#000000",
            borderColor: objectInfo.data?.borderColor ?? "#000000",
            borderThickness: objectInfo.data?.borderThickness ?? 0,
        };
        this.items = this.createItems(objectInfo.data?.items);
        this.columnsMaxWidth = this.calculateColumnsMaxWidth();
        this.rowsMaxHeight = this.calculateRowMaxHeight();
        if (this.graphType !== undefined) {
            this.position = getPositionLabelByGraphType(
                this.graphType,
                objectInfo.data?.position ?? { x: 0, y: 0 },
                this.columnsMaxWidth.reduce((acc, w) => (acc += w), 0),
                this.rowsMaxHeight.reduce((acc, h) => (acc += h), 0)
            );
        } else {
            this.position = objectInfo.data?.position ?? { x: 0, y: 0 };
        }
    }
    get width(): number {
        return this.columnsMaxWidth.reduce((acc, w) => (acc += w), 0);
    }
    get height(): number {
        return this.rowsMaxHeight.reduce((acc, h) => (acc += h), 0);
    }
    private createItems(items: GraphicLabelItemDto[] | undefined) {
        return items
            ? items.map<GraphicLabelItem>(item => ({
                  column: item.column,
                  row: item.row,
                  columnSpan: item.columnSpan,
                  rowSpan: item.rowSpan,
                  alignment: item.alignment,
                  marginLeft: item.marginLeft,
                  marginTop: item.marginTop,
                  marginRight: item.marginRight,
                  marginBottom: item.marginBottom,
                  text: new BitmapText({
                      text: item.sourceText,
                      style: {
                          fontFamily: getFontFamily(item.isTextBold, item.isTextItalic),
                          fontSize: item.fontSize ?? 12,
                          fill: item.textColor ?? "#ffffff",
                      },
                      zIndex: 1,
                  }),
              }))
            : [];
    }
    private calculateColumnsMaxWidth(): number[] {
        if (this.items.length > 0) {
            const countColumns = Math.max(...this.items.map(i => i.column)) + 1;
            const result = new Array(countColumns).fill(0);
            result.forEach((value, colIndex) => {
                const itemsInColumn = this.items.filter(i => i.column === colIndex);
                if (itemsInColumn !== undefined && itemsInColumn.length > 0) {
                    const maxWidth = Math.max(...itemsInColumn.map(i => i.text.width));
                    result[colIndex] = maxWidth + itemsInColumn[0].marginLeft + itemsInColumn[0].marginRight;
                } else {
                    result[colIndex] = 0;
                }
            });
            return result;
        }
        return [];
    }
    private calculateRowMaxHeight() {
        if (this.items.length > 0) {
            const countRows = Math.max(...this.items.map(i => i.row)) + 1;
            const result = new Array(countRows).fill(0);
            result.forEach((value, rowIndex) => {
                const itemsInRow = this.items.filter(i => i.row === rowIndex);
                if (itemsInRow !== undefined && itemsInRow.length > 0) {
                    const maxHeight = Math.max(...itemsInRow.map(i => i.text.height));
                    result[rowIndex] = maxHeight + itemsInRow[0].marginBottom + itemsInRow[0].marginTop;
                } else {
                    result[rowIndex] = 0;
                }
            });
            return result;
        }
        return [];
    }

    redrawText(items: GraphicLabelItemDto[], viewport: Viewport) {
        const container = viewport.getChildByLabel(`${this.idObject}-label`) as Container;
        if (container) {
            container.removeChildren();
            this.data.items = items;
            this.items = this.createItems(items);
            this.columnsMaxWidth = this.calculateColumnsMaxWidth();
            this.rowsMaxHeight = this.calculateRowMaxHeight();
            const { width, height } = this.drawText(container);
            container.hitArea = new Rectangle(0, 0, width, height);
            this.bounds = new Bounds(0, 0, width, height);
            viewport._onUpdate();
        }
    }

    redactStyle(style: RedactStyleLabel): void {
        this.style = { ...this.style, ...style };
        const viewport = useGraphicSchemeStore().getViewport();
        if (viewport) {
            const container = viewport.getChildByLabel(`${this.idObject}-label`) as Container;
            if (container) {
                this.drawBackground(container);
            }
        }
    }
    override drawText(container: Container): { width: number; height: number } {
        if (!this.items || this.items.length === 0) {
            this.addTextCell(container, "No items", 0, 0);
            return {
                width: 100,
                height: 40,
            };
        }
        this.drawBackground(container);
        this.items.forEach(item => {
            this.renderItemText(container, item);
        });
        return { width: this.width, height: this.height };
    }
    private drawBackground(container: Container): void {
        const bgGraphics = container.getChildByLabel("bg") as Graphics | undefined;
        if (bgGraphics) {
            bgGraphics.clear();
            bgGraphics
                .rect(0, 0, this.width, this.height)
                .fill({ color: this.style.backgroundColor })
                .stroke({ color: this.style.borderColor, width: this.style.borderThickness });
        } else {
            const bgGraphics = new Graphics();
            bgGraphics.label = "bg";
            bgGraphics.zIndex = 0;
            bgGraphics
                .rect(0, 0, this.width, this.height)
                .fill({ color: this.style.backgroundColor })
                .stroke({ color: this.style.borderColor, width: this.style.borderThickness });
            container.addChild(bgGraphics);
        }
    }
    private renderItemText(container: Container, item: GraphicLabelItem): void {
        const x = this.columnsMaxWidth.slice(0, item.column).reduce((acc, _x) => {
            acc += _x;
            return acc;
        }, 0);
        const y = this.rowsMaxHeight.slice(0, item.row).reduce((acc, _x) => {
            acc += _x;
            return acc;
        }, 0);

        const width = this.columnsMaxWidth.slice(item.column, item.column + item.columnSpan).reduce((acc, w) => {
            acc += w;
            return acc;
        }, 0);
        const height = this.rowsMaxHeight.slice(item.row, item.row + item.rowSpan).reduce((acc, h) => {
            acc += h;
            return acc;
        }, 0);

        // Позиционируем текст в ячейке с учетом выравнивания
        const textPosition = this.calculateTextPosition(
            item.alignment,
            x,
            y,
            width,
            height,
            item.text.width,
            item.text.height,
            item.marginLeft,
            item.marginTop,
            item.marginBottom,
            item.marginRight
        );

        item.text.x = textPosition.x;
        item.text.y = textPosition.y;

        container.addChild(item.text);
    }

    private calculateTextPosition(
        alignment: AlignmentDto,
        cellX: number,
        cellY: number,
        cellWidth: number,
        cellHeight: number,
        textWidth: number,
        textHeight: number,
        marginLeft: number,
        marginTop: number,
        marginBottom: number,
        marginRight: number
    ): { x: number; y: number } {
        const innerWidth = cellWidth - marginLeft - marginRight;
        const innerHeight = cellHeight - marginBottom - marginTop;
        const innerX = cellX + marginLeft;
        const innerY = cellY + marginTop;

        switch (alignment) {
            case AlignmentDto.LeftTop:
                return { x: innerX, y: innerY };
            case AlignmentDto.LeftCenter:
                return { x: innerX, y: innerY + (innerHeight - textHeight) / 2 };
            case AlignmentDto.LeftBottom:
                return { x: innerX, y: innerY + innerHeight - textHeight };
            case AlignmentDto.CenterTop:
                return { x: innerX + (innerWidth - textWidth) / 2, y: innerY };
            case AlignmentDto.Center:
                return {
                    x: innerX + (innerWidth - textWidth) / 2,
                    y: innerY + (innerHeight - textHeight) / 2,
                };
            case AlignmentDto.CenterBottom:
                return {
                    x: innerX + (innerWidth - textWidth) / 2,
                    y: innerY + innerHeight - textHeight,
                };
            case AlignmentDto.RightTop:
                return { x: innerX + innerWidth - textWidth, y: innerY };
            case AlignmentDto.RightCenter:
                return {
                    x: innerX + innerWidth - textWidth,
                    y: innerY + (innerHeight - textHeight) / 2,
                };
            case AlignmentDto.RightBottom:
                return {
                    x: innerX + innerWidth - textWidth,
                    y: innerY + innerHeight - textHeight,
                };
            default:
                return { x: innerX, y: innerY };
        }
    }

    private addTextCell(container: Container, text: string, x: number, y: number): BitmapText {
        const textElement = new BitmapText({
            text,
            style: {
                fontFamily: "Arial",
                fontSize: 14,
                align: "left",
            },
        });

        textElement.x = x;
        textElement.y = y;
        container.addChild(textElement);
        return textElement;
    }
}

function getFontFamily(isTextBold: boolean, isTextItalic: boolean) {
    if (isTextBold && isTextItalic) {
        return "ArialBoldItalic";
    } else if (isTextBold) {
        return "ArialBold";
    } else if (isTextItalic) {
        return "ArialItalic";
    } else {
        return "ArialBase";
    }
}
