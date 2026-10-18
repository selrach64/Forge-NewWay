# Questions ouvertes — Forge

**Date :** 18 octobre 2026

Deux catégories. Les **bloquantes** empêchent un travail précis ; je ne peux pas choisir à votre place. Les **secondaires** ont un défaut raisonnable : je l'applique, et vous me dites si vous voulez changer.

---

## A. Questions bloquantes

### A1. Copie du projet de test (bloque la phase 3)

Le projet `C:\Users\selra\Documents\Projet Aria\Test\Test.uproject` est en **UE 5.8.3**, sans `Source`, avec `Content/` vide, et il a déjà les plugins MCP et toolsets activés. C'est le candidat idéal.

Je propose de **créer une copie** `Projet Aria\Test_Forge` et de n'écrire que dans cette copie (ajout d'une carte et d'un personnage de test, installation éventuelle de BlueprintMCP). L'original reste intact, conformément à la règle de la mission.

**Autorisez-vous cette copie et les modifications dans la copie uniquement ?**
*Défaut si vous ne répondez pas : je ne fais rien sur le projet ; la phase 3 attend.*

### A2. Finalité du prototype (bloque le choix d'un pont Unreal pour la suite)

La documentation Epic indique que le plugin MCP est **expérimental** et déconseille de le livrer. Deux cas :
- **Tests uniquement** (vos projets d'essai) : le plugin Epic et BlueprintMCP sont acceptables.
- **Usage en vue d'un jeu livré** : il faudra un pont plus stable ou une génération sans pont en direct (export de modèles), et une revue de licence plus poussée.

**Le prototype est-il uniquement pour des projets de test ?**
*Défaut : oui, tests uniquement.*

### A3. Budget et fournisseur d'IA (bloque la phase 5, pas avant)

Pour les analyses et la rédaction de fiches, il faut :
- une **clé API** (Anthropic recommandé, selon l'architecture) à fournir **par vous**, saisie dans les réglages de la Forge (stockage chiffré) ou via une variable d'environnement ;
- un **plafond** : par exemple 5 € par mois, avec arrêt automatique à 100 %.

**Quel plafond mensuel, et quel fournisseur ?**
*Défaut : Anthropic, 5 € par mois, arrêt à 100 %. Aucun appel réseau avant votre validation.*

---

## B. Questions secondaires (défauts appliqués)

| # | Sujet | Défaut appliqué | Pour changer |
|---|---|---|---|
| B1 | **Emplacement de la Forge** | Dossier `ClaudeStreamKit\forge\` (contient déjà la documentation). | Indiquez un autre dossier, je déplace. |
| B2 | **Lancement de l'éditeur UE pendant les spikes** | Vous ouvrez l'éditeur et me le dites ; la Forge se connecte ensuite. | Si vous préférez que la Forge lance `UnrealEditor.exe` elle-même, dites-le. |
| B3 | **Dépôt Git** | Dépôt séparé dans `forge\`, créé en phase 1 ; **aucun commit sans votre demande**. | — |
| B4 | **Licence de la Forge** | Privée, non publiée. | Choisissez MIT ou autre si vous voulez la publier. |
| B5 | **REA** | Hors périmètre initial ; optionnel plus tard. | Si vous voulez l'activer, dites-le et confirmez que vous possédez les jeux ou que leurs conditions d'utilisation le permettent. |
| B6 | **Jeux cibles** (Zelda: BotW, Death Stranding) | Travail à partir de sources publiques et de vos descriptions. **Aucun binaire de jeu analysé.** | Confirmer ou préciser. |
| B7 | **Inventaire de l'étape 2** | Inventaire minimal écrit pour la Forge. UE5Inventory (MIT) reste une référence, pas une dépendance. | Si vous préférez un inventaire complet tout prêt, nous réévaluerons. |
| B8 | **Paramètres de poids** (`WeightCapacity` 50, pénalité 0,5, plancher 0,4) | Valeurs de départ, marquées « à régler ». | Vous les validerez dans le plan avant génération. |
| B9 | **Test en jeu** | Si le pont ne peut pas piloter une session PIE, une checklist manuelle est utilisée, et le rapport indique « non testé en jeu » tant qu'elle n'est pas exécutée. | Si vous avez un moyen de test automatisé à me proposer. |
| B10 | **Bibliothèque de composants UI** | Tailwind CSS seul ; décision shadcn/ui reportée à la phase 2. | — |
| B11 | **Autres projets UE 5.7** (Fayel, MetaHumans, MarioRemake, New_era, Restart, MyProject) | Hors périmètre du prototype : incompatibles avec UE 5.8 sans migration. | Si vous voulez les migrer en 5.8, c'est votre décision ; je ne le ferai pas sans accord. |
| B12 | **Nom « Forge »** | Provisoire, conservé. | — |

---

## C. Informations que je n'ai pas pu obtenir

- **Compilation et exécution réelles** de BlueprintMCP et de l'endpoint Epic : non faites à ce stade. Elles sont la première tâche de la phase 3.
- **Contenu complet de la documentation Epic** sur les toolsets Blueprint : la page officielle ne les liste pas ; je les ai relevés dans le code installé.
- **Dépôt officiel Lyra d'Epic** : non consulté (accès non vérifié). Seule la copie `johnlogostini/Lyra` a été lue.
- **Notices tierces de REA** (`THIRD_PARTY_NOTICES.md`, `licenses/`) : non relues.
- **Tarification actuelle** de l'API IA : non vérifiée sur la page du fournisseur ; à confirmer avant la phase 5.
