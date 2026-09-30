import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import '@fontsource-variable/mona-sans/standard.css';
import '@fontsource-variable/mona-sans/standard-italic.css';
import '@fontsource-variable/jetbrains-mono/index.css';
import './index.css';
import App from './App';

const root = document.getElementById('root')!;
const app = <StrictMode><App /></StrictMode>;
// Production HTML is prerendered (SEO); dev renders from scratch.
if (root.firstElementChild) hydrateRoot(root, app);
else createRoot(root).render(app);
