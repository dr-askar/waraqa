# Third-party components and assets

Apache 2.0 covers Waraqa's original source, not upstream copyrights. The build
creates `dist/licenses/THIRD_PARTY.txt` from installed production dependency license
and NOTICE files plus the following assets. Keep it with distributed web builds.
This is a conservative dependency inventory: some listed packages are build/Node
paths and are not executed in the browser. It is not a legal certification.

| Component | Upstream license / provenance |
| --- | --- |
| OpenCV.js 4.10 | Apache-2.0, `@techstark/opencv-js` |
| Tesseract.js / core | Apache-2.0; upstream Tesseract components retain notices |
| OCR fast/best/OSD models | Apache-2.0, `tesseract-ocr/tessdata_fast`, `tessdata_best`, `tessdata`; commits/hashes in `scripts/ocr-models.json` |
| PDF.js and QPDF WASM | Apache-2.0; preserve upstream files and bundled dependency notices |
| jsPDF, fflate, franc-min | MIT; franc license preserved in `assets/franc-LICENSE.txt` |
| React / React DOM, PptxGenJS, KaTeX | MIT; retain bundled transitive notices |
| WebLLM engine | Apache-2.0; model weights are separately licensed |
| Amiri font | SIL OFL 1.1, `assets/Amiri-OFL.txt` |
| Readex Pro font | SIL OFL 1.1, `dist/fonts/OFL.txt`, including reserved font name |
| KaTeX fonts | MIT, packaged KaTeX license |
| AndroidX core / webkit and runtime dependencies | Apache-2.0 and their upstream notices; Gradle resolves the complete graph |
| Handwriting test sample | Google Cloud documentation, CC BY 4.0, `checks/samples/NOTICE.md`; not an application OCR model |

Original local SVG/vector icons are project assets unless a file says otherwise.
Do not imply affiliation with Google, CamScanner or upstream library authors.
The optional WebGPU assistant downloads weights only on explicit user action;
review the selected model's own terms before redistributing weights. Models are
not relicensed by Waraqa or automatically included in the Android bundle.

The generated inventory reports missing upstream license texts explicitly rather
than inventing copyright holders. The `https` placeholder and old `tr46` package
declare ISC/MIT in npm metadata but omit standalone texts; they are Node dependency
paths, not intentionally copied browser engines. Re-audit them if a future bundle
starts including their code. Optional native canvas packages are test/server paths.

Maintainers must review license changes when updating dependencies. Preserve both
terms where a license says `AND` and select a compatible permissive option where
upstream allows `OR`; do not silently rewrite upstream license text.
