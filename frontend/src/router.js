import { createRouter, createWebHashHistory } from 'vue-router'
import { store } from './store.js'

import Layout from './components/Layout.vue'
import Login from './views/Login.vue'
import MesDemandes from './views/MesDemandes.vue'
import NouvelleDemande from './views/NouvelleDemande.vue'
import MesTaches from './views/MesTaches.vue'
import Recherche from './views/Recherche.vue'
import Validation from './views/Validation.vue'
import PlanDeCharge from './views/PlanDeCharge.vue'
import Dashboard from './views/Dashboard.vue'
import Administration from './views/Administration.vue'

const routes = [
  { path: '/login', component: Login, meta: { public: true } },
  {
    path: '/',
    component: Layout,
    children: [
      { path: '', redirect: '/mes-demandes' },
      { path: 'mes-demandes',   component: MesDemandes },
      { path: 'nouvelle',       component: NouvelleDemande },
      { path: 'mes-taches',     component: MesTaches,     meta: { role: 1 } },
      { path: 'recherche',      component: Recherche },
      { path: 'validation',     component: Validation,    meta: { role: 2 } },
      { path: 'plan-de-charge', component: PlanDeCharge,  meta: { role: 2 } },
      { path: 'dashboard',      component: Dashboard,     meta: { role: 2 } },
      { path: 'administration', component: Administration, meta: { role: 3 } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to) => {
  if (to.meta.public) {
    if (store.token) return '/'
    return true
  }
  if (!store.token) return '/login'
  if (to.meta.role && store.user && store.user.role < to.meta.role) return '/mes-demandes'
  return true
})
