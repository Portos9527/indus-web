# INDUS — Version Web

Application web de gestion des demandes d'ingénierie. Architecture découplée :

- **`backend/`** — API REST Node.js (Express) connectée à PostgreSQL, authentification JWT + bcrypt.
- **`frontend/`** — SPA Vue 3 (Vite), même design que la version desktop.

## Différences avec la version desktop
- **Authentification par login / mot de passe** (et non session Windows) → adapté au web.
- **Le rôle est résolu côté serveur** depuis le JWT/la base (jamais fourni par le client) → sécurité renforcée.
- Pas de mode démo : connexion réelle à PostgreSQL requise.
- Mêmes fonctionnalités : demandes, validation, plan de charge, congés, temps masqué, dashboard, administration.

## Démarrage rapide

### 1. Base de données
PostgreSQL 14+ avec une base `indus_db` et un compte applicatif (voir le guide
`INDUS_Installation_PostgreSQL.pdf`). Les tables sont créées automatiquement au
premier démarrage du backend.

### 2. Backend
```bash
cd backend
cp .env.example .env        # puis éditez DATABASE_URL, JWT_SECRET…
npm install
npm start                   # API sur http://localhost:3001
```
Au premier lancement, un compte admin est créé (login/mot de passe définis dans `.env`,
par défaut `admin` / `admin` — **à changer immédiatement**).

### 3. Frontend
```bash
cd frontend
npm install
npm run dev                 # interface sur http://localhost:5173
```
En dev, Vite proxy `/api` vers le backend. Connectez-vous avec le compte admin.

### 4. Mise en production
- Backend : `npm start` derrière un reverse-proxy (nginx) ou un service (pm2, systemd).
- Frontend : `npm run build` → dossier `dist/` à servir en statique (nginx) ; faites
  pointer `/api` du reverse-proxy vers le backend.

## Rôles
0 = Demandeur · 1 = Technicien · 2 = Responsable · 3 = Admin
