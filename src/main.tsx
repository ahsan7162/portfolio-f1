import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { ensureGsap } from './motion/gsap';

// Register GSAP before React runs any effect. Registered inside a section's useGSAP
// context instead, ScrollTrigger's startup timer belongs to that context, and StrictMode's
// second effect run (dev) kills it: every `scrub: <seconds>` then loses its catch-up.
ensureGsap();

const root = document.getElementById('root')!;
const app = <StrictMode><App /></StrictMode>;
// Production HTML is prerendered (SEO); dev renders from scratch.
if (root.firstElementChild) hydrateRoot(root, app);
else createRoot(root).render(app);
