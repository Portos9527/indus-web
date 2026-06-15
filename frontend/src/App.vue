<template>
  <router-view />
  <!-- Toasts globaux -->
  <div class="toast-container">
    <div v-for="t in store.toasts" :key="t.id" :class="['toast', 'toast-' + t.type]">
      {{ t.message }}
    </div>
  </div>
</template>

<script setup>
import { store } from './store.js'
</script>

<style>
.toast-container { position: fixed; bottom: 20px; right: 20px; z-index: 99999; display: flex; flex-direction: column; gap: 8px; }
.toast { padding: 12px 18px; border-radius: 10px; color: #fff; font-size: 13px; font-weight: 600; box-shadow: 0 8px 24px rgba(0,0,0,.2); animation: toast-in .2s ease; }
.toast-success { background: #16a34a; }
.toast-error   { background: #dc2626; }
.toast-info    { background: #2563eb; }
@keyframes toast-in { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: none; } }
</style>
