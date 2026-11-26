// The main page's top bar: the section's name on the left, the two ways out on the right.
// One bar for the whole page, sticky and frosted (home.css .hd). It shows no count: it sits over the hero too.
import { HOME, Link } from '../router';
import { scrollToEl } from '../scroll';

export const toAll = () => scrollToEl(document.getElementById('all'));

export function SiteHeader() {
  return (
    <header className="hd pp-mono" data-sticky>
      <Link to={HOME} className="hd-brand"><i /><span><b>Ahsan</b> / Products</span></Link>
      <nav aria-label="Site">
        <button type="button" className="pp-mono" onClick={toAll}>All products</button>
        <a href="/">Portfolio ↗</a>
      </nav>
    </header>
  );
}
