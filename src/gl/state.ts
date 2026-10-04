// Plain numbers shared between DOM-side ScrollTriggers and the WebGL stage.
// GSAP writes them; the render loop reads them. No React state involved.
// progress: 0..1 through the lap (scrubbed to the pin). veil: 1 hides the lap scene
// behind its own background colour, 0 shows it; it fades the scene in and out.
// stage: the career stage whose card is showing (-1 before the first).
export const lapState = { progress: 0, veil: 1, active: false, stage: -1 };
