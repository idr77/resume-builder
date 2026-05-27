# Plan d'implémentation - Notes Générales, Préparation Technique IA & Renommage ResumeT3ch

Ce plan détaille les modifications nécessaires pour :
1. Ajouter un champ **Notes Générales** dans le suivi des candidatures (du frontend React jusqu'à la base de données PostgreSQL).
2. Enrichir le prompt de l'**Assistant IA de Préparation** pour détecter les technologies mentionnées dans le titre de l'entretien (ex: *"Entretien technique Java Angular"*) ou la description de poste, et générer des révisions pratiques (questions, quiz, énigmes de type Codingame).
3. Renommer l'application de *"Créateur de CV ATS"* à **"ResumeT3ch"** (dans l'interface et l'onglet de navigation).

---

## 💡 Architecture & Flux de données

### 1. Champ Notes Générales (Candidature)
* **Frontend** : Ajout d'une propriété `notes` à l'interface `JobApplication` (`src/types/tracker.ts`).
* **UI/UX** : Rendu d'une carte d'édition premium sous le champ de Description de Poste, avec le même système d'auto-save débouncé anti-lag / enregistrement sur blur / sauvegarde manuelle.
* **Backend** : 
  - Ajout d'une colonne `notes` de type `TEXT` dans l'entité JPA `JobApplication.java`.
  - Liaison dans le contrôleur `ApplicationController.java` pour le stockage en DB.

### 2. Prompt IA Adaptatif (Préparation Technique)
* Le prompt IA envoyé à Gemini (ou via le proxy Cloud) sera enrichi de directives strictes de **détection technologique adaptative** :
  - Si le titre ou la description de l'étape mentionne des mots-clés techniques (*"technique"*, *"coding"*, *"codingame"*, *"test"*, etc.) ou liste des technos (*"Java"*, *"Angular"*, *"React"*) :
    1. **Sujets techniques & Méthodes à réviser** : L'IA générera des quiz de syntaxe, des notions d'architecture (ex: RxJS, Garbage Collection) et des questions typiques.
    2. **Codingame / Coding Quiz** : L'IA formulera des puzzles de code concrets, des exercices de débugging avec correction, basés sur le niveau requis.
  - Le prompt inclura également les nouvelles **Notes Générales** de la candidature pour enrichir le contexte (ex : questions posées lors du premier contact RH, salaire évoqué, culture d'entreprise).

---

## Proposed Changes

### Component 1: Frontend Changes

#### [MODIFY] [tracker.ts](file:///c:/DATA/Code/ResumeBuilder/src/types/tracker.ts)
- Ajouter le champ facultatif `notes?: string;` à l'interface `JobApplication`.

#### [MODIFY] [geminiApiService.ts](file:///c:/DATA/Code/ResumeBuilder/src/utils/geminiApiService.ts)
- Mettre à jour la signature de `generateInterviewPrepWithGemini` pour accepter le paramètre facultatif `applicationNotes?: string`.
- Injecter les notes de candidatures dans le prompt envoyé à l'IA.
- Ajouter des consignes strictes à l'IA pour s'adapter automatiquement si le titre de l'étape contient des technos ou le mot *"technique"* (génération d'exercices pratiques, questions d'architectures, quiz type Codingame).

#### [MODIFY] [ApplicationDetail.tsx](file:///c:/DATA/Code/ResumeBuilder/src/components/Tracker/ApplicationDetail.tsx)
- Gérer l'état local intermédiaire `appNotes` pour éviter les ralentissements clavier.
- Adapter l'auto-save, l'enregistrement au `onBlur` et la fonction `saveAllPendingChanges` pour prendre en compte le nouveau champ.
- Afficher un bloc d'édition premium *"📝 Notes Générales"* à droite sous le bloc *"Description de poste"*.
- Adapter l'assemblage du prompt dans `handleGeneratePrep` (cloud & local) pour injecter les notes générales et les consignes d'adaptabilité technique.

#### [MODIFY] [translations.ts](file:///c:/DATA/Code/ResumeBuilder/src/i18n/translations.ts)
- Remplacer `'ATS Resume Builder'` et `'Créateur de CV ATS'` par `'ResumeT3ch'`.

#### [MODIFY] [index.html](file:///c:/DATA/Code/ResumeBuilder/index.html)
- Changer le titre de la page de `<title>resumebuilder</title>` à `<title>ResumeT3ch - AI Editor & Interview Coach</title>`.

---

### Component 2: Backend Changes

#### [MODIFY] [JobApplication.java](file:///c:/DATA/Code/ResumeBuilder/backend/src/main/java/com/resumebuilder/entity/JobApplication.java)
- Ajouter le champ `private String notes;` avec l'annotation `@Column(columnDefinition = "TEXT")`.
- Générer les getters et setters correspondants.

#### [MODIFY] [ApplicationController.java](file:///c:/DATA/Code/ResumeBuilder/backend/src/main/java/com/resumebuilder/controller/ApplicationController.java)
- Mettre à jour `saveApplication` pour récupérer la valeur de `notes` depuis le payload JSON et l'appliquer à l'entité.
- Mettre à jour `syncLocalApplications` pour synchroniser le champ `notes` lors des imports en masse.

---

## Verification Plan

### Automated Tests
- Lancer `npm run test` pour s'assurer de l'intégrité de la suite de tests.

### Manual Verification
1. **Enregistrement des Notes Générales** : Ouvrir une candidature, taper des notes dans la section *"Notes Générales"*, sortir du champ (blur) ou cliquer sur *"Enregistrer"*. Rafraîchir, vérifier la persistance en local et en base de données.
2. **Entraînement Technique IA** : Créer une étape d'entretien nommée *"Entretien technique Java Angular"*. Lancer la génération IA. Vérifier que la section révision propose des questions d'architecture spécifiques à Java & Angular, et des exercices de coding/debugging pertinents.
3. **Renommer l'application** : Vérifier que le bandeau supérieur de l'application affiche *"ResumeT3ch"* et que l'onglet de navigation du navigateur indique *"ResumeT3ch - AI Editor & Interview Coach"*.
