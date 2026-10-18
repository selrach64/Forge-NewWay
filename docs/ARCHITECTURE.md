# Architecture recommandée — Forge

**Date :** 18 octobre 2026 · **Statut :** proposition issue de l'audit ([REPOSITORY_AUDIT.md](REPOSITORY_AUDIT.md)). Rien n'est implémenté.

---

## 1. Principes directeurs

1. **Le cœur est indépendant d'Electron et d'Unreal.** La logique (schémas, moteur de fusion, compilateur de plan, budget, cache) est du TypeScript pur, testable avec Vitest sans lancer l'application.
2. **L'IA ne produit jamais d'opérations Blueprint.** Elle produit une *spécification* (`MechanicSpec`) et choisit des *modèles d'implémentation* connus. Un compilateur déterministe transforme le plan validé en opérations, depuis une liste blanche fermée.
3. **Aucune modification sans plan approuvé.** L'approbation porte sur un empreinte (SHA-256) du plan exact : si le plan change, l'approbation tombe.
4. **Toujours une copie, toujours un retour arrière.** Le projet de test est copié ; chaque génération est un commit Git ; le retour arrière est un `git reset` vers le commit précédent, après confirmation.
5. **Faits distingués des hypothèses.** Chaque règle porte un statut (§3.2) et une source.
6. **Chaque appel IA est compté et borné.** Aucune requête ne part sans passer par la passerelle IA.
7. **Ne rien marquer « terminé » sans preuve** : une opération est `succeeded` seulement si le compilateur ou la relecture de l'éditeur le confirme.

---

## 2. Vue d'ensemble

