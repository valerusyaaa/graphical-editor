import { Application, Bounds, Graphics, type SCALE_MODE, Texture, TilingSprite } from "pixi.js";
import { Viewport } from "pixi-viewport";

export class Grid extends TilingSprite {
    viewport: Viewport;
    app: Application;
    cellSize: number;
    graphics: Graphics;

    constructor(app: Application, viewport: Viewport, cellSize: number = 20) {
        // Создаем временную текстуру-заглушку, заменим после генерации
        const dummyTexture = Texture.WHITE;
        super({
            texture: dummyTexture,
            width: viewport.worldScreenWidth,
            height: viewport.worldScreenHeight,
        });
        this.app = app;
        this.viewport = viewport;
        this.cellSize = cellSize;
        this.graphics = new Graphics();
        this.createTexture();
        this.setupViewportSync();
    }

    /** Генерирует текстуру для сетки */
    createTexture() {
        const g = this.graphics;
        g.clear();

        // Задаём грань квадрата (!!! важно)
        g.rect(0, 0, this.cellSize, this.cellSize);
        g.fill({ color: 0x000000, alpha: 0 }); // прозрачный фон

        // Вертикальная линия
        g.moveTo(this.cellSize, 0)
            .lineTo(this.cellSize, this.cellSize)
            .moveTo(0, this.cellSize)
            .lineTo(this.cellSize, this.cellSize)
            .stroke({ width: 1, color: 0xffffff, alpha: 0.35 })

        // Генерация текстуры
        const texture = this.app.renderer.generateTexture(g);

        texture.source.scaleMode = "nearest";
        this.texture = texture;
        this._texture = texture;
    }

    /** Устанавливает новый шаг сетки */
    setCellSize(size: number) {
        this.cellSize = size;
        this.createTexture();
    }

    /** Подписка на события viewport */
    setupViewportSync() {
        this.viewport.on("moved", () => {
            // Панорамирование
            this.tilePosition.set(-this.viewport.x, -this.viewport.y);

            // Масштабирование
            this.tileScale.set(this.viewport.scale.x);
        });

        this.viewport.on("zoomed", () => {
            this.tileScale.set(this.viewport.scale.x);
        });
    }
}
