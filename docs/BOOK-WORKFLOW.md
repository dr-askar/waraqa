# Book scan: sources and ready pages

Book scan now creates a separate ready document rather than appending split pages to the source. Existing documents stay unchanged. Camera book mode saves captures in its own original-images document, with a live automatic/manual center line; Review opens the batch workflow. Native camera fallback also uses a separate source document.

The workflow accepts 1–40 selected source images (up to 80 results). Each image has independent horizontal/vertical division, a draggable seam, and adjustable four-corner bounds for each half. Local contrast proposes the gutter and OpenCV proposes outer bounds when reliable; manual editing is always available and detection is explicitly described as approximate. Detection can run independently for all images, or a chosen split template can be applied to the selected batch. Book curvature is not flattened.

Result review supports separate crop bounds, 90-degree rotation, filters/background cleaning and exclusion of either output page. Reading order is configurable. Source image bytes are never changed. Ready pages are normal editable/exportable document pages, with links to their source and a View originals/Edit split toolbar.

Book metadata stores source document/page IDs, image fingerprints, normalized split/settings and the logical half for each output page. It survives encrypted storage, backups and Drive serialization through validated decode. Resplitting atomically replaces the affected linked pages, preserves stable output IDs and unrelated pages, retains the previous image in undo history, and refuses a destination revision that changed during review. A missing/deleted source leaves the ready pages usable and reports the unavailable link.

Validation covers source isolation, separate camera batches, gutter override, independent/bulk division, corner cropping, rotation, exclusion, stable IDs without duplicates, undo history, encrypted/backup metadata, preserved source fingerprints, and existing OCR/export/offline workflows.
