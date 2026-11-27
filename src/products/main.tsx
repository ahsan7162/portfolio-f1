import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/base.css';
import { devAgent } from '@/lib/devAgent';
import { App } from './App';

/** The inside of the system page's block frame: one block on a page of its own, no shell around it. */
const BlockView = lazy(() => import('./system/BlockView').then(m => ({ default: m.BlockView })));
const view = new URLSearchParams(location.search).get('view') === 'block';

createRoot(document.getElementById('root')!).render(<StrictMode>{view ? <Suspense fallback={null}><BlockView /></Suspense> : <App />}</StrictMode>);
if (!view) devAgent();