```
┌────────────────────────── Application Electron ──────────────────────────┐
│                                                                          │
│  Processus rendu (React + TS)           Préchargement (preload)          │
│  ┌────────────────────────┐   API typée  ┌──────────────────────────┐    │
│  │ Tableau de bord        │ ───────────► │ contextBridge            │    │
│  │ Catalogue / Recherche  │ ◄─────────── │ (une fonction par canal) │    │
│  │ Comparaison / Fiches   │              └────────────┬─────────────┘    │
│  │ Dépendances / Fusion   │                           │ IPC validé (zod) │
│  │ Plan / Validation      │                           ▼                  │
│  │ Historique / Réglages  │   ┌───────────────────────────────────────┐  │
│  └────────────────────────┘   │ Processus principal (Node)            │  │
│                               │  ┌──────────┐  ┌────────────────────┐ │  │
│                               │  │ Stockage │  │ Passerelle IA      │ │  │
│                               │  │ SQLite   │  │ budget · cache ·   │──┼──┼──► API IA (Claude 5.5)
│                               │  │ + Git    │  │ compteur de tokens │ │  │
│                               │  └────┬─────┘  └────────────────────┘ │  │
│                               │       │                               │  │
│                               │  ┌────▼───────────────────────────┐   │  │
│                               │  │ Cœur métier (sans Electron)    │   │  │
│                               │  │ schémas · fusion · compilateur │   │  │
│                               │  │ de plan · vérifications        │   │  │
│                               │  └────┬───────────────────────────┘   │  │
│                               │       │                               │  │
│                               │  ┌────▼───────────────────────────┐   │  │
│                               │  │ Pont Unreal (client MCP)       │───┼──┼──► Éditeur UE 5.8 (127.0.0.1)
│                               │  │ adaptateur Epic / BlueprintMCP │   │  │
│                               │  └────────────────────────────────┘   │  │
│                               └───────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Règle de frontière :** le processus rendu ne parle **jamais** directement au MCP, au système de fichiers ni à l'API IA. Il passe uniquement par les canaux IPC déclarés dans le préchargement.

---

## 3. Modèle de données

### 3.1 Contrats versionnés

Chaque contrat est un schéma **Zod** (un seul source de vérité : validation à l'exécution + types TypeScript). Chaque document porte `schemaVersion` (ex. `"mechanic.v1"`). Une migration est écrite à chaque changement de version majeure.

Contrats principaux :

| Contrat | Contenu minimal |
|---|---|
| `Source` | `id`, `url`, `title`, `kind` (`official_doc` · `community` · `video` · `user_input` · `reverse_engineering`), `accessedAt`, `contentHash`, `notes`. **Pas de texte intégral stocké** (droits d'auteur). |
| `MechanicSpec` | Voir §3.2. |
| `Analysis` | `mechanicId`, `sourceIds[]`, `model`, `promptVersion`, `inputHash`, `result`, `tokensIn`, `tokensOut`, `costEstimate`, `createdAt`. |
| `MergePlan` | Dépendances, conflits, architecture proposée, opérations ordonnées, `planHash`. |
| `UnrealOperation` | Union discriminée sur une **liste blanche** (voir §5.3). |
| `GenerationRecord` | `planHash`, commit avant/après, résultats par opération, sorties de tests. |

### 3.2 `MechanicSpec` (v1)

Champs exigés par la mission, avec précisions :

- `id` stable (ex. `mech.endurance.core`), jamais réutilisé.
- `name`, `description`, `category` (`resource`, `movement`, `inventory`, `interaction`, `combat`…).
- `variables[]` : `name`, `type` (`float`, `int`, `bool`, `enum`…), `default`, `min`, `max`, `editable`, `category` d'éditeur.
- `functions[]` : `name`, `inputs`, `outputs`, `pure`, `description`.
- `events[]` : `name`, `payload`, `whenFired`.
- `rules[]` : formule ou description, **statut** (voir ci-dessous), `sourceIds`.
- `preconditions[]`, `failureConditions[]`.
- `dependencies[]` : `mechanicId` + nature (`reads` · `writes` · `calls` · `emits`).
- `requiredInterfaces[]`.
- `knownConflicts[]` : `mechanicId` + raison.
- `configurableParams[]` : clé, valeur par défaut, unité.
- `expectedTests[]` : description et critère.
- `implementationPatterns[]` : identifiants de modèles compatibles (ex. `component.resource_pool.v1`).

**Statut de chaque règle** (exigence de la mission) :

| Statut | Signification |
|---|---|
| `observed` | Comportement constaté dans le jeu (vidéo, test manuel). |
| `documented` | Information issue d'une source officielle ou d'une documentation citée. |
| `hypothesis` | Déduction non vérifiée. Bloquée pour génération sans validation utilisateur. |
| `design_choice` | Décision de conception de la Forge ou de l'utilisateur. |

**Niveau de confiance** : `high` · `medium` · `low`, attribué par le moteur de règles et modifiable par l'utilisateur. Toute correction utilisateur est tracée (`edited_by: user`).

### 3.3 Base SQLite

Tables proposées : `projects`, `unreal_projects` (chemin, version moteur, plugins détectés), `mechanics` (id, version, json, statut), `sources`, `analyses`, `ai_calls` (horodatage, fournisseur, modèle, tâche, tokens, coût estimé, `cache_hit`), `cache_entries` (clé = hash de tâche + modèle + version du prompt + entrée), `plans`, `generations`, `operations`, `test_runs`, `settings` (valeurs non secrètes uniquement).

Les secrets ne sont **jamais** dans SQLite (§7).

---

## 4. Moteur de fusion

Étapes, alignées sur la mission :

1. **Graphe de dépendances** : nœuds = mécaniques ; arêtes = `reads`, `writes`, `calls`, `emits`. Détection de cycles → erreur bloquante.
2. **Responsabilités communes** : regroupement par ressource possédée (ex. « ressource d'endurance », « charge »). Une même responsabilité ne doit avoir **qu'un propriétaire**.
3. **Conflits** : deux mécaniques qui écrivent la même variable avec des règles différentes ; deux formules de régénération concurrentes ; types incompatibles ; `knownConflicts` déclarés.
4. **Dépendances manquantes** : une mécanique qui lit une variable non produite par aucune autre.
5. **Architecture commune** : proposition de composants (ex. `AC_ResourcePool`, `AC_Weight`), interfaces et événements. Calcul déterministe à partir des graphes ; l'IA peut proposer un nom ou une explication, pas la structure.
6. **Plan explicite** : liste ordonnée d'opérations, chacune avec sa cible, son risque (`low`/`medium`/`high`), et `requiresApproval`.
7. **Approbation** : l'utilisateur modifie les paramètres et les règles, puis approuve le `planHash` exact.
8. **Rapport** : décisions prises, règles écartées et raisons.

**Exemple (étape 2 de la mission) :** `Inventory.TotalWeight` (écrit par l'inventaire) → `Weight.SpeedFactor` (lit le poids, écrit un facteur) → `Movement.MaxSpeed` (lit le facteur) et `Endurance.DrainMultiplier` (lit le poids). Le moteur doit détecter l'ordre, la propriété unique de `TotalWeight`, et refuser de générer si `SpeedFactor` n'a pas de borne.

---

## 5. Pont Unreal Engine

### 5.1 Une interface, deux adaptateurs

```ts
interface UnrealBridge {
  probe(): Promise<BridgeCapabilities>;            // tools/list → drapeaux
  readProject(): Promise<UnrealProjectInfo>;       // version, plugins
  execute(op: UnrealOperation): Promise<OpResult>; // une opération
  compile(target: AssetRef): Promise<CompileResult>;
  readBack(asset: AssetRef): Promise<AssetSnapshot>;
}
```

- **`EpicMcpAdapter`** — outils officiels UE 5.8 (`ModelContextProtocol` + `AllToolsets`/`EditorToolset`/`BlueprintTools`). Premier choix à évaluer.
- **`BlueprintMcpAdapter`** — BlueprintMCP (`bp_*`, jeton, patchs atomiques, `base_version`). Second choix, et référence pour le modèle transactionnel.

Le choix d'adaptateur est un réglage **par projet**. Un adaptateur ne figure dans le cœur que par son interface.

### 5.2 Découverte et capacités

1. Lire le `.uproject` : `EngineAssociation`, plugins activés. Refuser tout projet autre que 5.8.x pour le prototype.
2. Vérifier la connexion (ping) et le port en loopback.
3. `tools/list` → drapeaux (`canCreateBlueprint`, `canAddVariable`, `canConnectPins`, `canCompile`, `canSave`, `canReadBack`).
4. Une opération dont le drapeau manque est **refusée avant exécution**, avec un message « non supporté par ce serveur » — jamais contournée silencieusement.

### 5.3 Liste blanche d'opérations

Le compilateur de plan n'émet que ces types :

`CreateBlueprint(parent, path)` · `AddVariable(name, type, default, editable, category)` · `AddFunction(name, inputs, outputs)` · `ApplyTemplate(templateId, params)` · `SetDefault(asset, property, value)` · `Compile(asset)` · `Save(asset)` · `ReadBack(asset, fields)`

`ApplyTemplate` est le seul moyen de produire des nœuds. Un modèle est un **graphe paramétré, versionné, testé** (ex. `component.resource_pool.v1` : variables, `TryConsume`, `Regen` sur timer, événements `OnChanged` et `OnExhausted`). Les modèles sont écrits dans le code de la Forge, relus, et couverts par des tests (§8).

### 5.4 Chemins et nommage

- Tout ce qui est généré vit sous `/Game/Forge/<mechanicId>/` (ex. `/Game/Forge/Endurance/BP_AC_Endurance`).
- Aucune suppression d'asset sans approbation distincte et journalisée (règle de sécurité de la mission).
- Aucune écriture hors du dossier `Content/Forge/` et de la copie du projet.

---

## 6. Génération, validation, retour arrière

Pipeline pour une génération :

```
plan approuvé (planHash)
  → vérification : planHash == approuvé ? projet = copie ? dépôt Git propre ?
  → commit de référence « avant-génération »
  → exécution séquentielle des opérations (arrêt à la première erreur)
  → compilation des assets touchés
  → relecture (ReadBack) : valeurs par défaut, types, présence des fonctions
  → tests (§8.3)
  → commit « après-génération » + rapport
  → en cas d'échec : proposition de retour arrière (git reset) — exécutée seulement après confirmation
