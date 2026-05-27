# Plan d'implémentation - Rendu Markdown Global, Correction du Prompt de Candidature & Conseiller ATS IA Premium

Ce plan détaille l'approche technique pour :
1. **Formater le Markdown de manière Globale** : Rendre visuellement propre le Markdown partout où il est pris en compte, c'est-à-dire :
   - **Candidatures** : L'assistant IA de préparation d'entretien, le Dossier de compétences et les **Notes d'étape d'entretien** (Timeline).
   - **Édition de CV** : Le Résumé Professionnel, les descriptions d'**Expérience Professionnelle**, d'**Éducation** et la **Lettre de Motivation**.
   - Ajout d'onglets premium `[✏️ Saisie / 👁️ Aperçu]` (ou `[Edit / Preview]`) pour tous ces champs textuels d'édition.
2. **Résoudre le bug de candidature dans le prompt** : Garantir la parfaite correspondance de la candidature active et de ses états locaux (JD, Notes, CV snapshot) lors de la génération.
3. **Ajouter le Conseiller ATS Intelligent (IA)** : Intégrer un bouton premium de diagnostic IA comparant le CV actuel, la description d'offre cible, et le dossier de compétences (si détecté) pour lister ce qu'il faut ajouter ou supprimer dans le CV.

---

## 💡 Architecture & Composants Proposés

### 1. Composant MarkdownRenderer Premium (Garantie Anti-XSS & Sans Package Lourd)
* **Emplacement** : `src/components/Common/MarkdownRenderer.tsx` [NEW]
* **Rôle** : Parseur de Markdown réactif et ultra-rapide qui convertit les structures Markdown standard (`###`, `-`, `**`, `> [!NOTE]`, code blocks ```` ``` ````, inline `\``) en balises HTML stylisées avec **Tailwind CSS**. 
* **Avantages** : Zéro dépendance externe lourde, intégration native avec le thème sombre (dark mode) de l'application, et conformité totale avec la politique de style de `GEMINI.md`.

