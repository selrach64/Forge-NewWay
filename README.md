# Forge

Application de bureau (Electron, React, TypeScript) pour analyser des mécaniques de jeu et générer des systèmes Unreal Engine 5.

Documentation de conception : [docs/](docs/) (audit, architecture, plan, licences, questions ouvertes, rapport du spike Unreal).

## Commandes

```bash
npm install          # dépendances + rebuild de better-sqlite3 pour Electron
npm run dev          # lance l'application en développement
npm test             # tests unitaires (Vitest)
npm run typecheck    # vérification TypeScript
npm run lint         # ESLint + Prettier
npm run licenses     # liste les licences des dépendances
```

Diagnostic SQLite dans Electron : `FORGE_SELFTEST=1 npx electron .` (affiche `OK sqlite`).

## Sécurité

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`.
- Le rendu n'accède qu'à `window.forge`, exposée par le préchargement. `ipcRenderer` n'est jamais exposé.
- Navigation et fenêtres enfants bloquées ; CSP stricte dans `src/renderer/index.html`.
- Aucune clé API dans le code. `.env` est ignoré par Git.
