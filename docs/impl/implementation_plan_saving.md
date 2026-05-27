# Plan d'implémentation - Enregistrement Manuel & Automatique (CVs & Candidatures)

Ce plan détaille l'implémentation d'une sauvegarde manuelle et d'un enregistrement automatique intelligent (débouncé pour éviter la surcharge réseau) pour les CVs et les candidatures, tout en préservant le fallback offline `localStorage` et la connexion Cloud PostgreSQL.

---

## 💡 Explication : Les candidatures et les versions de CV sont-elles liées ?

**Oui et non ! C'est une architecture hybride intelligente :**

1. **Au moment de la création** : Une candidature effectue un **snapshot (cliché) complet** du CV actif actuel (`resumeDataUsed: ResumeData`). C'est extrêmement robuste : même si vous modifiez vos CVs ou supprimez des versions plus tard dans le gestionnaire, la candidature garde en mémoire l'exacte copie du CV envoyé à l'entreprise.
2. **Indépendance par la suite** : Une fois la candidature créée, ses modifications (notes d'entretien, étapes de recrutement, dossier de compétences) n'ont **aucun impact** sur votre CV principal, et inversement.

> [!NOTE]
> **Pourquoi optimiser l'enregistrement actuel ?**
> Actuellement, l'édition de longs textes (comme les notes d'entretien ou le dossier de compétences) dans le tracker envoie une requête API à **chaque lettre tapée**, ce qui sature la base de données (si Cloud) ou le localStorage (si local) et peut causer un léger décalage de saisie. 

---

## 🛠️ Fonctionnalités proposées

### 1. Gestionnaire de CV (Sauvegarde ciblée & Auto-save)
* **Suivi de la Version Active** : Ajouter un état `activeVersion` (contenant `{ id, name }`) dans `App.tsx` pour suivre quel CV est en cours de modification.
* **Bouton d'enregistrement manuel** : Dans le `VersionManager.tsx`, ajouter un bouton premium *"Enregistrer le CV courant"* pour écraser/mettre à jour la version active sans devoir recréer une nouvelle version avec un nouveau nom.
* **Auto-save débouncé** : Mettre en place un hook d'effet débouncé (1,5 seconde d'inactivité de frappe) dans `App.tsx` pour sauvegarder silencieusement les modifications du CV actif en DB Cloud (ou localStorage) et afficher un discret indicateur *"Enregistré"* ou *"Sauvegarde..."*.

### 2. Candidatures (Bouton d'enregistrement & Évitement de surcharge)
* **Bouton Global d'enregistrement** : Ajouter un bouton premium *"Enregistrer la candidature"* avec une icône de disquette dans le bandeau supérieur de `ApplicationDetail.tsx`.
* **Évitement de surcharge d'écriture (Anti-Lag)** : Remplacer l'enregistrement à chaque caractère par une mise à jour locale fluide et déclencher la sauvegarde en DB / localStorage uniquement dans ces 3 cas :
  1. Un **Auto-save débouncé** (1,5s après l'arrêt de la saisie).
  2. Au **Blur** (quand l'utilisateur clique en dehors d'un champ de saisie de notes ou de dossier).
  3. Par un clic sur le bouton manuel *"Enregistrer la candidature"*.
* **Indicateur de statut visuel** : Afficher un indicateur visuel discret du statut de synchronisation (*"Modifications enregistrées"*, *"Enregistrement en cours..."*).

---

## Proposed Changes

### Component 1: Frontend updates

#### [MODIFY] [App.tsx](file:///c:/DATA/Code/ResumeBuilder/src/App.tsx)
- Ajouter l'état `activeVersion` (`{ id: string; name: string } | null`).
- Lors de l'initialisation (`initializeData`), charger le premier élément de l'historique (Cloud ou local) et le définir comme la version active par défaut.
- Transmettre `activeVersion` et `setActiveVersion` en props à `ResumeForm` et `VersionManager`.
- Ajouter un effet d'auto-save débouncé pour `debouncedResumeData` :
  ```typescript
  // Auto-save CV to active version
  useEffect(() => {
    if (!activeVersion) return;
    const saveActive = async () => {
      try {
        const online = await apiService.checkHealth();
        if (online && apiService.isLoggedIn()) {
          await apiService.saveVersion(activeVersion.name, debouncedResumeData);
        } else {
          // Local storage overwrite
          const stored = localStorage.getItem('ats_resumes_history');
          if (stored) {
            const history = JSON.parse(stored);
            const updated = history.map((v: any) => v.id === activeVersion.id ? { ...v, data: debouncedResumeData } : v);
            localStorage.setItem('ats_resumes_history', JSON.stringify(updated));
          }
        }
      } catch (err) {
        console.error("Auto-save failed", err);
      }
    };
    saveActive();
  }, [debouncedResumeData, activeVersion]);
  ```

#### [MODIFY] [VersionManager.tsx](file:///c:/DATA/Code/ResumeBuilder/src/components/Form/VersionManager.tsx)
- Recevoir `activeVersion` et `setActiveVersion` depuis les props.
- Mettre à jour `activeVersion` lors du chargement (`handleLoad`), de la duplication (`handleDuplicate`), ou de la création de version (`handleSave`).
- Ajouter un bouton d'enregistrement manuel direct *"Enregistrer le CV courant"* à côté du champ de création de version. Ce bouton met à jour la version actuellement sélectionnée sans changer de nom ni ajouter de doublon.

#### [MODIFY] [ApplicationDetail.tsx](file:///c:/DATA/Code/ResumeBuilder/src/components/Tracker/ApplicationDetail.tsx)
- Gérer un état local pour les notes d'entretien (`notesText`) et le dossier de compétences (`dossierText`) pour éviter les re-renders et appels API à chaque frappe de touche.
- Ajouter un bouton premium **"Enregistrer la candidature"** (avec l'icône `Save`) dans la barre supérieure.
- Ajouter un auto-save débouncé de 1.5s ou déclencher l'enregistrement au `onBlur` des champs de texte.
- Ajouter un badge discret de statut de sauvegarde (`"Enregistré"` vs `"Sauvegarde..."`).

---

## Verification Plan

### Automated Tests
- Lancer la suite de non-régression Vitest via `npm run test` pour s'assurer que les imports, exports et helpers restent fonctionnels.

### Manual Verification
1. **Sauvegarde directe du CV** : Charger une version de CV dans le gestionnaire, faire une modification de texte, puis cliquer sur *"Enregistrer le CV courant"* ou attendre 2 secondes. Rafraîchir la page et valider que les modifications ont bien été persistées dans la même version (et non dans une nouvelle).
2. **Anti-surcharge Tracker** : Ouvrir les détails d'une candidature. Taper du texte rapidement dans le champ de notes. Vérifier que la saisie reste instantanée et fluide. Observer l'indicateur de statut passer à *"Enregistrement en cours..."* puis *"Enregistré"* 1.5s après l'arrêt de la saisie.
3. **Synchronisation Cloud DB** : Lancer Docker et vérifier via les logs de `docker compose` qu'une seule requête POST vers `/resumes/versions` ou `/applications` est émise par modification (au lieu d'une par lettre tapée).
4. **Fallback offline** : Arrêter le backend et vérifier que les écritures et auto-sauvegardes locales dans `localStorage` se déroulent parfaitement avec le même indicateur de statut.
