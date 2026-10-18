# Audit des dépôts — Forge

**Date de l'audit :** 18 octobre 2026
**Périmètre :** dépôts listés dans la mission, plus une découverte locale importante (outils MCP officiels d'Unreal Engine 5.8 déjà installés sur cette machine).
**Statut :** audit documentaire et inspection du code source. **Aucune compilation UE, aucun lancement de MCP, aucune exécution de code tiers n'a été effectuée.** Les points « à valider en spike » sont marqués comme tels.

---

## 1. Méthode et limites

- Lecture des README, fichiers de licence, `.uplugin`/`.uproject`, `package.json`, configurations de sécurité Electron et arborescences via l'API GitHub, `raw.githubusercontent.com` et des clones superficiels (`--depth 1`) placés dans le dossier scratchpad de la session (hors du projet).
- Métadonnées (dates, étoiles, licence SPDX, dépôt fork ou non) : API GitHub, consultée le 18/10/2026.
- Versions npm et licences : registre npm, consulté le 18/10/2026.
- Documentation Epic : page `dev.epicgames.com` *Unreal MCP in Unreal Editor* (récupérée par outil de lecture web, donc résumée, non citée mot à mot sauf guillemets).
- Environnement : Windows 10 Pro, Node 24.12.0, npm 11.6.2, Git 2.49.0, Python 3.12.10. **GitHub CLI (`gh`) absent.**
- **Limite :** `InventoryPluginUE5` n'a pas pu être cloné correctement (index Git vide). Son code a été récupéré fichier par fichier via l'API.

---

## 2. Environnement de développement local (vérifié)

| Élément | Constat | Conséquence |
|---|---|---|
| Unreal Engine | **5.8.3** installé dans `E:\Epic Games\UE_5.8` (`Engine/Build/Build.version`). UE 5.6 et 5.7 aussi installés sur `E:`. | Le moteur cible est disponible. |
| Projet de test | `C:\Users\selra\Documents\Projet Aria\Test\Test.uproject` : `EngineAssociation` 5.8, **sans dossier `Source`** (projet Blueprint seul). Plugins déjà activés : `ModelContextProtocol`, `AllToolsets`, `EditorToolset`, `GASToolsets`, `ModelingToolsEditorMode`, `NiagaraToolsets`, `PhysicsToolsets`. | Candidat naturel pour le « projet de test » de la mission. Aucune modification faite pour l'instant. |
| Autres projets | `Fayel`, `MetaHumans`, `MarioRemake`, `New_era` : UE **5.7**. | **Incompatibles** avec les outils MCP 5.8 sans migration. Ne pas les utiliser comme cibles. |
| Compilateur C++ | Visual Studio 2022 BuildTools, MSVC 14.44.35207. | Suffisant pour une future compilation C++ si elle devient nécessaire. Non requis pour le prototype Blueprint. |
| Outils Node | Node 24.12.0, npm 11.6.2 | Compatible avec les versions récentes d'Electron et de Vite. |

---

## 3. Résumé des décisions

| # | Projet / composant | Décision | Motif principal |
|---|---|---|---|
| 0 | **Unreal MCP officiel Epic (UE 5.8, plugin `ModelContextProtocol` + `AllToolsets` + `EditorToolset`)** — non listé dans la mission, découvert pendant l'audit | **Réutiliser** (outil externe, sans copie de code) — à valider en spike | Déjà installé, déjà activé dans le projet de test, inclut un `BlueprintTools` (53 opérations Blueprint). Mais expérimental et **sans authentification**. |
| A | **BlueprintMCP** | **Réutiliser sous conditions** (plugin tel quel dans une copie du projet de test, version épinglée) — fallback / comparaison | MIT, UE 5.8 ciblé, patchs atomiques avec annulation et verrou de version. Mais projet très jeune (23 août 2026), 2 étoiles, beta 0.6.0, un seul auteur. |
| B | **REA** | **Adapter** — outil optionnel, processus externe, hors cœur de la Forge | MIT, bien documenté. Pertinent surtout pour le JavaScript/Electron, .NET et les binaires natifs. Analyse de jeux commerciaux : **risques juridiques et techniques** (voir §4.B). |
| C | **MCP Desk** | **S'inspirer** (idées seulement, aucun code copié) | Pas de licence. Clé API stockée en `localStorage`. `sandbox: false`. Dépendance `easy-mcp-use` non publiée depuis mai 2025. Pas de tests. |
| D | **Template Electron BRVWL** | **Écarter** comme base | Pas de fichier LICENSE (licence MIT déclarée dans `package.json` seulement). TypeScript `~4.5.4`, Electron 35, Electron Forge, pas de tests, build committé. |
| E1 | **GameplayFramework** (AyaDogGames, Apache-2.0) | **S'inspirer** | Très bonne référence pour une architecture GAS data-driven. Trop lourd comme dépendance (PCG, CommonUI, MVVM…). Pas de système de poids ni d'endurance. |
| E2 | **InventoryPluginUE5** (alessandrobelli, MIT) | **S'inspirer** | Modèle fragment + grille utile. **Le README annonce un système de poids qui n'existe pas dans le code.** Binaires `.dll`/`.exe` committés. Aucun test. |
| E3 | **UE5Inventory** (Synock, MIT) | **S'inspirer** (poids, encombrement, tests) | Le plus mature (227 fichiers source, tests d'automatisation, docs). Mais c'est un **système complet** (banque, marchands, commerce, réparation…) : contraire au principe modulaire de la mission. |
| E4 | **Lyra** (copie `johnlogostini/Lyra`) | **S'inspirer** (architecture uniquement) | Licence « UE-Only Content ». Projet de 2023 (UE 5.3). Copie tierce, pas le dépôt officiel Epic. |

