<script setup lang="ts">
const props = defineProps<{
    label: string;
    value: string;
    unitName?: string;
    loading?: boolean;
}>();
</script>
<template>
    <div class="grid grid-cols-[minmax(25px,40px)_1fr_50px]  w-full gap-1 pl-2">
        <span class="justify-self-start text-gray-400">{{ label }}</span>
        <PrimeSkeleton v-if="loading" width="10" height="10"></PrimeSkeleton>
        <span v-else class="justify-self-end">{{ value }}</span>
        <span class="justify-self-start text-gray-400">{{ unitName }}</span>
    </div>
</template>
