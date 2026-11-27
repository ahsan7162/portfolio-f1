// stub: proves the sandboxed canvas before the editor is built
import { createRoot } from 'react-dom/client';
import { products } from '../../data';

const product = products[2];
function Stub() {
  return (
    <iframe
      title="Canvas" src="/products/playground/frame.html" sandbox="allow-scripts" allow="" referrerPolicy="no-referrer"
      style={{ width: '100%', height: '100vh', border: 0 }}
      onLoad={e => {
        const w = e.currentTarget.contentWindow!;
        addEventListener('message', m => { if (m.source === w) (window as unknown as { log: unknown[] }).log.push(m.data); });
        setTimeout(() => w.postMessage({ t: 'render', product, keys: product.blocks.map((_, i) => String(i)), selected: 1 }, '*'), 300);
      }}
    />
  );
}
(window as unknown as { log: unknown[] }).log = [];
createRoot(document.getElementById('root')!).render(<Stub />);
