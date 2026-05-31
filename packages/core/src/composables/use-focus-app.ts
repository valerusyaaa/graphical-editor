import { ref, onMounted, onBeforeUnmount, type Ref } from "vue";

/**
 * usePixiFocus — отслеживает фокус canvas внутри компонента vue3-pixi Application
 * @param appRef - ссылка на компонент <Application> (ref)
 * @returns { isFocused } — реактивный флаг фокуса
 */
export function useFocusApp(appRef: Ref<any>) {
    const isFocused = ref(false);

    const handleFocus = () => (isFocused.value = true);
    const handleBlur = () => (isFocused.value = false);

    let canvas: HTMLCanvasElement | null = null;

    const el = appRef.value?.$el || appRef.value;

    if (el instanceof HTMLCanvasElement) {
        canvas = el;
    } else if (el instanceof HTMLElement) {
        // ищем вложенный canvas
        canvas = el.querySelector("canvas");
    }

    if (canvas) {
        // чтобы фокус работал, нужно tabindex
        canvas.setAttribute("tabindex", "0");
        canvas.addEventListener("focus", handleFocus);
        canvas.addEventListener("blur", handleBlur);
    }

    // снимаем фокус при клике вне canvas
    const handleClickOutside = (e: MouseEvent) => {
        if (canvas && !canvas.contains(e.target as Node)) {
            isFocused.value = false;
        }
    };
    window.addEventListener("click", handleClickOutside);

    onBeforeUnmount(() => {
        if (canvas) {
            canvas.removeEventListener("focus", handleFocus);
            canvas.removeEventListener("blur", handleBlur);
        }
        window.removeEventListener("click", handleClickOutside);
    });
    return { isFocused };
}
