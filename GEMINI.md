Development Standards & Project Rules
This document defines the strict development guidelines for the ATS Resume Builder project. Every code modification or new feature must comply with these principles.

1. Core Coding Principles
   SOLID & Clean Code:

Single Responsibility (SRP): One component = one function. Isolate logic for parsing, PDF generation, and form management.

Open/Closed: The template system must allow adding new designs without modifying the core rendering engine.

DRY (Don't Repeat Yourself): Centralize constants (colors, default labels, data schemas, and theme configurations).

KISS (Keep It Simple, Stupid): Prioritize code readability and maintainability over premature optimization.

2. Architecture & Design Patterns
   Custom Hooks: All business logic (form state, ATS score calculation, AI API calls) must reside in dedicated hooks (e.g., useResumeData, useAIOptimizer).

Strategy Pattern: Implement a common interface for resume templates to allow seamless switching between designs.

Controlled Components: Forms must be managed predictably using React State or a dedicated form library (e.g., react-hook-form).

3. Technical Standards & Stack
   Styling: Tailwind CSS only. Favor utility classes; avoid arbitrary values unless absolutely necessary.

PDF Generation: react-pdf/renderer is the only authorized library for export. Using screenshots, canvas, or images for PDF generation is strictly prohibited.

ATS Compliance:

Flat or simple hierarchical data structures.

No hidden text, zero-pixel fonts, or "white text" hacks.

Mandatory: Must produce a selectable text layer in the final PDF.

4. Testing & Quality Assurance
   Unit Testing: Every new feature (calculation logic, parsing helpers, date formatters) must include unit tests using Vitest.

Component Integrity: Critical components (especially the PDF renderer) must be tested to ensure data maps correctly to the UI.

Non-Regression: Before pushing changes, verify that:

Resume import logic is still functional.

PDF export produces a valid, readable file.

The Live Preview remains performant (no input lag).

5. Behavior Lock (Preservation Rules)
   Feature Preservation: Never modify or delete existing functionality unless explicitly requested in the prompt.

Schema Stability: If the CV JSON schema evolves, ensure backward compatibility or provide default values to avoid breaking existing user data.

Anti-Hack Policy: Never re-introduce phrases like "Moved to the next stage," "Approved," or any other artificial status labels within the generated PDF.

6. Documentation & Workflow
   JSDoc: Document complex functions, especially text parsing and AI prompt construction.

Semantic Commits: Use clear, descriptive messages (e.g., feat: add keyword analysis, fix: pdf padding on mobile).
