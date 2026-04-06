<template>
  <div class="core-component">
    <h2>Graphical Editor Core Component</h2>
    <button type="button" @click="onClick">
      {{ label }}
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  label?: string;
}>();

const emit = defineEmits<{
  (e: "click"): void;
}>();

const onClick = () => {
  emit("click");
};
</script>

<style scoped>
.core-component {
  display: inline-flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid #d0d7de;
  background: #f6f8fa;
}

.core-component h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.core-component button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  border: none;
  background: #2563eb;
  color: white;
  font-weight: 500;
  cursor: pointer;
}

.core-component button:hover {
  background: #1d4ed8;
}
</style>