**Ce qui est réutilisable directement** : BlueprintMCP et/ou le MCP officiel Epic (côté Unreal), la pile technique moderne (électron-vite, React, TypeScript, Zod, Vitest, SDK MCP officiel).
**Ce qui ne doit pas être réutilisé tel quel** : les bases Electron tierces, les plugins d'inventaire complets, l'analyse de binaires de jeux commerciaux.

---

## 4. Fiches détaillées

### 4.0 Unreal MCP officiel Epic (découverte locale, UE 5.8)

**Sources :** fichiers installés localement (`E:\Epic Games\UE_5.8\Engine\Plugins\Experimental\ModelContextProtocol`, `...\Toolsets\AllToolsets`, `...\Toolsets\EditorToolset`, `...\Toolsets\GASToolsets`) et page officielle `dev.epicgames.com/documentation/en-us/unreal-engine/unreal-mcp-in-unreal-editor`.

**Ce qui est vérifié :**
- Le plugin s'appelle « Unreal MCP » (identifiant `ModelContextProtocol`), **désactivé par défaut** (`EnabledByDefault: false`), dans le dossier `Experimental`.
- Le serveur tourne dans l'éditeur. Endpoint par défaut : `http://127.0.0.1:8000/mcp`. Transport : **HTTP et Server-Sent Events uniquement**.
- Liaison **loopback** par défaut. La doc indique : « There is no authentication layer » et « not designed for remote use ». Le serveur rejette les en-têtes `Origin` non locaux.
- Les toolsets s'activent via le plugin **AllToolsets** (le plugin Unreal MCP ne fournit pas les outils par lui-même).
- Statut : **Experimental** ; la doc avertit d'être prudent avant toute livraison et que « APIs and data formats are subject to change at any time ».
- Le module `EditorToolset` contient un `BlueprintTools` (Python) avec **53 opérations exposées** : création de Blueprint, `compile_blueprint`, `add_variable`, `add_function_graph`, `add_event`, `add_function_param`, `create_node`, `connect_pins`, `set_pin_value`, `delete_node`, `arrange_nodes` (mise en page), `find_nodes`, `get_connected_subgraph`, `read_graph_dsl`/`write_graph_dsl` (un DSL S-expression qui se transpile en nœuds), `set_variable_replication`, `add_event_dispatcher`, etc.
- `GASToolsets` (`AttributeSetToolset`, `AbilitySystemInspectorToolset`) existe ; la doc Epic indique qu'il est **désactivé par défaut**.
- Le projet `Projet Aria\Test` a déjà ces plugins activés.

