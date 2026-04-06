export const useSchemeContentStore = defineStore("content-scheme", () => {
    const _isShowDirection = ref(true);
    const isShowDirection = computed(() => _isShowDirection.value);
    function onToggleDirection() {
        _isShowDirection.value = !_isShowDirection.value;
    }

    const _colorDirection = ref("ffffff");
    const colorDirection = computed(() => `#${_colorDirection.value}`);
    function getColorDirection() {
        return _colorDirection.value;
    }
    function setColorDirection(color: string) {
        _colorDirection.value = color;
    }

    const _colorDirectionFlow = ref("ffffff");
    const colorDirectionFlow = computed(() => `#${_colorDirectionFlow.value}`);
    function getColorDirectionFlow() {
        return _colorDirectionFlow.value;
    }
    function setColorDirectionFlow(color: string) {
        _colorDirectionFlow.value = color;
    }

    return {
        isShowDirection,
        onToggleDirection,
        colorDirection,
        getColorDirection,
        setColorDirection,
        colorDirectionFlow,
        getColorDirectionFlow,
        setColorDirectionFlow,
    };
});
