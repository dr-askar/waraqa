# Waraqa web workspace: implementation and review record

This update keeps the existing GitHub Pages PWA and Android wrapper origin. It does not replace the application package, signing certificate, database name (`waraqa`) or database version (2). No uploaded customer/reference photographs are committed. Browser test fixtures are generated locally.

## Architecture

`src/domain/documents.ts` declares document/page/category types and repository ports. `src/application/documents.ts` implements latest-revision append, category changes and guarded image replacement. `src/infrastructure/documents.ts` adapts the existing IndexedDB/encryption implementation. `src/presentation/workspace.tsx` implements quick actions, tools and navigation in React/TypeScript, built by Vite; output lives in `dist/workspace`. Legacy scanner, OCR, PDF, storage and existing editor remain integrated modules. This is an incremental migration, not a claim that every legacy function has been rewritten. `workspace-tools.js`, `advanced-imaging.js` and `document-reader.js` separate new UI flows, pixel processing and text-only operations. The existing OCR queue and revision guards remain intact.

## Capability status

| Requirement | Actual behavior | Boundary |
| --- | --- | --- |
| Home/document UI | Top search, four quick actions, recent 12 documents, all-documents navigation, tools/account screens, direct share, categories/folders | Existing grid/list preference retained; no account required |
| Detection/crop | Existing local OpenCV detection, auto-capture, crop and manual corners | No new detector model advertised |
| ID | Pick front/back or capture successive sides; append an A4 composite, retain both source pages | Layout uses fixed aspect-preserving positions; existing compose tool remains available for manual placement |
| Book | Adjustable estimated center line; capture mode appends two facing-page crops; optional cleaning in book tool | No curved-page dewarping model; center can be wrong and requires review |
| Mega scan | Combine ordered parts horizontally/vertically with adjustable overlap and output bounds | Manual layout, not projective automatic stitching or calibrated surveying |
| Time/location | User-edited timestamp, optional manually entered/GPS coordinates, preview and derivative page | GPS requested only on explicit click; coordinates become visible in the derivative/export |
| Passport | Center-cropped 35×45mm default, configurable sizes/count, 300dpi A4 sheet; PDF omits margins for these pages | No automatic face positioning/background removal or passport-compliance certification; print at actual A4 size |
| OCR | Existing 14-language local engine, six interface languages, direction handling, correction and durable jobs | Handwriting remains experimental printed-text recognition |
| Math | Rules extract simple equation-like lines from saved OCR; editable LaTeX rendered by KaTeX | Not a specialized image-to-LaTeX model, not reliable complex/handwritten mathematics |
| Document assistant | Extractive excerpts/search linked to original page; optional local WebLLM worker | Generative mode is experimental, requires WebGPU adapter and explicit large-model download; hardware inference quality has not been benchmarked in the headless environment |
| Cleanup | Previewable rectangle filled using average boundary color | Suitable for simple backgrounds; not semantic AI reconstruction or secure redaction |
| Signature | Existing visual signature/pen/redaction flow | No certificate-backed cryptographic PDF signing |
| Exports | Existing PDF/DOCX/XLSX/CSV/TXT/images; real PPTX slides with embedded page images; long JPEG segments | PPTX image content is not editable text; Word/table fidelity remains bounded by OCR; long images split at 12000px |
| Account/cloud | Optional encrypted local display name; existing Drive setup/sync exposed through account screen | No OAuth project/client is invented. Direct Google sync still requires owner-provided registration. Google connector credentials are never used for customers' app sync |
| System access | PWA manifest shortcuts and optional service-worker notification with scan/OCR actions | Browser support/permission determines availability and action count. No native widget or guaranteed closed-app background task is claimed |

## Data, dependencies and resource limits

New `category` defaults to `document` for older backups; categories survive serialization, encryption and restore. `profile` preferences participate in password rotation. Each derived page is appended through a latest-revision transaction, preserving concurrent document names/metadata. Preview results are guarded against a dismissed/replaced modal. Originals are retained and fingerprint-tested. GPS and model downloads are initiated explicitly. Generative prompts/text run inside a local worker; network requests are for model/library resources, not document inference APIs. Closing the reader terminates its worker.

PptxGenJS is pinned to 4.0.0. Its image-size dependency is overridden to patched 2.0.3; the shipped browser bundle uses page image data URLs. PPTX ZIP structure/media is tested. `npm audit --omit=dev --audit-level=high` passes. React, Vite, WebLLM, KaTeX and PPTX runtime notices are kept with generated bundles where supported. Llama 3.2 weights are optional third-party downloads subject to their own model license: https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct . WebLLM model configuration selects `Llama-3.2-1B-Instruct-q4f16_1-MLC`; reference https://webllm.mlc.ai/docs/ . Runtime availability does not establish model accuracy.

Mega output is limited to 18 million pixels/16000px per edge and 12 input parts. Long image generation bounds each segment to 12000px and processes source bitmaps sequentially. Other existing limits (80 pages/document and normalized image size) remain. Browser suspension still stops active web processing; saved OCR tasks resume on reopening.

## Validation

`npm run check` includes TypeScript and JS validation. `npm test` checks domain write guards and bounded text utilities. `npm run test:workspace` exercises real React navigation, source fingerprints, ID/book/stamp/passport/mega derivatives, saved OCR references, limited LaTeX, PPTX ZIP/media, long JPEG export, profile/category encryption, fake-camera successive ID/book capture, and offline restart. Existing UI, formats, folders, share, native bridge, OCR directions/multilingual OCR and advanced encryption/PDF/Drive regression suites remain enabled in CI. UI selectors were updated for intentional navigation changes, without removing assertions. Generative inference, physical-camera quality, Google account authorization and browser-specific notification registration still require the relevant hardware/account testing.
