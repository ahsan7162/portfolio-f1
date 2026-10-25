// Plain numbers shared between the Lap's ScrollTriggers (they write) and the render loop
// (it reads). progress: 0..1 through the lap. veil: 1 hides the lap scene, 0 shows it.
// stage: the career stage whose card is showing (-1 before the first).
export const lapState = { progress: 0, veil: 1, active: false, stage: -1 };

// The other way round: where each sector starts on screen, projected every lap frame (per
// sector x and y in px from the canvas centre, then 1 if in view). `sink`, set by the Lap,
// runs right after each lap frame, so the DOM marks move in the same frame as the track.
export const lapMarks: { xy: Float32Array; sink: (() => void) | null } = { xy: new Float32Array(0), sink: null };
