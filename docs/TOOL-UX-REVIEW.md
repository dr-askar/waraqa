# Tool workflow review

The previous tool launcher implicitly used the current document, silently defaulted to the first page or the entire document, and offered numbered page menus with no visual selection. Preview opened a replacement dialog, losing the user's settings.

## Revised flow

1. Choose a document from a searchable list with cover image, folder and page count. The tools screen also has search and category filters. This does not navigate the underlying screen.
2. Choose pages from a thumbnail grid. No implicit selection. Single-page tools allow exactly one; identity requires two ordered choices labelled front/back; extended scan requires 2–12; reading and export tools accept a nonempty subset. Select all toggles for multi-page tools.
3. The settings panel identifies the source document and original page numbers. Changing pages returns to the selection with the current selection preserved. Changing pages resets tool-specific settings; this is distinct from returning from the result preview.
4. Derived-image preview stays in the existing dialog, preserving settings when returning to adjust them. It states the destination document. Saving appends a new page without changing originals.
5. OCR receives the chosen page IDs (including multiple pages), PDF/Office export starts with selected-only enabled, and PPTX/long-image/reader/math receive only the selected pages. Existing export controls still allow an intentional switch to all pages.

## Validation

Browser coverage verifies no silent default, document search, identity selection constraints and preserved page selection, returning from preview without losing the timestamp, destination name, subset OCR review and PDF/Office previews, subset PPTX export (two slides), full-document PPTX export, encrypted metadata, source fingerprints and offline/SW upgrade. Existing unit and browser suites remain enabled.

Processing stays local. Existing OCR, handwriting, mathematical extraction, book flattening and stitching limitations are unchanged. This update changes the workflow rather than the recognition engines.
