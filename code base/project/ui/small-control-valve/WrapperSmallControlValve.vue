<script setup lang="ts">
const props = defineProps<{
    symbol?:string
}>()
</script>

<template>
    <svg xmlns="http://www.w3.org/2000/svg"
         width="20"
         height="40"
         viewBox="0 0 20 40"
         fill="none">
        <path class="scheme-node"
              d="M10 30.2436V20.2436"/>
        <circle class="scheme-node "
                cx="10" cy="15.5" r="5"/>
        <path class="scheme-node-on "
              d="M 18.0343 34.3486 L 10 30.12 L 1.9658 34.3486 C 1.2998 34.699 0.5 34.2161 0.5 33.4636 V 26.7764 C 0.5 26.0239 1.2998 25.541 1.9658 25.8914 L 10 30.12 L 18.0343 25.8914 C 18.7002 25.541 19.5 26.0239 19.5 26.7764 V 33.4636 C 19.5 34.2161 18.7002 34.699 18.0343 34.3486 Z"/>
        <foreignObject x="5" y="9" height="10" width="10">
            <div class="w-full h-full text-center text-xs">
                {{symbol}}
            </div>
        </foreignObject>
    </svg>
</template>

<style scoped>

</style>