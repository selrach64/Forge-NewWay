# Licences, obligations et restrictions — Forge

**Date :** 18 octobre 2026 · **Avertissement :** ce document est une analyse technique de licences, **pas un avis juridique**. Pour toute distribution publique ou commerciale, faites relire les conditions par un professionnel.

---

## 1. Règle de la Forge

1. **Aucun code ni asset copié** depuis un dépôt sans licence explicite, ni depuis un dépôt dont la licence est restrictive.
2. **Réutilisation de code** uniquement pour les licences permissives (MIT, Apache-2.0, BSD, ISC), avec conservation de la notice.
3. **Idées et architectures** peuvent être inspirées de n'importe quel projet, sans copie littérale.
4. **Aucun binaire tiers** (`.dll`, `.exe`, `.uasset`) n'est redistribué ni copié dans la Forge.
5. **Aucun texte intégral** de source (article, documentation de jeu, vidéo) n'est stocké : on conserve l'URL, un résumé propre et vos notes.

---

## 2. Projets audités

| Projet | Licence | Source de la licence | Obligations | Restrictions identifiées | Usage autorisé par la Forge |
|---|---|---|---|---|---|
| **BlueprintMCP** | MIT | Fichier `LICENSE`, « Copyright (c) 2026 BlueprintMCP Contributors » | Conserver la notice de copyright et de licence dans toute copie ou partie substantielle. | Aucune. Attention : pas de garantie. | **Oui** : plugin installé dans une copie de projet, version épinglée. Pas de copie de code dans la Forge. |
| **REA** | MIT | Métadonnées GitHub (SPDX MIT) et badge du README ; le dépôt contient aussi `THIRD_PARTY_NOTICES.md` et `licenses/` (**non relus à ce stade**). | Conserver la notice MIT ; relire `THIRD_PARTY_NOTICES.md` avant toute intégration. | **Moteurs natifs** (Hopper, Ghidra, IDA) : licences séparées, à vérifier individuellement. **Analyse de jeux commerciaux** : soumise aux conditions d'utilisation du jeu et au droit local. | **Optionnel**, désactivé par défaut, sans analyse de jeu commercial sans accord écrit. |
| **MCP Desk** | **Aucune** (pas de fichier LICENSE, GitHub `null`) | Absence de licence | Droits réservés par défaut. | **Aucune copie de code**, aucune redistribution. | **Non** pour le code. Idées seulement (§4). |
| **Template Electron BRVWL** | Déclarée MIT dans `package.json`, **sans texte de licence** | `package.json` seul ; GitHub `null` | Ne pas présumer la licence sans texte. | Licence ambiguë → traitée comme non accordée. | **Non** comme base. |
| **GameplayFramework** | **Apache-2.0** | Fichier `LICENSE` (texte complet) | Inclure la licence ; indiquer les modifications ; conserver les notices. Clause de licence de brevet : la contribution de l'auteur est couverte, mais la clause de résiliation s'applique si vous attaquez en brevet. | Les `Content/*.uasset` ne sont pas explicitement couverts par un texte distinct : **ne pas les réutiliser**. | **Inspiration** d'architecture uniquement. |
| **InventoryPluginUE5** | MIT | Fichier `LICENSE`, « Copyright (c) 2025 Alessandro Belli » | Conserver la notice. | Les **binaires committés** (`Binaries/`, `Intermediate/`) ne sont pas des livrables ; ne pas les utiliser. Le contenu `Content/` (assets) n'est pas couvert par une licence distincte : ne pas le réutiliser. | **Inspiration** (modèle à fragments). |
| **UE5Inventory (Synock)** | MIT | Fichier `LICENSE`, « Copyright (c) 2022 Maximilien Guislain » | Conserver la notice. | Aucune restriction notable hors MIT. | **Inspiration** (poids, tests). Adoption comme dépendance reportée. |
| **Lyra (copie `johnlogostini`)** | « **UE-Only Content** — Licensed for Use Only with Unreal Engine-based Products » | Fichier `LICENSE` | Usage **limité aux produits basés sur Unreal Engine**. | Pas une licence logicielle ouverte. Copie tierce non vérifiée. | **Inspiration** d'architecture. Aucun code copié. |
| **Unreal MCP officiel Epic (UE 5.8)** | Contrat de licence d'Unreal Engine (EULA) — plugin fourni avec le moteur | Installation locale `E:\Epic Games\UE_5.8` ; EULA officielle | Respecter l'EULA d'Unreal Engine pour tout projet publié (redevance au-delà d'un seuil de revenus, selon l'EULA en vigueur — **à vérifier sur la page officielle à la date de publication**). | Fonction **expérimentale** : Epic déconseille la livraison avec. | **Oui** pour les tests, dans l'installation déjà présente. |

