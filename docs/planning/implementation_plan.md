# Implementation Plan - Restoring Light Theme & Polishing Premium Dark Theme

This implementation plan outlines the steps to resolve the theme issues in the ATS Resume Builder, ensuring a pristine Light Theme restoration and a unified, premium, highly readable Dark Theme experience.

## User Review Required

> [!IMPORTANT]
> **No changes will be made to the final PDF templates**: The white backgrounds and ATS-compliant selectable-text layout of the generated PDFs will remain 100% untouched.

## Proposed Changes

We will systematically replace all non-standard color variants (e.g. `gray-750`, `gray-850`, `gray-250`, `gray-955`, `gray-255`, `red-655`) with high-quality, standard Tailwind CSS gray scales (`gray-900`, `gray-800`, `gray-700`, `gray-100`, etc.). 

We will also explicitly define `bg-white text-gray-900` for light mode inputs and `dark:bg-gray-800 dark:text-gray-100` for dark mode inputs, ensuring perfect readability in both themes and eliminating "black on black" typing.

---

### [Component: Dark Theme & Styles Integration]

#### [MODIFY] [index.css](file:///c:/DATA/Code/ResumeBuilder/src/index.css)
* Ensure class-based toggling variant `@custom-variant dark (&:where(.dark, .dark *));` is perfectly set and integrated.

#### [MODIFY] [ResumeForm.tsx](file:///c:/DATA/Code/ResumeBuilder/src/components/Form/ResumeForm.tsx)
* Fix background container classes for **Experience** and **Education** sections to support explicit `bg-white dark:bg-gray-900` classes.
* Style the cards inside these sections using a premium, solid, non-transparent color: `bg-gray-50 dark:bg-gray-800` (instead of `bg-gray-50 dark:bg-gray-800/40`).
* Replace all inputs' style signatures to explicitly enforce `bg-white text-gray-900` for light theme and `dark:bg-gray-950 dark:text-gray-100` for dark theme. This prevents Chrome autofill or system defaults from causing black-on-black text.
* Standardize any other custom colors.

#### [MODIFY] [StyleControls.tsx](file:///c:/DATA/Code/ResumeBuilder/src/components/Preview/StyleControls.tsx)
* Replace `dark:border-gray-750`, `dark:border-gray-850` with standard `dark:border-gray-800` and `dark:border-gray-700`.
* Enforce explicit `bg-white text-gray-900 dark:bg-gray-850 dark:text-gray-100` styles on dropdown selectors.

#### [MODIFY] [VersionManager.tsx](file:///c:/DATA/Code/ResumeBuilder/src/components/Form/VersionManager.tsx)
* Correct input styles to match standard gray colors and support explicit light mode background.

#### [MODIFY] [AIRewriteModal.tsx](file:///c:/DATA/Code/ResumeBuilder/src/components/Form/AIRewriteModal.tsx)
#### [MODIFY] [AIGlobalOptimizeModal.tsx](file:///c:/DATA/Code/ResumeBuilder/src/components/Form/AIGlobalOptimizeModal.tsx)
#### [MODIFY] [ImportModal.tsx](file:///c:/DATA/Code/ResumeBuilder/src/components/Form/ImportModal.tsx)
#### [MODIFY] [SettingsModal.tsx](file:///c:/DATA/Code/ResumeBuilder/src/components/Form/SettingsModal.tsx)
* Perform full audit and standardizations on all modaux and popups to ensure absolute consistency.

#### [MODIFY] [ApplicationDetail.tsx](file:///c:/DATA/Code/ResumeBuilder/src/components/Tracker/ApplicationDetail.tsx)
#### [MODIFY] [ApplicationTracker.tsx](file:///c:/DATA/Code/ResumeBuilder/src/components/Tracker/ApplicationTracker.tsx)
* Fix text areas, inputs, buttons, and cards inside the application tracking dashboard to completely adapt to the new, premium dark theme color standard.

---

## Verification Plan

### Automated Tests
* Run `npm run build` to confirm zero compilation warnings.
* Run `npm run test` to verify all Vitest tests pass cleanly.

### Manual Verification
* The user will toggle the Moon/Sun header icon and observe:
  1. The Light Theme restoring to a pristine white sidebar background, gray-50 containers, white inputs, and black readable text.
  2. The Dark Theme instantly rendering slate-gray panels, rich-gray cards, recessed input containers, and perfectly readable, high-contrast text.
  3. Form inputs under Personal Information, Experience, and Education behaving flawlessly with no black-on-black text issues.
