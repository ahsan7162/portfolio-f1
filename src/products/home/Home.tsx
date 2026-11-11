// The main page: the introduction, the featured products, then the whole catalogue.
import { products } from '../data';
import { KINDS } from '../types';
import { Catalogue } from './Catalogue';
import { Featured } from './Featured';
import { HeroCar } from './hero/HeroCar';
import '../styles/home.css';

const words = Object.values(KINDS).map(k => k.plural);

export function Home() {
  return (
    <>
      <main className="home">
        <HeroCar />
        <Featured items={products.filter(p => p.featured)} total={products.length} />
        <Catalogue items={products} />
      </main>
      <footer className="ftr">
        <div className="ftr-marquee pp-display" aria-hidden="true">
          {[0, 1].map(n => (
            <div className="ftr-track" key={n}>{words.flatMap(w => [<span key={w}>{w}</span>, <span key={`${w}-star`}>✳</span>])}</div>
          ))}
        </div>
        <div className="ftr-base pp-mono">
          <span>Built by Muhammad Ahsan</span>
          <span><a href="/">Portfolio ↗</a></span>
        </div>
      </footer>
    </>
  );
}