---

## 3. Dépendances de la Forge

Vérification au registre npm (18/10/2026). Toutes **MIT** sauf mention.

| Paquet | Licence | Obligations |
|---|---|---|
| `electron` | MIT | Inclure les notices tierces du runtime (Chromium, Node.js…) lors du packaging. |
| `electron-vite` | MIT | — |
| `@quick-start/create-electron` | MIT | Utilisé une seule fois (scaffold). |
| `react`, `react-dom` | MIT | — |
| `vite` | MIT | — |
| `tailwindcss` | MIT | — |
| `typescript` | Apache-2.0 | Conserver la notice. |
| `zod` | MIT | — |
| `vitest` | MIT | Outil de développement, non distribué. |
| `better-sqlite3` | MIT | Module natif ; inclut SQLite (**domaine public**). |
| `@modelcontextprotocol/sdk` | MIT | — |
| `@anthropic-ai/sdk` | MIT | Conditions d'utilisation de l'API Anthropic à respecter séparément. |
| `electron-builder` | MIT | Outil de packaging. |

**À faire en phase 1 :** générer `THIRD_PARTY_NOTICES.md` automatiquement (script `npm run licenses`) et le mettre à jour à chaque ajout de dépendance.

**Écartés pour raison de licence ou de maintenance :** `easy-mcp-use` (MIT, mais dernière publication en mai 2025 — maintenance insuffisante).

---

## 4. Ce que la Forge produit

- **Blueprints et assets générés** : ils appartiennent à votre projet Unreal. La Forge ne revendique aucun droit dessus.
- **Modèles d'implémentation** (`src/core/templates/`) : code écrit pour la Forge. Leur licence est celle que vous choisirez pour la Forge elle-même (question ouverte).
- **Rapports et fiches** : produits à partir de vos données et de sources publiques citées par URL. Pas de copie de texte protégé.

---

## 5. Points d'attention juridiques (non exhaustifs)

1. **Jeux commerciaux.** Les mécaniques d'un jeu (principes, règles générales) ne sont généralement pas protégées par le droit d'auteur, mais leur **expression** (code, textes, assets, formulations) l'est. La Forge reformule et ne copie pas.
2. **Rétro-ingénierie.** Les conditions d'utilisation de nombreux jeux interdisent la décompilation ou l'analyse de binaires. La réglementation varie selon les pays. **La Forge n'analyse aucun binaire de jeu commercial par défaut.**
3. **Jeux sur console.** Les jeux Switch (dont Zelda: Breath of the Wild) et PlayStation sont protégés par des mesures techniques et des conditions d'utilisation strictes. La Forge ne les traite pas à partir de fichiers ; elle travaille à partir de sources publiques et de vos descriptions.
4. **Données personnelles.** Les sources et notes restent locales. Les envois à l'API IA contiennent uniquement les extraits nécessaires. Vérifiez la politique de conservation de votre fournisseur d'IA.
5. **Unreal Engine.** Les projets publiés avec Unreal sont soumis à l'EULA ; le plugin Epic MCP est expérimental et ne doit pas être livré en production (avertissement de la documentation Epic).

---

## 6. Sources

- Fichiers LICENSE des dépôts audités (lus via l'API GitHub ou le clone superficiel).
- Métadonnées de licence : API GitHub (`license.spdx_id`), consultée le 18/10/2026.
- Registre npm : licence et date de publication des paquets, consulté le 18/10/2026.
- Installation locale d'Unreal Engine 5.8.3 : `E:\Epic Games\UE_5.8`.
- Documentation Epic *Unreal MCP in Unreal Editor*, avertissements de stabilité.
