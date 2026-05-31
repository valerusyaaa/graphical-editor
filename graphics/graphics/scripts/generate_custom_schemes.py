from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


OUT_DIR = Path(r"D:/Диплом что-то адекватное/charts-for-diplom/текст/assets/custom")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def font(size: int):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except OSError:
        return ImageFont.load_default()


def draw_box(draw: ImageDraw.ImageDraw, x1, y1, x2, y2, text, fill="#e8f0ff", outline="#1f3b73"):
    draw.rounded_rectangle((x1, y1, x2, y2), radius=14, fill=fill, outline=outline, width=3)
    f = font(22)
    bbox = draw.multiline_textbbox((0, 0), text, font=f, align="center")
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.multiline_text(
        (x1 + (x2 - x1 - tw) / 2, y1 + (y2 - y1 - th) / 2),
        text,
        font=f,
        fill="#0f172a",
        align="center",
    )


def arrow(draw: ImageDraw.ImageDraw, x1, y1, x2, y2, color="#0f172a"):
    draw.line((x1, y1, x2, y2), fill=color, width=4)
    size = 10
    if x2 >= x1:
        draw.polygon([(x2, y2), (x2 - size, y2 - size), (x2 - size, y2 + size)], fill=color)
    else:
        draw.polygon([(x2, y2), (x2 + size, y2 - size), (x2 + size, y2 + size)], fill=color)


def scheme_architecture():
    img = Image.new("RGB", (1800, 1000), "#ffffff")
    draw = ImageDraw.Draw(img)

    title_font = font(30)
    draw.text((40, 20), "Архитектура приложения визуализации трубопроводного транспорта", fill="#0f172a", font=title_font)

    draw_box(draw, 80, 130, 430, 260, "Пользователь")
    draw_box(draw, 520, 90, 980, 230, "Nuxt 3 / Vue 3\n(Клиентское приложение)")
    draw_box(draw, 520, 280, 980, 430, "AuthView\nChartsPanel")
    draw_box(draw, 1050, 90, 1510, 230, "Pinia Store\n(auth, explorer,\nprofiles, trends)")
    draw_box(draw, 520, 500, 980, 650, "ProfilesViewer\nTrendsViewer\nECharts")
    draw_box(draw, 1050, 500, 1510, 650, "Серверное API\n(/api, HTTP, Bearer token)")
    draw_box(draw, 1050, 730, 1510, 880, "Источник данных\n(телеметрия/БД)")

    arrow(draw, 430, 195, 520, 160)
    arrow(draw, 980, 160, 1050, 160)
    arrow(draw, 750, 230, 750, 280)
    arrow(draw, 980, 350, 1050, 160)
    arrow(draw, 980, 350, 1050, 575)
    arrow(draw, 1280, 650, 1280, 730)
    arrow(draw, 1050, 575, 980, 575)

    img.save(OUT_DIR / "scheme_app_architecture.png")


def scheme_dataflow():
    img = Image.new("RGB", (1800, 1000), "#ffffff")
    draw = ImageDraw.Draw(img)
    title_font = font(30)
    draw.text((40, 20), "Поток данных при построении профилей и трендов", fill="#0f172a", font=title_font)

    draw_box(draw, 100, 140, 500, 270, "1) Выбор объекта\nв проводнике")
    draw_box(draw, 650, 140, 1100, 270, "2) Обновление состояния\nв Pinia")
    draw_box(draw, 1250, 140, 1700, 270, "3) Запрос данных\nк API")

    draw_box(draw, 1250, 390, 1700, 520, "4) Ответ API:\nряды давления,\nтемпературы, расхода")
    draw_box(draw, 650, 390, 1100, 520, "5) Формирование\nмоделей Profile/Trend")
    draw_box(draw, 100, 390, 500, 520, "6) Рендер в ECharts:\nпрофили и тренды")

    draw_box(draw, 450, 690, 1350, 860, "Результат: интерактивные графики,\nмасштабирование, переключение режимов,\nредактирование параметров отображения")

    arrow(draw, 500, 205, 650, 205)
    arrow(draw, 1100, 205, 1250, 205)
    arrow(draw, 1475, 270, 1475, 390)
    arrow(draw, 1250, 455, 1100, 455)
    arrow(draw, 650, 455, 500, 455)
    arrow(draw, 300, 520, 760, 690)

    img.save(OUT_DIR / "scheme_data_flow.png")


if __name__ == "__main__":
    scheme_architecture()
    scheme_dataflow()
    print(OUT_DIR / "scheme_app_architecture.png")
    print(OUT_DIR / "scheme_data_flow.png")
