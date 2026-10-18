# Plan d'implémentation — Forge

**Date :** 18 octobre 2026 · **Référence :** [ARCHITECTURE.md](ARCHITECTURE.md), [REPOSITORY_AUDIT.md](REPOSITORY_AUDIT.md)

Chaque phase produit une tranche **exécutable**, des tests, une mise à jour de la documentation et un état explicite : **opérationnel**, **partiel** ou **non implémenté**. Une phase n'est pas « terminée » parce que le code existe, mais parce que ses critères de validation passent.

Ordre : celui de la mission, avec une seule modification — **le spike Unreal (phase 3) est avancé avant les données et l'IA**, car c'est le risque le plus élevé et il conditionne l'architecture.

---

## Phase 0 — Audit et architecture (en cours)

- **Livrables :** `REPOSITORY_AUDIT.md`, `ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`, `LICENCES.md`, `OPEN_QUESTIONS.md`.
- **Critères :** chaque projet a une décision (Réutiliser / Adapter / S'inspirer / Écarter) et une preuve ; les versions UE sont confrontées à l'installation locale ; les questions bloquantes sont séparées des questions secondaires.
- **Statut :** opérationnel une fois validé par vous.

---

## Phase 1 — Initialisation du dépôt et de l'application Electron

**Actions**
1. Créer `forge/` comme dépôt Git indépendant (`git init`, branche `main`). **Pas de commit sans votre demande.**
2. Scaffold : `npm create @quick-start/electron` (électron-vite 6), TypeScript, React.
3. Configurer la sécurité : `contextIsolation`, `nodeIntegration: false`, `sandbox: true`, CSP, blocage de navigation et de `window.open`.
4. Ajouter Vitest et un test de configuration de fenêtre (vérifie que les options de sécurité ne régressent pas).
5. Ajouter `.gitignore` : `.env`, `node_modules/`, `out/`, `dist/`, `*.sqlite`.
6. Vérifier `better-sqlite3` sur Electron 44 (rebuild) : ouvrir une base, créer une table, relire une ligne. Si le rebuild échoue, tester `node:sqlite`.
7. Script `npm run licenses` qui liste les licences des dépendances.

**Critères de validation**
- `npm run dev` ouvre une fenêtre vide sans erreur console.
- `npm test` passe (au moins 3 tests : sécurité de fenêtre, schéma de version, ouverture SQLite).
- `npm run licenses` ne liste aucune licence hors MIT/Apache-2.0/BSD/ISC sans justification écrite.
- Un test ou une vérification prouve qu'aucun accès direct `ipcRenderer` n'est exposé.

**Risques :** rebuild natif de `better-sqlite3` (mitigation : `node:sqlite` en repli, décision notée).
**Dépend de :** phase 0.

---

## Phase 2 — Interface fonctionnelle avec données fictives

**Actions**
1. Mettre en place la navigation et les 11 pages de la mission (§10 de l'architecture).
2. Remplir chaque page avec des fixtures **marquées** « DONNÉES DE DÉMONSTRATION » (bandeau visible).
3. Textes en français via `i18n/fr.json`.
4. Formulaires : éditeur de fiche (valeurs et statut de règle), plan de fusion (réordonnancement en lecture seule au départ).

**Critères de validation**
- Toutes les pages sont accessibles et affichent le bandeau de démonstration.
- Test de rendu (Vitest + Testing Library) pour la navigation et l'éditeur de fiche.
- Aucune donnée fictive ne peut être confondue avec une donnée réelle (pas de chemin de stockage utilisé par ces pages).
- Vérifié à deux largeurs de fenêtre (1280 et 800 px) par capture d'écran.

**Dépend de :** phase 1.

---

## Phase 3 — Connexion et vérification du MCP Unreal (spike)

Cette phase répond à la question centrale : **quel pont utiliser, et que peut-il réellement faire ?**

**Actions**
1. **Copie du projet de test** : `Projet Aria\Test` → `Projet Aria\Test_Forge` (après votre accord, voir [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md)). L'original n'est jamais modifié.
2. **Spike A — MCP officiel Epic** (plugins déjà activés dans la copie) :
   - Démarrer l'éditeur, vérifier `http://127.0.0.1:8000/mcp`.
   - Envoyer `initialize`, `tools/list`, noter les outils réels (liste exacte dans `docs/UNREAL_SPIKE.md`).
   - Créer un Blueprint `ActorComponent` de test, ajouter une variable `float`, la compiler, la relire.
   - Vérifier que la fonction `TryConsume` peut être créée avec une entrée et une sortie.
   - Vérifier l'existence d'une opération de **sauvegarde** ; sinon, noter le manque.
3. **Spike B — BlueprintMCP** :
   - Installer le plugin dans la copie (`Plugins/BlueprintMCP`), compiler (MSVC 14.44 présent), lancer l'éditeur.
   - Lire le jeton, `bp_ping`, `bp_get_overview`, `bp_create_blueprint`, un `bp_apply_patch` avec `add_variable` + `add_function`, `bp_compile`, `bp_save`.
   - Vérifier le retour arrière : un patch volontairement invalide ne doit laisser aucune trace.
4. **Spike C — capacité de test en jeu** : déterminer si le pont peut lancer une session PIE et lire une variable pendant la session. Si non, noter la limite.
5. **Décision** : adaptateur principal et adaptateur de repli, avec justification.

**Critères de validation**
- Un document `docs/UNREAL_SPIKE.md` contient les sorties réelles des appels (sans jeton), la version de l'éditeur et les limites constatées.
- Une variable et une fonction sont créées, compilées et relues dans au moins un des deux adaptateurs.
- Les drapeaux de capacité (§5.2) reflètent ce qui a été constaté, pas ce que la documentation annonce.

**Limite de temps :** trois jours de travail maximum avant d'informer l'utilisateur d'un blocage.

**Risques**
- API Epic expérimentale, susceptible de changer → adaptateur derrière interface, version UE figée (5.8.3).
- Pas d'authentification sur l'endpoint Epic → loopback uniquement, vérification côté Forge.
- BlueprintMCP compilé pour 5.8 mais jamais testé par un tiers → spike obligatoire, pas de présomption.
- Compilation C++ longue (BlueprintMCP) → à lancer en arrière-plan, avec journal.

**Dépend de :** phases 1 et 2 ; votre accord pour la copie du projet.

---

## Phase 4 — Modèle de données et validation des mécaniques

**Actions**
1. Schémas Zod : `Source`, `MechanicSpec`, `Analysis`, `MergePlan`, `UnrealOperation` (versions `v1`).
2. Deux fiches réelles, écrites à la main : **endurance** et **poids** (valeurs §6 ci-dessous).
3. Moteur de fusion MVP : graphe, cycles, propriété unique, dépendances manquantes, conflits déclarés.
4. Compilateur de plan : `MergePlan` → liste d'opérations ; `planHash` (SHA-256 d'une sérialisation canonique).
5. Stockage SQLite des mécaniques et des plans, avec migrations.

**Critères de validation**
- Tests Vitest : schéma invalide rejeté avec message clair ; cycle détecté ; deux propriétaires pour une même variable → erreur ; même entrée → même `planHash` (test de déterminisme).
- La fusion endurance + poids produit un ordre correct (poids avant endurance et mouvement).
- Un plan contenant une opération hors liste blanche est refusé.

**Dépend de :** phase 1. Peut se faire en parallèle de la phase 3.

---

## Phase 5 — Intégration de l'API d'IA

**Actions**
1. Interface fournisseur et adaptateur Anthropic (`@anthropic-ai/sdk` 0.135).
2. Budget : plafond jour/mois, avertissement à 80 %, refus à 100 %.
3. Cache : clé = hash de (tâche, modèle, version du prompt, entrée).
4. Journal `ai_calls` et compteur de tokens.
5. Estimation de coût affichée avant chaque tâche lourde.
6. Clé stockée via `safeStorage` ; saisie dans les réglages, jamais dans le rendu après saisie.

**Critères de validation**
- Tests avec SDK simulé : budget dépassé → aucun appel ; deuxième appel identique → cache, aucun appel réseau.
- Test : la clé n'apparaît dans aucun fichier du dépôt ni dans le bundle du rendu (recherche automatisée).
- Premier appel réel uniquement après que vous avez défini le budget (voir OPEN_QUESTIONS).

**Dépend de :** phase 1, et votre budget.

---

## Phase 6 — Premier système d'endurance dans UE 5.8

**Spécification (valeurs de la mission)**

| Paramètre | Valeur | Éditable |
|---|---|---|
| `MaxEndurance` | 100 | oui |
| `DodgeCost` | 25 | oui |
| `RegenRate` | 15 points/s | oui |
| `RegenDelay` | 1,0 s après la dernière dépense | oui |
| `CurrentEndurance` | égal à `MaxEndurance` au démarrage | non |

**Comportement**
- `TryDodge() → bool` : si `CurrentEndurance ≥ DodgeCost`, retire le coût, remet à zéro le délai de régénération, renvoie `true`. Sinon, émet `OnDodgeRefused` et renvoie `false`.
- Régénération : après le délai, ajoute `RegenRate × ΔT` jusqu'à `MaxEndurance`.
- Événements : `OnEnduranceChanged(Current, Max)` à chaque variation ; `OnExhausted` quand `Current` atteint 0.

**Hors périmètre de la Forge** : l'animation d'esquive, le bouton d'entrée et les visuels sont à vous (ressources artistiques).

**Actions**
1. Créer `/Game/Forge/Endurance/BP_AC_Endurance` via le modèle `component.resource_pool.v1`.
2. Créer une carte et un personnage de test **minimaux** (le dossier `Content` du projet de test est vide) : `BP_Forge_TestCharacter` dérivé de `Character`, avec un bouton de test optionnel.
3. Attacher le composant au personnage de test.
4. Compiler, relire les valeurs par défaut, générer le rapport.
5. Checklist de test en jeu (PIE) : épuisement, délai, refus, régénération, événements.

**Critères de validation**
- Le plan affiché est identique à la spécification ; modifier une valeur dans l'interface change le plan et son `planHash`.
- Après approbation, le Blueprint est créé, compilé sans erreur, et la relecture confirme les quatre valeurs par défaut.
- La checklist PIE est exécutée (par vous, ou automatiquement si le spike C le permet). **Tant qu'elle ne l'est pas, le rapport dit « non testé en jeu ».**
- Un retour arrière rétablit l'état d'avant génération (testé dans la copie).

**Dépend de :** phases 3, 4 ; phase 5 non requise pour ce prototype (la génération est déterministe).

---

## Phase 7 — Tests automatisés, journalisation et sauvegarde

**Actions**
1. Commit Git avant et après chaque génération, dans le dépôt de la copie de projet.
2. Journal de génération (`generations`, `operations`, `test_runs`) consultable dans l'historique.
3. Commande de retour arrière avec confirmation, testée sur la copie.
4. Rapport final généré en Markdown à partir des enregistrements.

**Critères de validation**
- Test de bout en bout sur la copie : génération → rapport → retour arrière → état identique au commit de référence.
- Une opération échouée est enregistrée avec son erreur et ne marque pas la génération « réussie ».

**Dépend de :** phase 6.

---

## Phase 8 — Fusion de l'endurance et du poids (étape 2 de la mission)

**Spécification proposée — paramètres à valider (ce sont des choix de conception, pas des faits)**

| Paramètre | Valeur proposée | Statut |
|---|---|---|
| Inventaire | `AC_Inventory` : liste d'objets avec `Weight` (float) et `Quantity` | design_choice |
| `TotalWeight` | somme des `Weight × Quantity` | design_choice |
| `WeightCapacity` | 50 | design_choice, à régler |
| `SpeedFactor` | `clamp(1 − (TotalWeight / WeightCapacity) × 0,5 ; 0,4 ; 1,0)` | design_choice |
| `MaxWalkSpeed` (personnage) | vitesse de base × `SpeedFactor` | design_choice |
| Coût d'esquive pondéré | `DodgeCost × (1 + 0,5 × TotalWeight / WeightCapacity)` | design_choice, à valider |

**Ordre de dépendances détecté par le moteur**
`AC_Inventory` (écrit `TotalWeight`) → `AC_Weight` (lit `TotalWeight`, écrit `SpeedFactor`) → `CharacterMovement` (lit `SpeedFactor`) et `AC_Endurance` (lit `TotalWeight`, modifie le coût).

**Actions**
1. Fiches `inventory.weight.v1` et `movement.weight_penalty.v1`.
2. Génération : inventaire minimal, composant de poids, modification de `AC_Endurance` (coût pondéré).
3. Vérification par relecture : `TotalWeight` = somme attendue ; `SpeedFactor` borné ; `MaxWalkSpeed` ajusté.
4. Test de conflit : deux mécaniques revendiquant la régénération → le moteur bloque et explique.

**Critères de validation**
- Tests unitaires du calcul de `SpeedFactor` (poids 0 → 1,0 ; poids supérieur à la capacité → 0,4 ; valeurs intermédiaires).
- Le plan montre l'ordre de dépendances et l'impact de chaque paramètre.
- Test en jeu : ajouter un objet lourd change la vitesse ; retirer l'objet rétablit la vitesse. **Non testé tant que la checklist n'est pas exécutée.**

**Dépend de :** phases 6 et 7.

---

## Phase 9 — Extension progressive du catalogue

- Ajouter une mécanique à la fois : sources, analyse IA (si budget), fiche, revue utilisateur, plan, génération.
- Chaque nouvelle mécanique doit avoir au moins une règle `documented` ou `design_choice` explicite ; aucune règle `hypothesis` n'est générée sans validation.
- Pas de copie de systèmes existants : chaque implémentation est écrite pour la Forge à partir des modèles.

**Dépend de :** phase 8.

---

## Risques et mitigations

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| API MCP Epic expérimentale change | Élevée | Moyen | Adaptateur derrière interface ; version UE 5.8.3 figée ; spike documenté |
| Endpoint Epic sans authentification | Certaine (par conception) | Moyen sur poste partagé | Loopback uniquement ; vérification d'origine ; jamais en production |
| BlueprintMCP instable ou non compilable | Moyenne | Moyen | Spike obligatoire ; repli sur Epic |
| Génération de nœuds plus difficile que prévu | Élevée | Élevé | Commencer par variables et fonctions ; nœuds seulement via modèles testés |
| Test en jeu impossible par le pont | Moyenne | Moyen | Checklist manuelle ; rapport honnête « non testé en jeu » |
| Rebuild natif SQLite pour Electron | Moyenne | Faible | Test en phase 1 ; repli `node:sqlite` |
| Dépassement de budget IA | Faible (si plafond) | Élevé | Plafond dur ; estimation ; cache ; modèles économiques par défaut |
| Problème de droits d'auteur sur les sources | Moyenne | Élevé | Pas de texte intégral stocké ; URL, notes et résumés propres |
| Analyse de jeux commerciaux (REA) | Moyenne | Élevé | REA optionnel, désactivé ; aucun binaire sans accord écrit et vérification de licence |
| Projets 5.7 de l'utilisateur non compatibles | Certaine | Faible | Limiter le prototype au projet 5.8 ; migration décidée par l'utilisateur |
| Complexité pour un débutant | Élevée | Moyen | Tranches verticales ; chaque phase finit par une application lançable et un rapport |

---

## Dépendances externes

- Unreal Engine 5.8.3 (installé).
- Visual Studio 2022 BuildTools, MSVC 14.44 (installé ; nécessaire seulement pour compiler BlueprintMCP).
- Clé API Anthropic (à fournir, phase 5).
- Node 24 (installé) ; Electron 44 (npm).

---

## Critères de sortie du prototype (rappel de la mission)

Le prototype est **fonctionnel** lorsque, sur le projet de test, l'utilisateur peut : voir la spécification ; modifier les paramètres ; approuver ; obtenir un Blueprint compilé dont les valeurs sont relues ; et obtenir un rapport qui distingue ce qui est **vérifié automatiquement**, ce qui est **vérifié manuellement**, et ce qui **n'a pas été testé**.
