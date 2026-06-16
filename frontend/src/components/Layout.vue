<template>
  <div class="app-layout" :class="{ 'dark-mode': store.darkMode }">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sb-logo">
        <h2>INDUS</h2>
        <span>Ingénierie Industrielle</span>
      </div>

      <div v-if="user" class="sb-user">
        <div class="avatar" :style="{ background: avatarColor(user.id) }">{{ initials(user.nom_affiche) }}</div>
        <div class="sb-user-info">
          <div class="sb-user-name">{{ user.nom_affiche }}</div>
          <div class="sb-user-role">{{ roleLabel(user.role) }}</div>
        </div>
      </div>

      <nav class="sb-nav">
        <RouterLink class="nav-item" to="/mes-demandes"><span>📋</span><span class="nav-label">Mes Demandes</span></RouterLink>
        <RouterLink class="nav-item" to="/nouvelle"><span>➕</span><span class="nav-label">Nouvelle Demande</span></RouterLink>
        <RouterLink class="nav-item" to="/recherche"><span>🔍</span><span class="nav-label">Recherche</span></RouterLink>

        <template v-if="user && user.role >= 1">
          <RouterLink class="nav-item" to="/mes-taches"><span>🔧</span><span class="nav-label">Mes Tâches</span></RouterLink>
          <RouterLink class="nav-item" to="/mon-dashboard"><span>📊</span><span class="nav-label">Mon Dashboard</span></RouterLink>
        </template>

        <template v-if="user && user.role >= 2">
          <div class="sb-divider"></div>
          <RouterLink class="nav-item" to="/validation">
            <span>✅</span><span class="nav-label">Validation</span>
            <span v-if="store.badges.validation > 0" class="nav-badge">{{ store.badges.validation }}</span>
          </RouterLink>
          <RouterLink class="nav-item" to="/plan-de-charge"><span>📈</span><span class="nav-label">Plan de Charge</span></RouterLink>
          <RouterLink class="nav-item" to="/toutes"><span>📁</span><span class="nav-label">Toutes les Demandes</span></RouterLink>
          <RouterLink class="nav-item" to="/dashboard"><span>📊</span><span class="nav-label">Dashboard</span></RouterLink>
          <RouterLink class="nav-item" to="/analyses"><span>📈</span><span class="nav-label">Analyses</span></RouterLink>
        </template>

        <template v-if="user && user.role >= 3">
          <div class="sb-divider"></div>
          <RouterLink class="nav-item" to="/administration"><span>⚙️</span><span class="nav-label">Administration</span></RouterLink>
          <RouterLink class="nav-item" to="/parametres"><span>🔧</span><span class="nav-label">Paramètres</span></RouterLink>
        </template>

        <div class="sb-divider"></div>
        <RouterLink class="nav-item" to="/support"><span>🆘</span><span class="nav-label">Support</span></RouterLink>
      </nav>

      <div class="sb-status"><StatusBadge /></div>

      <div class="sb-footer">
        <span class="sb-version">v1.0 web</span>
        <button class="btn btn-ghost btn-sm" @click="toggleDark">{{ store.darkMode ? '☀️' : '🌙' }}</button>
        <button class="btn btn-ghost btn-sm" @click="logout" title="Déconnexion">⏻</button>
      </div>
    </aside>

    <div class="main-area">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { store, toggleDark, roleLabel, avatarColor, initials } from '../store.js'
import { api } from '../api.js'
import StatusBadge from './StatusBadge.vue'

const router = useRouter()
const user = computed(() => store.user)

function logout() { store.logout(); router.push('/login') }

onMounted(async () => {
  const [fam, cat] = await Promise.all([api.familles(), api.categories()])
  if (fam.ok) store.familles = fam.data
  if (cat.ok) store.categories = cat.data
  if (user.value && user.value.role >= 2) {
    const b = await api.badgeValid()
    if (b.ok) store.badges.validation = b.data
  }
})
</script>

<style scoped>
.sb-divider { height: 1px; background: var(--sb-border); margin: 6px 12px; }
.sb-status { padding: 8px 14px; }
.sb-footer { display: flex; align-items: center; gap: 8px; }
.router-link-active.nav-item { background: var(--sb-active-bg); color: var(--sb-active); }
</style>
