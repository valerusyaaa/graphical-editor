<script setup lang="ts">
import type { TooltipData } from "../composables";

const props = defineProps<TooltipData>();

// Флаг для реального отображения
const isShow = ref(false);
const delayVisible = shallowRef(2000);

let showTimeout: ReturnType<typeof setTimeout> | undefined;

// Следим за isVisible из пропсов
watch(
    () => props.isVisible,
    newVal => {
        if (newVal) {
            // показываем с задержкой
            showTimeout = setTimeout(() => {
                isShow.value = true;
            }, delayVisible.value);
        } else {
            if (showTimeout) {
                clearTimeout(showTimeout);
                showTimeout = undefined;
            }
            isShow.value = false;
        }
    }
);
</script>
<template>
    <Teleport to="body">
        <Transition name="tooltip">
            <div
                v-if="isShow"
                :style="{
                    position: 'fixed',
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    zIndex: 100,
                }"
                class="bg-canvas rounded-[5px] shadow-md shadow-window w-fit h-fit"
            >
                <slot name="tooltip" :object="object" />
            </div>
        </Transition>
    </Teleport>
</template>
<style scoped>
.tooltip-enter-active,
.tooltip-leave-active {
    transition: all 0.3s;
}

.tooltip-enter-from {
    opacity: 0;
    transform: scaleY(0.85);
}

.tooltip-leave-to {
    opacity: 0;
    transform: scaleY(0.85);
}
</style>
