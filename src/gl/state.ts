// Plain numbers shared between DOM-side ScrollTriggers and the WebGL stage.
// GSAP writes them; the render loop reads them. No React state involved.
// progress: 0..1 through the lap (scrubbed to the pin). veil: 1 hides the lap scene
// behind its own background colour, 0 shows it; it fades the scene in and out.
// stage: the career stage whose card is showing (-1 before the first).
export const lapState = { progress: 0, veil: 1, active: false, stage: -1 };

// The other way round: the render loop writes, the DOM reads. Where each sector starts
// on screen, projected from the 3D track every lap frame: per sector x and y in px from
// the canvas centre, then 1 if it is in view (else 0). `sink` (set by the Lap section)
// runs right after each lap frame, so the DOM marks move in the same frame as the track.
export const lapMarks: { xy: Float32Array; sink: (() => void) | null } = { xy: new Float32Array(0), sink: null };
