# Identity editor

The identity tool now uses the existing composition engine with an opt-in bounded A4 mode. The general two-page composition editor keeps its previous movement and sizing behavior.

- Front/back are selected visually before editing; each face can be moved, resized by touch or corner handle, cropped and rotated by 90 degrees.
- Stacked/side-by-side layout, portrait/landscape paper, swapping faces, width matching, centering and default reset are available as quick actions. Extra margins/spacing are grouped under a disclosure.
- Fit width/height, +/- size, and an 85.6 × 54 mm bounding template preserve source aspect ratio. The nominal size assumes a tight crop around the actual card, A4 output, and printing at 100%. No stretching or claim of automatic physical measurement.
- Identity frames remain inside the paper; moving near centers/other-face edges shows alignment guides.
- Preview preserves manual placement, rotation and crop when returning to edit. Saving appends a new derived page; source images are retained unchanged.
- Capturing front and back in camera ID mode now opens this editor before creating the combined page. Cancelling retains the two captured originals.
- Identity output is tagged so A4 PDF export and browser printing preserve the editor orientation and do not add margins that reduce the template. Letter/original export sizes remain deliberate alternatives.

Browser validation covers touch movement and resize, individual-face changes, crop/rotation, bounded fitting, card template dimensions, orientation and swap/equalize, preview return, source fingerprints, real PDF page geometry, and camera handoff. Existing merge/split and offline tests remain enabled.