```

**État d'une opération** : `pending` → `running` → `succeeded` | `failed` | `rolled_back`. `succeeded` exige un résultat de compilation ou de relecture, pas seulement une réponse HTTP.

**Copie de travail :** le projet de test (`Projet Aria\Test`) est copié vers un dossier dédié (ex. `Projet Aria\Test_Forge`) **après votre accord**. La Forge n'écrit jamais dans l'original.

---

## 7. Sécurité

| Sujet | Mesure |
|---|---|
| Fenêtre Electron | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`, `allowRunningInsecureContent: false`. Pas de contenu distant. |
| Politique de contenu | CSP stricte : `default-src 'self'`, pas de `unsafe-eval`. |
| Navigation | Blocage de `will-navigate` et de `window.open` ; liens externes ouverts uniquement après confirmation. |
| IPC | Chaque canal a un schéma Zod pour l'entrée et la sortie ; vérification de l'origine du `webContents` émetteur. |
| Préchargement | Aucune exposition de `ipcRenderer` brut ; une fonction par canal, sans transmettre l'objet événement. |
| Clés API | Stockées chiffrées par `safeStorage` d'Electron, ou lues depuis des variables d'environnement. Jamais dans le code de l'interface, jamais dans SQLite, jamais dans les journaux. `.env` dans `.gitignore`. |
| Serveur Unreal | Refus de toute adresse hors `127.0.0.1` / `::1` / `localhost`. Jeton BlueprintMCP stocké comme une clé API. |
| Code généré | Aucune exécution de code généré par l'IA. Les modèles sont du code relu. |
| Opérations destructrices | Suppression, écrasement ou retour arrière : confirmation explicite, journal. |
| Simulation | Mode « aperçu » : le plan est compilé et affiché sans appel au pont Unreal. |

