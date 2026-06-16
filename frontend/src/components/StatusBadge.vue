<template>
  <span class="status-badge" :class="store.online ? 'on' : 'off'" :title="store.online ? 'API joignable' : 'API injoignable — vérifiez le serveur/réseau'">
    <span class="status-dot"></span>{{ store.online ? 'En ligne' : 'Hors ligne' }}
  </span>
</template>

<script setup>
import { store } from '../store.js'
</script>

<style scoped>
.status-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700;
  padding: 3px 10px; border-radius: 99px; white-space: nowrap; }
.status-badge.on  { background: #dcfce7; color: #15803d; }
.status-badge.off { background: #fee2e2; color: #b91c1c; }
.status-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.status-badge.on .status-dot { animation: pulse 2s infinite; }
@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: .35 } }
</style>
