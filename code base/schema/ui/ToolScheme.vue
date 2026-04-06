<script setup lang="ts">
import { useGraphicSchemeStore } from "@/shared/graphical-editor";

const graphicSchemeStore = useGraphicSchemeStore();

const isLockScheme = ref(true);

watch(
    isLockScheme,
    newVal => {
        graphicSchemeStore.setDraggable(!newVal);
    },
    { immediate: true }
);

function onLockScheme() {
    isLockScheme.value = !isLockScheme.value;
}
</script>
<template>
    <PrimeButton
        v-tooltip.bottom="{ value: isLockScheme ? $t('pages.windows.schema.unlockScheme') : $t('pages.windows.schema.lockScheme') }"
        severity="secondary"
        text
        class="!absolute z-10 top-2 right-2"
        @click="onLockScheme"
    >
        <Icon :name="isLockScheme ? 'fluent:lock-closed-16-regular' : 'fluent:lock-open-16-regular'" size="16" />
    </PrimeButton>
</template>
