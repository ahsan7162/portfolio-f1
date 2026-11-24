import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/base.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

// Dev only: lets a coding agent read and drive the page's ui-sdk components (AGENTS.md).
if (import.meta.env.DEV) void import('@ui-sdk/react/agent').then(({ createAgent }) => Object.assign(window, { __uiAgent: createAgent() }));
