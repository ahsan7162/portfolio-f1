import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { ensureGsap } from './motion/gsap';
import { devAgent } from './lib/devAgent';

// Register GSAP before React runs any effect. Inside a section's useGSAP context instead,
// ScrollTrigger's startup timer would belong to that context, and StrictMode's second effect
// run (dev) would kill it: every `scrub: <seconds>` would lose its catch-up.
ensureGsap([DrawSVGPlugin, MotionPathPlugin]);

const root = document.getElementById('root')!;
const app = <StrictMode><App /></StrictMode>;
// Production HTML is prerendered (SEO); dev renders from scratch.
if (root.firstElementChild) hydrateRoot(root, app);
else createRoot(root).render(app);
devAgent();
