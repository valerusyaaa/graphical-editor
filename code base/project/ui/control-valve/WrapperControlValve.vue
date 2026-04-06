<script setup lang="ts">
const props = defineProps<{
    symbol?:string
}>()
</script>

<template>
    <svg xmlns="http://www.w3.org/2000/svg"
         width="40"
         height="40"
         viewBox="0 0 40 40"
         class="overflow-visible"
         fill="none">
        <path class="scheme-node"
              d="M20 30V20"/>
        <circle class="scheme-node"
                cx="20" cy="10" r="9.5">

        </circle>
        <path class="scheme-node-on"
              d="M38.0437 39.2532L20 30L1.95632 39.2532C1.29087 39.5944 0.5 39.1112 0.5 38.3634V21.6366C0.5 20.8888 1.29087 20.4056 1.95632 20.7468L20 30L38.0437 20.7468C38.7091 20.4056 39.5 20.8888 39.5 21.6366V38.3634C39.5 39.1112 38.7091 39.5944 38.0437 39.2532Z"/>
        <foreignObject x="10" y="0" height="20" width="20">
            <div class="w-full h-full text-center">
                {{symbol}}
            </div>
        </foreignObject>
    </svg>
</template>

<style scoped>

</style>