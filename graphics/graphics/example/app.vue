<script setup>
import ChartsPanel from "~/components/ChartsPanel.vue";
</script>

<template>
  <div style="height: 100vh; width: 100vw; background: #0f172a; position: relative; overflow: hidden;">
    <ChartsPanel />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  width: 100%;
  background-color: #0f172a;
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

#__nuxt {
  height: 100vh;
  width: 100vw;
}
</style>
