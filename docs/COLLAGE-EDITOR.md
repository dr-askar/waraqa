# Multiple images on one sheet

The existing identity/composition editor now also offers a separate multi-image mode for 2–12 selected pages from one document. Entry points are the Tools screen, the identity editor's “more than two” option, and the document editor's compose button when selecting more than two pages. The two-sided identity and legacy two-page editor remain available.

Multi-image mode starts with an automatic grid. Stacked, side-by-side, a selectable column count under extra options, orientation, reverse order, margins, fit, crop, rotate and individual resize/move controls share the same engine. Numbered selectors identify the active image. Changing page selection returns to visual selection; re-entering rebuilds the layout, while returning from result preview preserves all manual edits. Originals are retained and saving appends one page.

All selected images are drawn and participate in alignment guides. Grid cells center the last partial row, support RTL order, and keep valid margins even for 12 columns. Preview source images larger than 1800 pixels are downsampled sequentially in multi-image mode to reduce memory usage; originals stay unchanged. A4 PDF/printing preserves the sheet orientation and uses no added margins, as for identity templates.

Validation covers non-overlapping layouts for 2/3/4/7/12 images in both orientations and RTL/LTR, invalid counts, all 12 distinct source colors present in the exported canvas, modifying a third image without moving others, reversing/stacking/grid, preview return, source fingerprints and the document selection entry point.
