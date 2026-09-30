// Plain numbers shared between DOM-side ScrollTriggers and the WebGL stage.
// GSAP writes them; the render loop reads them. No React state involved.
export const lapState = { progress: 0, active: false };
export const glState = { enabled: false, ready: false };
