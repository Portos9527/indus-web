// Configuration PM2 pour INDUS web.
// Un seul process : le backend Express sert l'API ET le frontend (frontend/dist).
//
//   cd "indus web"
//   pm2 start ecosystem.config.cjs
//   pm2 save                 # persiste au reboot (avec pm2 startup)
//   pm2 logs indus-web       # voir les logs
//   pm2 restart indus-web    # après un git pull
//
module.exports = {
  apps: [
    {
      name: 'indus-web',
      cwd: './backend',
      script: 'src/server.js',
      // .env du dossier backend chargé par dotenv dans le code
      env: {
        NODE_ENV: 'production',
        // PORT: 3001,          // surchargé par backend/.env si présent
        // SERVE_FRONTEND: '1', // mettre '0' si un reverse proxy sert le dist
      },
      autorestart: true,
      max_restarts: 10,
      watch: false,
    },
  ],
}