---

## 8. Stratégie de tests

### 8.1 Application (Vitest)

- Schémas : jeux valides et invalides, migration de version.
- Moteur de fusion : graphes avec cycle, conflit, dépendance manquante, propriété unique.
- Compilateur de plan : déterminisme (même entrée → même `planHash`), refus d'une opération hors liste blanche.
- Passerelle IA : budget dépassé → refus ; cache → aucun appel ; compteur cohérent.
- Garde de chemin : refus de toute écriture hors dossier autorisé.
- Pont Unreal : **serveur MCP factice** qui rejoue des réponses enregistrées (pas de dépendance à l'éditeur pour les tests).

### 8.2 Intégration Unreal (manuelle au départ, automatisable ensuite)

- Connexion et découverte de capacités sur le projet de test.
- Génération de l'endurance et vérification par relecture : variables présentes, valeurs `100 / 25 / 15 / 1.0`, fonctions présentes, compilation sans erreur.

### 8.3 Comportement en jeu

**Honnêteté sur le niveau de preuve :** les tests statiques (compilation, relecture) sont automatiques. Le comportement en jeu (épuisement, délai de régénération, refus d'esquive) demande soit une session PIE pilotée, soit une liste de contrôle manuelle. **Cette capacité doit être validée en spike** (voir IMPLEMENTATION_PLAN, phase 3). Tant qu'elle ne l'est pas, le rapport indique « non testé en jeu ».

---

## 9. Passerelle IA

### 9.1 Interface fournisseur

`complete({ task, model, system, input, maxInputTokens, maxOutputTokens, promptVersion })` → `{ text, tokensIn, tokensOut, costEstimate, cacheHit }`.

Un seul fournisseur au départ (API Anthropic, via `@anthropic-ai/sdk`). Un second fournisseur ne s'ajoute que si un besoin réel apparaît.

### 9.2 Routage par tâche

| Tâche | Modèle par défaut | Justification |
|---|---|---|
| Classification de texte court, tri de sources | `claude-haiku-5-5` | Tâche simple, faible coût. |
| Extraction de règles à partir d'une source | `claude-sonnet-5-5` | Bon compromis qualité / coût. |
| Rédaction de `MechanicSpec` | `claude-sonnet-5-5` | Structuré, relu ensuite par l'utilisateur. |
| Résolution de conflits complexes (plusieurs mécaniques) | `claude-opus-5-5` | Seulement si le moteur déterministe signale un conflit non résolu. |

Le modèle est un réglage modifiable, avec des valeurs par défaut prudentes.

### 9.3 Budget et cache

- **Plafond** configurable (par jour et par mois, en devise choisie) ; à 80 %, avertissement ; à 100 %, refus.
- **Compteur** de tokens et de coût estimé, historique dans `ai_calls`.
- **Estimation avant envoi** : la Forge affiche le nombre estimé de tokens et le coût maximal avant tout appel de tâche lourde.
- **Cache** : clé = SHA-256(tâche + modèle + `promptVersion` + entrée normalisée). Une analyse déjà faite n'est jamais refaite.
- **Recherche web coûteuse** : uniquement si le catalogue local n'a pas de réponse source-liée.
- **Envoi minimal** : seules les sections utiles (extraits, notes) partent à l'IA, jamais le contenu complet d'un projet Unreal.

---

## 10. Interface

Pages (ordre de la mission) : tableau de bord · projets UE · recherche · catalogue · comparaison · éditeur de fiche · dépendances et conflits · plan de fusion · validation · historique et tests · réglages (IA, MCP, budget).

- Français par défaut, textes dans `src/renderer/i18n/fr.json`, appels par clé (`t('endurance.title')`). Ajouter l'anglais ensuite ne demande aucune modification des composants.
- Données fictives : fichiers `src/renderer/fixtures/` **explicitement marqués** « DONNÉES DE DÉMONSTRATION » dans l'interface tant que la donnée n'est pas réelle.
- Composants : Tailwind CSS 4. Une bibliothèque de composants (shadcn/ui) reste optionnelle ; décision à prendre à la phase 2, pas avant.

---

## 11. Structure du dépôt

Un seul paquet au départ (simplicité) ; découpage en paquets seulement si une frontière devient réelle.

```
forge/
├─ docs/                      # ce dossier
├─ src/
│  ├─ core/                   # TypeScript pur, sans Electron ni Unreal
│  │  ├─ schemas/             # Zod : Source, MechanicSpec, MergePlan, UnrealOperation…
│  │  ├─ merge/               # graphe, conflits, architecture proposée
│  │  ├─ plan/                # compilateur de plan, planHash
│  │  └─ templates/           # modèles d'implémentation versionnés
│  ├─ main/                   # processus principal Electron
│  │  ├─ ipc/                 # canaux validés
│  │  ├─ storage/             # SQLite, migrations
│  │  ├─ ai/                  # passerelle, budget, cache
│  │  ├─ unreal/              # pont, adaptateurs Epic et BlueprintMCP
│  │  └─ git/                 # commits, retours arrière
│  ├─ preload/                # API exposée au rendu
│  └─ renderer/               # React
│     ├─ pages/ components/ i18n/ fixtures/
├─ tests/                     # Vitest (miroir de src/)
├─ electron.vite.config.ts
├─ package.json
└─ .gitignore                 # inclut .env, dist/, out/, node_modules/
```

---

## 12. Versions et outils

Voir [REPOSITORY_AUDIT.md §5](REPOSITORY_AUDIT.md) pour le tableau complet. Pour la base :

- Scaffold : `npm create @quick-start/electron` (électron-vite), choix TypeScript et React.
- Les versions sont épinglées dans `package-lock.json` au moment de l'installation ; les mises à jour sont des commits séparés.
- Toutes les dépendances doivent être MIT ou compatibles ; vérification avec `npm ls --all` et un script de licences (phase 1).
