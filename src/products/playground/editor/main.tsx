// The playground's editor page (/products/playground). It runs no code from the page it builds; see Playground.tsx.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/base.css';
import '../../styles/playground.css';
import { Playground } from './Playground';

createRoot(document.getElementById('root')!).render(<StrictMode><Playground /></StrictMode>);