**Ce qui n'est PAS vérifié :**
- Je n'ai pas lancé l'éditeur ni appelé ces outils. Les opérations Blueprint sont relevées dans le **code source Python**, pas dans la documentation publique (la page Epic ne liste que SceneTools, ActorTools, MaterialInstanceTools, ObjectTools).
- Aucune opération de **sauvegarde d'asset** n'a été identifiée dans `BlueprintTools` ; elle existe peut-être ailleurs.
- Les tests unitaires de l'équipe Epic (`*Tests`) n'ont pas été exécutés.

**Risques :**
- Pas d'authentification : tout processus local peut appeler le serveur tant que l'éditeur tourne. Acceptable sur un poste personnel, à noter pour la Forge.
- Les API peuvent changer à chaque version (5.8.x → 5.9).

**Décision :** candidat **prioritaire** pour le pont Unreal, car officiel, déjà installé et déjà activé dans le projet de test. Il faut le valider par un spike (voir IMPLEMENTATION_PLAN, phase 3). La Forge doit garder sa propre couche de validation et d'approbation, car Epic ne fournit ni transaction atomique ni verrou de version.

### 4.A BlueprintMCP — https://github.com/LGC363/BlueprintMCP

| Critère | Constat |
|---|---|
| Licence | **MIT**, « Copyright (c) 2026 BlueprintMCP Contributors ». Réutilisation libre avec conservation de la notice. |
| Création / dernière activité | Créé le 23/08/2026, dernier push le 23/08/2026. |
| Popularité | 2 étoiles, 0 fork, 0 issue ouverte. |
| Maturité | Version `0.6.0` (« unreleased »), `IsBetaVersion: true`. Phases 0 à 3 terminées, phase 4 « en cours » (CHANGELOG). |
| Moteur | **Unreal Engine 5.8** (README). Pour une autre version : adaptation manuelle (ex. `ImportText` → `ImportText_Direct` en 5.8). Votre UE est **5.8.3** : compatibilité probable, **non vérifiée par compilation**. |
| Prérequis | Plugin éditeur C++ sans dépendance tierce (`BlueprintMCP.Build.cs` : UnrealEd, Kismet, BlueprintGraph, Slate, Sockets…). Compilation via l'éditeur ou UBT. |
| Serveur MCP | HTTP sur `127.0.0.1:30016/mcp` (port par défaut selon le script de test). Authentification par jeton : en-tête `X-BlueprintMCP-Token`, jeton généré dans `Saved/BlueprintMCP/token`. |
| Protocole | Déclare `2025-03-26`. Méthodes implémentées : `initialize`, `notifications/initialized`, `ping`, `tools/list`, `tools/call`. **Pas de `resources` ni de `prompts`.** |
| Outils | **23 outils** `bp_*` : lecture (graphes, nœuds, catalogue d'actions, recherche, références, propriétés, types), écriture (`bp_add_node`, `bp_connect`, `bp_disconnect`, `bp_delete_node`, `bp_set_pin_default`), `bp_apply_patch` / `bp_check_patch` (DSL de patch), création (`bp_create_blueprint`), `bp_compile`, `bp_save`, `bp_set_default_property`, `bp_open`, `bp_get_status`. |
| Opérations de structure | Via `bp_apply_patch` : `add_variable`, `add_function`, `add_component`, `add_interface`, `remove_member`, `rename`. |
| Garanties | Un patch = une transaction annulable (`FScopedTransaction`). Échec → rollback et version inchangée (`failed_op`, `rolled_back`). Verrou optimiste (`base_version`, erreur `BP_STALE_VERSION`). Modes Plan / Ask / Auto dans le panneau. Lectures incrémentales (`since=`). |
| Limites connues | Routage automatique des câbles (`GraphRouter`) porté mais **non appelé** par le chemin de patch. Détection des modifications humaines « coarse » (empreinte de la pile d'annulation). |
| Tests | **Aucun test d'automatisation Unreal.** Un script bash `scripts/smoke_test.sh` appelle un éditeur en cours d'exécution. Les « dogfood » (T3) sont décrits par l'auteur, non reproductibles par tiers. |
| Documentation | README, `ClientIntegration.md`, `CHANGELOG.md`, docs de conception en `docs/`. Bilingue (EN/ZH). |

**Ce qui convient à la Forge :** la conception « une intention = une transaction = une unité de revue », le verrou de version et la validation à blanc (`bp_check_patch`) correspondent exactement aux exigences de la mission (approbation, retour arrière, « ne pas laisser l'IA produire des opérations arbitraires »).

**Décision :** réutilisable **en tant que serveur externe**, plugin installé dans une **copie** du projet de test, version épinglée au commit audité. Pas de copie de code dans la Forge. Second candidat après le MCP Epic.

### 4.B REA — Reverse Engineer Anything — https://github.com/morluto/rea

| Critère | Constat |
|---|---|
| Licence | **MIT** (SPDX via l'API GitHub et badge du README). |
| Activité | Créé le 14/04/2026, dernier push le 18/10/2026. |
| Popularité | Très élevée (318 k étoiles) pour un dépôt de six mois. **Je n'en tire aucune conclusion sur la qualité.** |
| Prérequis | Node.js 22.19+, 24.11+ ou 26+ ; npm. Paquet publié : `rea-agents` (`npx rea-agents setup`). |
| Moteurs d'analyse natifs | Hopper, Ghidra ou IDA. **Non fournis** : à installer et licencier séparément. |
| Cibles analysables (README) | Binaires natifs (pseudo-code, assembleur, symboles, références) ; JavaScript/Electron (modules, imports, IPC) ; .NET (métadonnées, CIL) ; sites web (observation navigateur) ; APK Android ; firmwares ; captures réseau ; bytecode EVM ; SQLite, etc. |
| Ce que REA restitue réellement | Des faits techniques (instructions, appels, modules, imports), avec « Evidence » et limites. Il ne produit pas de spécification de gameplay : c'est à l'agent de le déduire. |
| Confidentialité | Analyse **locale**. Les résultats d'outils sont envoyés au fournisseur de modèle de votre agent, selon sa politique (FAQ de REA). |
| Plateformes | Linux nécessite un `ps` compatible procps pour certaines fonctions. |

**Points critiques pour votre cas :**
1. **Jeux commerciaux.** Zelda: Breath of the Wild est sur Switch ; REA ne liste pas le format Switch. Death Stranding (PC) pourrait être visé par des binaires natifs, mais l'extraction de logique depuis un exécutable commercial **peut violer les conditions d'utilisation et le droit local**, même si la mission ne demande pas de copier le code.
2. **Effort et licences tierces** (Hopper, Ghidra, IDA) avant même le premier résultat.
3. **Valeur réelle pour la Forge :** modeste pour l'objectif (fiches de mécaniques). Plus utile si vous voulez analyser vos propres prototypes JS/Electron ou des captures réseau.

**Décision :** **Adapter** — intégration **optionnelle** comme serveur MCP externe, désactivée par défaut, sans dépendance à l'installation de la Forge. **Aucune analyse de binaire de jeu commercial sans votre accord écrit et une vérification de la licence du jeu.** Les fiches de mécaniques sont construites d'abord à partir de sources publiques et de vos descriptions.

### 4.C MCP Desk — https://github.com/debsouryadatta/mcp-desk

| Critère | Constat |
|---|---|
| Licence | **Aucune** : pas de fichier LICENSE, GitHub indique `null`. Droits réservés par défaut : **aucune réutilisation de code autorisée.** |
| Activité | Créé le 21/04/2025, dernier push le 12/05/2025. **Plus de 17 mois sans activité.** |
| Stack | Electron **35.1.5**, React 19, Tailwind 3 (scaffold généré avec bolt.new selon `STEPS.md`), `easy-mcp-use` 0.1.x, `@langchain/openai`, OpenRouter. |
| Sécurité Electron | `contextIsolation` implicitement actif (le preload vérifie `process.contextIsolated`). **`sandbox: false`**. `webSecurity: true`. Pas de CSP explicite. |
| Gestion des clés | La clé OpenRouter est lue depuis `localStorage` côté renderer (`ChatPage.tsx`) et transmise par IPC. **Anti-modèle** pour la Forge. |
| Dépendance MCP | `easy-mcp-use` : dernière publication sur npm le **13/05/2025**. |
| Tests | Aucun script de test. Seulement typecheck, lint, build. |
| Contenu | Nombreux widgets de démonstration personnels (météo, musique, GitHub, CV…). Hors sujet. |

**Décision :** **S'inspirer**. Retenir uniquement l'idée d'un pont `contextBridge` minimal et d'une page de configuration des serveurs MCP. Ne pas dépendre de ce dépôt. Ne pas copier de code (licence absente).

### 4.D Template Electron — https://github.com/BRVWL/electron-react-typescript-template

| Critère | Constat |
|---|---|
| Licence | `package.json` indique `"license": "MIT"`, mais **aucun fichier LICENSE** et GitHub indique `null`. Licence ambiguë : traiter comme non licencié tant que l'auteur ne confirme pas. |
| Activité | Créé le 22/05/2025, dernier push le 30/05/2025. 3 étoiles. |
| Stack | Electron **35.1.2**, **TypeScript `~4.5.4`** (2021, incompatible avec les types React 19 récents), Electron Forge + plugin Vite, ESLint 8, Tailwind 3, shadcn/ui (`components.json`). |
| Sécurité Electron | `contextIsolation: true`, `nodeIntegration: false` explicites. `sandbox` non défini. Preload minimal (invocations IPC nommées). Bon point. |
| Gestion des clés | `.gitignore` sans `.env`. |
| Tests | Aucun. |
| Hygiène | Dossier `.vite/` de build committé. |

**Décision :** **Écarter** comme base. Les deux points de sécurité sont bons, mais l'outillage est daté et la licence incertaine. Le scaffold officiel `electron-vite` (voir §5) donne une base équivalente plus propre.

### 4.E1 GameplayFramework — https://github.com/AyaDogGames/GameplayFramework

| Critère | Constat |
|---|---|
| Licence | **Apache-2.0** (fichier LICENSE). Obligations : notice, mention des modifications, licence incluse. Pas de licence distincte pour les `Content/` binaires identifiée. |
| Activité | Créé le 31/10/2024, dernier commit le 03/10/2026 (fusion de PR #29). 5 étoiles, 1 fork. |
| Moteur | **Contradiction** : `README.md` indique **UE 5.7**, `CLAUDE.md` indique **UE 5.8**. `.uplugin` version 1.0. |
| Modules | `GameplayFramework` (Runtime), `Collectibles` (Runtime), `DaProcGen` (Runtime, génération procédurale PCG). Aucun module éditeur. |
| Dépendances | GameplayAbilities, EnhancedInput, CommonUI, ModelViewViewModel, PCG, GameplayTasks, AIModule… |
| Contenu | ~340 fichiers, dont des `.uasset` (interfaces, GAS, UI). |
| Pertinence | Architecture GAS data-driven (`DaAttributeComponent`, attributs liés aux GameplayTags), inventaire basé sur `FFastArraySerializer`. |
| Lacunes | **Aucun système de poids ni d'endurance** trouvé dans le code. |

**Décision :** **S'inspirer** (architecture GAS, attributs par tags, inventaire répliqué). Trop lourd comme dépendance pour un prototype d'endurance en Blueprint. Le dépôt sert de plugin partagé entre plusieurs jeux de l'auteur (`CLAUDE.md`) : signe d'usage réel, mais la Forge ne doit pas dépendre de ses choix internes.

### 4.E2 InventoryPluginUE5 — https://github.com/alessandrobelli/InventoryPluginUE5

| Critère | Constat |
|---|---|
| Licence | **MIT** (« Copyright (c) 2025 Alessandro Belli »). |
| Activité | Créé le 22/07/2025, dernier push le 13/12/2025. 5 étoiles. |
| Moteur | README : « UE 5.6+ ». `DemoJob.uproject` : `EngineAssociation` 5.6. |
| Structure | Dépôt complet d'un projet de démonstration (`DemoJob.uproject`) avec le plugin `Plugins/Inventory`. ~75 fichiers source (.h/.cpp/.cs). |
| **Binaires committés** | **82 fichiers** sous `Binaries/` et `Intermediate/` : `.dll`, `.exe` (dont `UnrealEditor-Inventory.patch_0_PID_*.exe`), `.pdb`, `.lib`. Un fichier `*.dv-conflict.dll` révèle un conflit de synchronisation (dossier `.diversion/`). |
| **Écart README / code** | Le README annonce un « Weight System », un `FInv_WeightFragment`, un `GetInventoryWeight()` et une gestion du poids dans `AInv_PlayerController`. **Aucune occurrence de « weight » dans les 74 fichiers source téléchargés.** |
| Tests | Aucun test d'automatisation dans le plugin. |
| Contenu | Dossier `Content/` d'environ 125 Mo. |
| Pertinence | Modèle à fragments (`FInv_ItemFragment`), grille spatiale, équipement, tags de gameplay. |

**Décision :** **S'inspirer** (modèle fragment, séparation items/UI). Ne pas réutiliser le code de poids (absent). Ne pas réutiliser les binaires (risque d'exécution de code non vérifié et pollution du dépôt). Ne pas adopter le dépôt entier.

### 4.E3 UE5Inventory (Synock) — https://github.com/Synock/UE5Inventory

| Critère | Constat |
|---|---|
| Licence | **MIT** (« Copyright (c) 2022 Maximilien Guislain »). |
| Activité | Créé le 23/01/2022, dernier merge le 08/10/2026. 163 étoiles, 32 forks. Projet actif. |
| Moteur | Guide d'intégration : « Unreal Engine 5.0+ ». Plugin `InventoryPlugin` version 2.0 (sans `EngineVersion` dans le `.uplugin`). **Compatibilité 5.8 non vérifiée.** |
| Structure | ~227 fichiers source (.h/.cpp), 5 guides dans `Docs/` (intégration, interfaces, composants, items, réplication). |
| Fonctionnalités | Grille, réplication, bags avec `WeightReduction`, **gestion du poids** (`GetTotalWeight`, `WeightChanged`), équipement, durabilité, monnaie, loot, marchands, banque, commerce entre joueurs, réparation. |
| Tests | Oui : dossier `Source/InventoryPlugin/Private/Tests/` (tests d'automatisation UE : `CoinValueTests`, `EquipmentMultiSlotConflictTests`, etc.). |
| Pertinence | **Référence la plus solide** pour le poids et l'encombrement (sur les bags) et pour la structure de tests. |

**Décision :** **S'inspirer** : concept de poids et de réduction de poids, structure des tests, séparation des interfaces. **Écarter comme dépendance** pour la première version : c'est un système complet (commerce, banque, réparation) et la mission demande une architecture modulaire et une étape deux minimale. À reconsidérer si vous voulez un inventaire complet plutôt qu'un prototype.

### 4.E4 Lyra (copie `johnlogostini/Lyra`)

| Critère | Constat |
|---|---|
| Licence | Fichier LICENSE : « **UE-Only Content - Licensed for Use Only with Unreal Engine-based Products** ». Usage limité aux produits basés sur Unreal Engine. Pas de licence logicielle ouverte. |
| Nature | **Ce n'est pas un fork** (GitHub : `fork: false`). C'est une copie tierce : je n'ai pas pu vérifier qu'elle est identique au Lyra officiel d'Epic. |
| Activité | Créé le 10/10/2023, dernier push le 12/10/2023. Non maintenu depuis plus de deux ans. |
| Moteur | `Lyra.uproject` : `EngineAssociation` **5.3**. |
| Pertinence | Très utile comme **référence d'architecture** (Experience/GameFeatures, GAS, attributs, interactions, UI commune). Trop volumineux et daté pour une base. |

**Décision :** **S'inspirer** uniquement. Ne rien copier. Pour une référence officielle, préférer le Lyra publié par Epic (Fab ou dépôts Epic), à vérifier.

---

## 5. Dépendances techniques de la Forge (versions du 18/10/2026)

Vérifié sur le registre npm. Toutes les licences sont **MIT** sauf mention contraire.

| Paquet | Version actuelle | Usage prévu | Remarque |
|---|---|---|---|
| `electron` | 44.9.0 | Application de bureau | Le guide de sécurité Electron cité est en 44.9.0. |
| `electron-vite` | 6.0.0 | Build main/preload/renderer | Scaffold officiel : `npm create @quick-start/electron` (`@quick-start/create-electron` 1.0.31). |
| `react` | 19.3.1 | Interface | — |
| `vite` | 8.3.4 | Rechargement rapide | Fourni par electron-vite, à vérifier à l'install. |
| `tailwindcss` | 4.3.3 | Styles | Tailwind 4, sans config PostCSS legacy. |
| `typescript` | 5.x (à figer à l'install) | Typage strict | Éviter la série 4.x. |
| `zod` | 4.6.7 | Contrats de données validés (schémas + types TS) | Préférable à JSON Schema seul : un seul source de vérité. |
| `vitest` | 5.0.5 | Tests unitaires et d'intégration | — |
| `better-sqlite3` | 13.0.3 | SQLite synchrone | **Module natif** : rebuild pour Electron nécessaire (`@electron/rebuild`). À valider en phase 1. Alternative à évaluer : module `node:sqlite` intégré (sans compilation native). |
| `@modelcontextprotocol/sdk` | 1.32.1 | Client MCP vers Unreal | Ne pas implémenter le protocole soi-même. À valider contre les deux serveurs (protocole 2025-03-26). |
| `@anthropic-ai/sdk` | 0.135.0 | Appels IA | Adaptateur fournisseur derrière une interface. |
| `electron-builder` | 26.15.3 | Packaging, plus tard | Hors prototype. |

**Paquets écartés :** `easy-mcp-use` (non publié depuis mai 2025) ; `@langchain/*` (couche d'abstraction non nécessaire pour un seul fournisseur au départ).

---

## 6. Incohérences et points d'attention relevés

1. **GameplayFramework** : UE 5.7 (README) contre UE 5.8 (CLAUDE.md).
2. **InventoryPluginUE5** : fonctionnalité de poids documentée, absente du code.
3. **InventoryPluginUE5** : binaires de build et fichiers de conflit committés.
4. **Template BRVWL** : `"license": "MIT"` sans fichier de licence.
5. **MCP Desk** : clé API dans `localStorage`, `sandbox: false`, pas de licence.
6. **Epic MCP** : API expérimentale, sans authentification, à ne jamais exposer hors de la machine.
7. **BlueprintMCP** : auteur unique, dépôt de 2 mois, 0 test automatisé Unreal.
8. **Lyra** : copie tierce, licence restreinte aux produits Unreal, daté de 2023.
9. **Projets UE 5.7 de l'utilisateur** : incompatibles avec les deux serveurs MCP 5.8 sans migration.

---

## 7. Sources

- Dépôts GitHub : LGC363/BlueprintMCP, morluto/rea, debsouryadatta/mcp-desk, BRVWL/electron-react-typescript-template, AyaDogGames/GameplayFramework, alessandrobelli/InventoryPluginUE5, Synock/UE5Inventory, johnlogostini/Lyra.
- Documentation Epic : `dev.epicgames.com/documentation/en-us/unreal-engine/unreal-mcp-in-unreal-editor`.
- Sécurité Electron : `electronjs.org/docs/latest/tutorial/security`.
- Installation locale : `E:\Epic Games\UE_5.8` (`Build.version`, `Plugins\Experimental\ModelContextProtocol`, `Plugins\Experimental\Toolsets`) ; `C:\ProgramData\Epic\UnrealEngineLauncher\LauncherInstalled.dat`.
- Registre npm (versions et licences) consulté le 18/10/2026.
