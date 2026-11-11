// The main page's top bar: the section's name on the left, the two ways out on the right.
import { HOME, Link } from '../router';
import { scrollToEl } from '../scroll';

export const toAll = () => scrollToEl(document.getElementById('all'));

/** `total` is shown beside "All products" where the bar sits among the products; the hero leaves it out. */
export function SiteHeader({ total }: { total?: number }) {
  return (
    <header className="hd pp-mono">
      <Link to={HOME} className="hd-brand"><i /><span><b>Ahsan</b> / Products</span></Link>
      <nav aria-label={total === undefined ? 'Site' : 'Site, beside the products'}>
        <button type="button" className="pp-mono" onClick={toAll}>All products{total === undefined ? '' : ` (${total})`}</button>
        <a href="/">Portfolio ↗</a>
      </nav>
    </header>
  );
}
