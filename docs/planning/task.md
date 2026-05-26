# Tasks - Resolving localStorage QuotaExceededError

This checklist tracks progress on implementing canvas-based photo compression, try-catch handlers for localStorage operations, and background migrations to resolve quota exceeded exceptions.

## Tasks Checklist

- [x] Create Image Compressor Utility
  - [x] Implement `src/utils/imageCompressor.ts` with canvas resizing.
  - [x] Support both `File` input and `Base64` string input (for background migration).
  - [x] Set max dimensions to 300x300 pixels and JPEG quality to 80%.

- [x] Integrate Compression in ResumeForm
  - [x] Update `src/components/Form/ResumeForm.tsx` to import the compressor.
  - [x] Modify `handlePhotoUpload` to run compression asynchronously.
  - [x] Add a loading state indicator when a photo is being processed to improve UX.

- [x] Safeguard localStorage in VersionManager & Add Migration
  - [x] Update `src/components/Form/VersionManager.tsx`.
  - [x] Wrap all `setItem` operations in a `safeSetLocalStorage` helper with try-catch.
  - [x] Add a visual notification alert or toast in FR and EN when localStorage is full.
  - [x] Implement background migration on mount: scan `ats_resumes_history` and compress any existing large Base64 photos.

- [x] Verify & Build
  - [x] Run `npm run build` to confirm everything builds successfully with zero compiler/lint errors.
  - [x] Run `npm run test` to verify all Vitest tests pass cleanly.