### 2. Saisie et Aperçu Markdown sur les Champs Édition de CV & Candidature
* **UI/UX** :
  - **Dossier de compétences** et **Notes d'étape d'entretien** : Sélecteur d'onglet premium `✏️ Saisie` / `👁️ Aperçu` pour prévisualiser instantanément le Markdown rédigé.
  - **Champs de CV** (Résumé, Description d'Expériences, Éducations, Lettre de Motivation) : Intégration de commutateurs réactifs `Edit` / `Preview` de façon discrète et esthétique en haut de chaque textarea.

### 3. Correction du Bug de Sélection & Prompt (ApplicationDetail)
* **Origine du bug** : 
  1. L'état `activeStepId` n'était pas réinitialisé lorsque le composant changeait d'application active (changement de `application.id`), ce qui provoquait une fuite d'états (state bleeding) où le bouton de préparation d'entretien pointait sur l'ID d'étape de l'ancienne candidature.
  2. Le prompt utilisait l'expression `application.jobDescription || jdText`, qui ignorait les modifications immédiates faites dans le textarea `jdText` avant que la sauvegarde débouncée ne se déclenche.
* **Résolutions** :
  - Ajouter un reset complet de `activeStepId` sur la première étape de la nouvelle candidature dans le `useEffect` synchronisant `application.id`.
  - Transmettre `activeResumeData` comme prop à `ApplicationDetail` depuis `App.tsx` pour servir de fallback intelligent si le snapshot `resumeDataUsed` est absent.
  - Utiliser systématiquement les états locaux réactifs (`jdText`, `dossierText`, `appNotes`) dans la construction des prompts IA.

### 4. Conseiller ATS Intelligent par IA (Audit de Correspondance)
* **Emplacement** : `src/components/Preview/OptimizationDashboard.tsx`
* **Rôle** : Fournir une analyse comparative d'adéquation poussée par l'IA Gemini.
* **Fonctionnalités** :
  - **Recherche automatique du dossier de compétences** : Si l'utilisateur a rédigé ou importé un dossier de compétences dans l'une de ses candidatures du tracker (`ats_applications_tracker` dans le localStorage) avec une offre similaire, le conseiller le récupère automatiquement pour enrichir le diagnostic.
  - **Plan de recommandation** : L'IA classe de manière rigoureuse les compétences/technos clés à **Ajouter** et à **Supprimer** (ou reformuler), avec des exemples concrets basés sur le profil du candidat.
  - **Interface premium** : Ajout d'une boîte de dialogue AI ATS Advisor collapsible sous la grille de diagnostic premium actuelle, avec animations d'analyse et rendu fluide en Markdown.

---

## Proposed Changes

### Component 1: Composants Communs & Formateurs

#### [NEW] [MarkdownRenderer.tsx](file:///c:/DATA/Code/ResumeBuilder/src/components/Common/MarkdownRenderer.tsx)
- Créer un parseur de Markdown réactif et ultra-robuste.
- Gérer les titres h2/h3/h4, les listes à puces (ordonnées/désordonnées), le texte en gras, les citations bloquées (`> `) et les blocs de code (avec surbrillance de syntaxe mono).

#### [MODIFY] [geminiApiService.ts](file:///c:/DATA/Code/ResumeBuilder/src/utils/geminiApiService.ts)
- Ajouter et exporter la fonction `generateAtsAdviceWithGemini(apiKey, systemPrompt, userPrompt)` pour interroger l'API Gemini 2.5 Flash lors des audits ATS.

---

### Component 2: Rénovation des Détails de Candidatures (Tracker)

#### [MODIFY] [ApplicationDetail.tsx](file:///c:/DATA/Code/ResumeBuilder/src/components/Tracker/ApplicationDetail.tsx)
- Importer `MarkdownRenderer` et `activeResumeData` en paramètre de Props.
- Réinitialiser l'état `activeStepId` vers le premier élément de la timeline de l'application chargée lors du changement de `application.id` dans le `useEffect`.
- Mettre en place un sélecteur d'onglet premium `dossierMode` (`'edit' | 'preview'`) pour le dossier de compétences (Master Dossier) afin de basculer instantanément entre la saisie textuelle et l'aperçu formaté en Markdown.
- Mettre en place un sélecteur d'onglet premium `notesMode` (`'edit' | 'preview'`) pour le bloc des **Notes de l'entretien**.
- Utiliser le composant `<MarkdownRenderer content={activeStep.aiPrep} />` dans le panneau IA de préparation.
- Assainir le prompt IA (`handleGeneratePrep`) en utilisant `jdText` à la place de `application.jobDescription` pour capturer la saisie en temps réel et utiliser le fallback `application.resumeDataUsed || activeResumeData`.

#### [MODIFY] [App.tsx](file:///c:/DATA/Code/ResumeBuilder/src/App.tsx)
- Passer le `resumeData` actuel dans la prop `activeResumeData` lors de l'instanciation de `<ApplicationDetail />` à la ligne 369.

---

### Component 3: Saisie/Aperçu Markdown sur le Formulaire de CV

#### [MODIFY] [ResumeForm.tsx](file:///c:/DATA/Code/ResumeBuilder/src/components/Form/ResumeForm.tsx)
- Importer `MarkdownRenderer`.
- Ajouter des états locaux réactifs de mode d'édition/aperçu :
  - `summaryMode` ('edit' | 'preview')
  - `coverLetterMode` ('edit' | 'preview')
  - `expModes` (Record<string, 'edit' | 'preview'>) pour chaque expérience.
  - `eduModes` (Record<string, 'edit' | 'preview'>) pour chaque éducation.
- Intégrer des boutons commutateurs esthétiques `[Edit / Preview]` en haut à droite des zones de texte correspondantes.
- Permettre le rendu formaté en Markdown en mode preview.

---

### Component 4: Audit Premium de CV (OptimizationDashboard)

#### [MODIFY] [OptimizationDashboard.tsx](file:///c:/DATA/Code/ResumeBuilder/src/components/Preview/OptimizationDashboard.tsx)
- Importer `MarkdownRenderer` et la fonction LLM correspondante.
- Ajouter la méthode `handleGenerateAiAdvice` qui interroge l'IA Gemini 2.5 Flash et intègre les dossiers de compétences trouvés en background.
- Intégrer visuellement le bloc `🔮 AI ATS Advisor` sous la section existante de diagnostic avec une animation de chargement et un rendu Markdown premium.

---

## Verification Plan

### Automated Tests
- Lancer `npm run test` pour s'assurer qu'aucun changement n'impacte les tests existants.

### Manual Verification
1. **Formatage Markdown (Candidatures)** : Lancer une préparation d'entretien IA dans le tracker. Vérifier que le guide d'entretien s'affiche bien formaté. Taper du Markdown dans le Dossier de compétences et les Notes d'entretien, cliquer sur le bouton "Aperçu", et vérifier le rendu visuel.
2. **Formatage Markdown (Éditeur de CV)** : Ouvrir les sections Résumé, Expérience ou Lettre de Motivation. Taper du Markdown (ex: des puces `-`, du gras `**`), cliquer sur "Aperçu" et vérifier que le style s'affiche de façon esthétique.
3. **Bug de Candidature** : Ouvrir deux candidatures différentes ayant des offres d'emploi distinctes. Lancer une génération de guide sur la seconde. Vérifier dans la console (ou via la réponse) que l'IA a rédigé des questions liées à la seconde offre d'emploi, sans aucune interférence.
4. **Audit ATS Intelligent** : Aller dans l'éditeur de CV, développer le "Diagnostic ATS Premium" et cliquer sur "Générer l'audit d'adéquation IA". Vérifier que l'IA produit une critique constructive détaillée.
