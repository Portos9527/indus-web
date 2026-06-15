<template>
  <div class="pb-track" :title="value + '%'">
    <div class="pb-fill" :style="{ width: (value || 0) + '%' }"></div>
    <span class="pb-label">{{ value || 0 }}%</span>
  </div>
</template>

<script setup>
defineProps({ value: Number })
</script>

<style scoped>
.pb-track { position: relative; height: 18px; background: var(--bg-2, #f1f5f9); border-radius: 99px; overflow: hidden; min-width: 80px; }
.pb-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #60a5fa); border-radius: 99px; transition: width .3s; }
.pb-label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: var(--text-1); }
</style>
