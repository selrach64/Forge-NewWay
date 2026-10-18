# Spike Unreal — rapport

**Date :** 18 octobre 2026 · **Objectif :** vérifier qu'un pont MCP peut créer, modifier, compiler, relire et tester un composant d'endurance dans UE 5.8, sur une copie de projet.

**Statut global :** opérationnel pour la création, la modification, la compilation, la sauvegarde et la lecture de Blueprints. Partiel pour le test en jeu (régénération mesurée, esquive mesurée, événements non vérifiés). BlueprintMCP non testé.

---

## 1. Environnement

| Élément | Valeur vérifiée |
|---|---|
| Moteur | Unreal Engine **5.8.3** (changelist 58210709), `E:\Epic Games\UE_5.8`. Vérifié dans `Build.version` et le log de l'éditeur. |
| Projet source | `Documents\Unreal Projects\Fayel` (non modifié). Version déclarée : 5.7. |
| Copie de travail | `Documents\Unreal Projects\Fayel_Forge` (copie complète de 3 197 fichiers, vérifiée par nombre et taille). |
| Projet abandonné | `Projet Aria\Test` : abandonné par décision de l'utilisateur. Aucune copie créée. |
| Plugin ARIA | Fichiers déplacés hors de `Plugins\` dans `Fayel_Forge\ARIA_backup_removed\` (49 entrées). Original intact. |
| Conversion 5.7 → 5.8 | **Non enregistrée** : `Fayel_Forge\Fayel.uproject` indique toujours `EngineAssociation: 5.7`. Le projet s'ouvre en 5.8.3 sans conversion écrite. |

---

## 2. Pont MCP Epic (ModelContextProtocol)

### 2.1 Activation

Dans l'éditeur, dans **Edit > Plugins**, activés : *Unreal MCP* (`ModelContextProtocol`), *MCP Client Toolset*, *All Toolsets*, *Editor Toolset*. Les quatre sont enregistrés dans `Fayel.uproject`.

Les paramètres « Model Context Protocol » ne sont pas visibles dans **Project Settings** à cet état. Ce n'est pas bloquant : le serveur se lance par commande.

### 2.2 Démarrage et port

- Le démarrage automatique est **désactivé** par défaut (`bAutoStartServer = false`, source du plugin). Le serveur doit être lancé à chaque ouverture de l'éditeur.
- Commande utilisée dans la console de l'éditeur : `ModelContextProtocol.StartServer 8001`.
- Le port par défaut `8000` est **occupé** par un autre processus (`Manager`, PID 6608). Le port `8001` a été utilisé.
- Le log confirme : `Starting MCP server on port 8001` puis `All listeners started`.

### 2.3 Protocole

- Initialisation : protocole `2025-11-25`, ce que le serveur renvoie. Le serveur attribue un identifiant de session transmis dans l'en-tête `Mcp-Session-Id`.
- Sans cet en-tête, `tools/list` est refusé (`Missing required Mcp-Session-Id header`).
- Notification `notifications/initialized` acceptée (HTTP 202).
- **Mode de découverte** : `tools/list` ne renvoie que trois outils méta : `list_toolsets`, `describe_toolset`, `call_tool`. Les autres outils s'appellent via `call_tool` avec `toolset_name` et `tool_name`.
- 67 toolsets disponibles, dont `editor_toolset.toolsets.blueprint.BlueprintTools`, `editor_toolset.toolsets.object.ObjectTools`, `editor_toolset.toolsets.asset.AssetTools`, `editor_toolset.toolsets.actor.ActorTools`, `editor_toolset.toolsets.scene.SceneTools`, `EditorToolset.EditorAppToolset` (PIE), `AutomationTestToolset`.

### 2.4 Avertissement de licence

Le log indique : « Data transmitted via this plugin to your connected LLM service is Licensed Technology under the UE EULA. You are responsible for ensuring your LLM provider does not use it as training input. See Section 6(e) of the UE EULA. » **Conséquence pour la Forge** : les données de projet envoyées à une API IA sont soumises à cette clause. Les envois doivent rester minimaux et leur fournisseur doit être vérifié. À reporter dans `LICENCES.md`.

---

## 3. Résultats des opérations

Chaque ligne indique le résultat relu, pas seulement la réponse du serveur.

| Étape | Opération (toolset · outil) | Résultat relu | Statut |
|---|---|---|---|
| Création | `BlueprintTools.create` (ActorComponent) | `/Game/Forge/Endurance/BP_AC_Endurance` | OK |
| Variable | `BlueprintTools.add_variable` `MaxEndurance` float | `list_variables` = `[MaxEndurance]` | OK |
| Valeur | `ObjectTools.set_properties` sur le CDO | `MaxEndurance` = 100 relu | OK |
| Variables | `CurrentEndurance`, `DodgeCost`, `RegenRate`, `RegenDelay`, `TimeSinceSpend` | valeurs 100, 25, 15, 1.0 relues | OK |
| Éditable | `set_variable_instance_editable` (`instance_editable`) | retour sans erreur ; drapeau non relu | Partiel |
| Fonction | `add_function_graph` `TryDodge` + `add_function_param` (sortie bool) | sortie `ReturnValue` créée | OK |
| Logique | `write_graph_dsl` `TryDodge` (cost, refus, `return`) | relecture DSL identique | OK |
| Régénération | `write_graph_dsl` `EventTick` | relecture DSL cohérente | OK |
| Dispatchers | `add_event_dispatcher` ×3 (`OnEnduranceChanged` avec `Current`, `Max`; `OnExhausted`; `OnDodgeRefused`) | listés par `list_event_dispatchers` | OK |
| Émission | `Default|CallOnEnduranceChanged`, `CallOnExhausted`, `CallOnDodgeRefused` dans le graphe | relues dans le DSL | OK (graphe) |
| Compilation | `compile_blueprint` | renvoie `null` ; aucune erreur dans le log | OK (indirect) |
| Validation | `AssetCheck` (log) | passée | OK |
| Sauvegarde | `AssetTools.save_assets` | fichier `Content/Forge/Endurance/BP_AC_Endurance.uasset` mis à jour | OK |

**Remarque sur la sauvegarde** : après sauvegarde, `is_dirty` renvoie parfois `true` alors que le fichier est bien écrit. Cause non identifiée.

---

## 4. Test en jeu (Play-In-Editor)

**Mise en place** : acteur de test `BP_Forge_TestActor` (parent `Actor`) placé dans `DefaultLevel` de la copie, avec le composant `AC_Endurance` (`ActorTools.add_component`). Lancement avec `EditorAppToolset.StartPIE` (`bSimulate: false`).

**Lecture de l'état en PIE** : `ObjectTools.get_properties` sur `/Game/Levels/UEDPIE_0_DefaultLevel.DefaultLevel:PersistentLevel.BP_Forge_TestActor_C_0.AC_Endurance`. Ce chemin ne fonctionne qu'une fois la session PIE active.

| Mesure | Résultat |
|---|---|
| Esquives (5 appels au démarrage, 100 au départ) | OK, OK, OK, OK, **REFUSED** (lu dans `LogBlueprintUserMessages`) |
| Coût par esquive | 25 (100 → 75 → 50 → 25 → 0) |
| Refus à endurance insuffisante | Confirmé (0 < 25) |
| Régénération | Mesurée à **15 par seconde** (de 53,5 à 87,1 en 2,2 s), plafonnée à **100** |
| Délai de 1 s | Cohérent avec les mesures, **non mesuré précisément** |
| `OnDodgeRefused`, `OnExhausted`, `OnEnduranceChanged` | **Non vérifiés** : aucun écouteur, donc aucune observation |

Le code de test a été retiré de l'acteur après le test. `BP_AC_Endurance` est intact. L'acteur reste dans la carte de la copie.

---

## 5. Limites rencontrées

1. **Pas d'appel de fonction** : aucun outil ne permet d'appeler `TryDodge` depuis l'extérieur. Le test a dû passer par un graphe temporaire dans l'acteur.
2. **`write_graph_dsl` n'efface pas** un graphe existant : il faut supprimer les nœuds avec `delete_node`.
3. **Variables dans le DSL** : les variables ne sont pas visibles directement. Il faut lire chaque variable par son nœud `Variables|Default|GetX`.
4. **Pins et types** : `GetComponentByClass` demande le mot-clé `:ComponentClass`. Le cast vers un composant de classe Blueprint est `Utilities|Casting|CastToBP_AC_Endurance`.
5. **`set_properties`** : la valeur doit être une chaîne JSON (`"{\"DodgeCost\":25}"`). Le format `Nom=valeur` renvoie `false` mais n'est pas toujours sans effet.
6. **Sauvegarde individuelle** : un acteur placé dans une carte ne peut pas être sauvegardé seul (`save_actor` refuse). Il faut sauvegarder la carte entière.
7. **Compilation** : `compile_blueprint` ne renvoie pas le statut. Il faut lire le log (`LogScript`, `AssetCheck`).
8. **Démarrage manuel** du serveur à chaque session, et port 8001 à configurer dans la Forge.

---

## 6. Ce qui n'est pas fait

- **BlueprintMCP** : non installé, non testé. Le pont Epic suffit pour les opérations du prototype. BlueprintMCP reste un repli à évaluer si une limite bloquante apparaît.
- **Conversion du projet en 5.8** : non enregistrée dans `Fayel.uproject`.
- **Événements** : leur déclenchement reste à vérifier, avec un écouteur de test.
- **Délai de 1 s** : à mesurer précisément.
- **Stabilité** : le serveur n'a pas été testé après redémarrage de l'éditeur.

---

## 7. Décision pour la suite

Le pont **MCP Epic (`ModelContextProtocol` + `BlueprintTools`)** est retenu comme adaptateur principal pour le prototype. Il couvre les opérations nécessaires avec un seul outil officiel. BlueprintMCP reste un repli non testé.

Les opérations de la Forge doivent passer par la liste blanche définie dans [ARCHITECTURE.md](ARCHITECTURE.md), et la vérification doit toujours lire le résultat (relecture, log), jamais la seule réponse du serveur.
