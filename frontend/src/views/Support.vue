<template>
  <div class="page-header"><h1>🆘 Support & Aide</h1></div>
  <div class="page-content">
    <div class="stats-grid">
      <div class="card" style="padding:20px;border-left:4px solid #10b981">
        <div style="font-size:11px;color:var(--text-3);font-weight:700;text-transform:uppercase">Téléphone interne</div>
        <div style="font-size:24px;font-weight:800;margin:4px 0">1309</div>
        <div style="font-size:12px;color:var(--text-3)">Poste direct — horaires ouvrés</div>
      </div>
      <div class="card" style="padding:20px;border-left:4px solid #3b82f6">
        <div style="font-size:11px;color:var(--text-3);font-weight:700;text-transform:uppercase">Email</div>
        <div style="font-size:18px;font-weight:800;margin:4px 0">nicolas.chaudet@solcera.com</div>
        <div style="font-size:12px;color:var(--text-3)">Réponse sous 24h ouvrées</div>
      </div>
    </div>

    <div class="card" style="margin-top:20px">
      <div class="card-header"><h3>Questions fréquentes</h3></div>
      <div style="padding:4px 0">
        <div v-for="(f,i) in faqs" :key="i" style="border-bottom:1px solid var(--border)">
          <button class="faq-q" @click="f.open=!f.open">
            <span>{{ f.q }}</span><span :style="{transform:f.open?'rotate(90deg)':'none',transition:'.2s'}">›</span>
          </button>
          <div v-if="f.open" style="padding:0 16px 14px;font-size:13px;color:var(--text-2);line-height:1.6">{{ f.a }}</div>
        </div>
      </div>
    </div>
    <div style="text-align:center;color:var(--text-3);font-size:12px;margin-top:16px">INDUS Web v1.0 · Solcera — Ingénierie Industrielle</div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
const faqs = reactive([
  { open:false, q:'Comment créer une demande ?', a:'Menu "Nouvelle Demande", remplissez le formulaire et soumettez. Elle part en validation.' },
  { open:false, q:'Comment suivre ma demande ?', a:'Menu "Mes Demandes" : le statut est affiché en couleur. Cliquez pour le détail.' },
  { open:false, q:'Je n\'arrive pas à me connecter', a:'Vérifiez identifiant/mot de passe. En cas d\'oubli, contactez l\'administrateur (1309) qui peut réinitialiser votre mot de passe.' },
  { open:false, q:'Comment ajouter une pièce jointe ?', a:'Ouvrez la demande → section "Pièces jointes" → "Ajouter un fichier". Les fichiers sont stockés sur le serveur.' },
  { open:false, q:'Qu\'est-ce que le temps masqué ?', a:'Une période où vous attendez un devis/des infos et ne pouvez pas avancer. Déclarez-la dans la demande : le responsable la voit sur le plan de charge.' },
])
</script>
<style scoped>
.faq-q { width:100%; display:flex; align-items:center; justify-content:space-between; gap:10px; padding:13px 16px; background:none; border:none; font-size:13px; font-weight:600; color:var(--text-1); text-align:left; cursor:pointer; }
.faq-q:hover { background:var(--bg-2,#f8fafc); }
</style>
