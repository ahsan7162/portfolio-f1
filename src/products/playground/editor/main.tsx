// The playground's editor page (/products/playground). It runs no code from the page it builds; see Playground.tsx.
import { Component, StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/base.css';
import '../../styles/playground.css';
import { forget } from '../doc';
import { Playground } from './Playground';

/**
 * If the editor ever cannot draw, it says why instead of going blank. The page as it was before the change is still
 * kept in this browser: a change that fails to draw never reaches the save, so Reload brings back the last good one.
 */
class Keep extends Component<{ children: ReactNode }, { error: string | null }> {
  override state = { error: null as string | null };
  static getDerivedStateFromError(e: unknown) { return { error: e instanceof Error ? e.message : String(e) }; }
  override render() {
    if (this.state.error === null) return this.props.children;
    return (
      <main className="pg-crash" role="alert">
        <h1 className="pg-big">Something broke<span className="pg-stop">.</span></h1>
        <p className="pg-cap">The editor hit something it could not draw: {this.state.error}. The page as it was just before is kept in this browser.</p>
        <div className="pg-acts">
          <button type="button" className="pg-pill pg-pill--solid" onClick={() => location.reload()}>Reload</button>
          <button type="button" className="pg-pill" onClick={() => { forget(); location.reload(); }}>Start over</button>
        </div>
      </main>
    );
  }
}

createRoot(document.getElementById('root')!).render(<StrictMode><Keep><Playground /></Keep></StrictMode>);
