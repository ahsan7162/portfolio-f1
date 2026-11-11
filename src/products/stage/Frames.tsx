import type { ReactNode } from 'react';
import { srcSet } from '../paths';
import type { Kind, Media } from '../types';
import '../styles/frames.css';

type FrameProps = { children: ReactNode; className?: string };

const cx = (base: string, extra?: string) => (extra ? `${base} ${extra}` : base);

const Dots = () => (
  <>
    <i className="frm-dot" />
    <i className="frm-dot" />
    <i className="frm-dot" />
  </>
);

/** Phone body, 300:620. Children fill the screen (use width/height 100%). */
export function PhoneFrame({ children, className }: FrameProps) {
  return (
    <div className={cx('frm-phone', className)}>
      <div className="frm-phone-body">
        <div className="frm-phone-screen">
          <div className="frm-fill">{children}</div>
        </div>
        <div className="frm-phone-island" />
      </div>
    </div>
  );
}

/** Browser window; the page area is 16:10 and children fill it. */
export function BrowserFrame({ children, url, className }: FrameProps & { url: string }) {
  return (
    <div className={cx('frm-browser', className)}>
      <div className="frm-browser-body">
        <div className="frm-bar">
          <Dots />
          <div className="frm-url"><span>{url}</span></div>
        </div>
        <div className="frm-page">
          <div className="frm-fill">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Desktop app window; content is unpadded and in flow, so an image sets the height. */
export function WindowFrame({ children, title, className }: FrameProps & { title: string }) {
  return (
    <div className={cx('frm-window', className)}>
      <div className="frm-window-body">
        <div className="frm-bar">
          <Dots />
          <div className="frm-title">{title}</div>
        </div>
        <div className="frm-window-content">{children}</div>
      </div>
    </div>
  );
}

const Bar = ({ w, mod }: { w: string; mod?: string }) => (
  <i className={cx('frm-b', mod && mod.split(' ').map((m) => `frm-b--${m}`).join(' '))} style={{ width: w }} />
);

const Rows = ({ ids }: { ids: string[] }) => (
  <>
    {ids.map((id) => (
      <div className="frm-row" key={id}>
        <i />
        <div>
          <Bar w="68%" mod="strong" />
          <Bar w="40%" />
        </div>
      </div>
    ))}
  </>
);

const Tabs = ({ on }: { on: number }) => (
  <div className="frm-tabs">
    {['a', 'b', 'c', 'd'].map((id, i) => (
      <i key={id} className={i === on ? 'frm-on' : undefined} />
    ))}
  </div>
);

const Nav = () => (
  <div className="frm-nav">
    <i />
    <i className="frm-b" />
    <i className="frm-b" />
    <i className="frm-b" />
  </div>
);

const CHART = [34, 52, 28, 70, 44, 100, 58];

/** The frame a kind of product is shown in: an app in a phone, a website in a browser, a plugin in a desktop window. */
export function KindFrame({ kind, slug, title, className, children }: FrameProps & { kind: Kind; slug: string; title: string }) {
  if (kind === 'app') return <PhoneFrame className={className}>{children}</PhoneFrame>;
  if (kind === 'site') return <BrowserFrame className={className} url={`${slug}.example`}>{children}</BrowserFrame>;
  return <WindowFrame className={className} title={title}>{children}</WindowFrame>;
}

/** What goes inside a frame: a real image, or a dummy product's sample screen. Fills the frame. */
/** How wide a screenshot is drawn: about half the window on a wide screen, nearly all of it on a narrow one. */
export const SHOT_SIZES = '(min-width: 900px) 50vw, 92vw';

export function Shot({ media, kind }: { media: Media; kind: Kind }) {
  return 'src' in media
    ? <img className="frm-shot" src={media.src} srcSet={srcSet(media.src)} sizes={SHOT_SIZES} alt={media.alt} width={media.width} height={media.height} loading="lazy" decoding="async" />
    : <SampleScreen kind={kind} variant={media.sample} dark={media.dark} />;
}

/** Abstract placeholder interface. Fills its frame; 1em inside = 1% of its width. */
export function SampleScreen({ kind: of, variant, dark }: { kind: Kind; variant: number; dark?: boolean }) {
  // Only apps and websites have sample screens drawn; a plugin borrows the website's.
  const kind = of === 'app' ? 'app' : 'site';
  const v = ((variant % 3) + 3) % 3;
  return (
    <div className={`frm-s frm-${kind}${dark ? ' frm-s--dark' : ''}`} aria-hidden="true">
      <div className="frm-si">
        {kind === 'app' && v === 0 && (
          <>
            <Bar w="42%" mod="strong t" />
            <div className="frm-gap" />
            <Bar w="26%" />
            <div className="frm-gap" />
            <div className="frm-gap" />
            <div className="frm-card" />
            <Rows ids={['a', 'b', 'c', 'd', 'e']} />
            <Tabs on={0} />
          </>
        )}
        {kind === 'app' && v === 1 && (
          <>
            <Bar w="34%" mod="strong t" />
            <div className="frm-gap" />
            <Bar w="52%" mod="strong h" />
            <div className="frm-chart">
              {CHART.map((h) => (
                <i key={h} className={h === 100 ? 'frm-on' : undefined} style={{ height: `${h}%` }} />
              ))}
            </div>
            <Rows ids={['a', 'b', 'c', 'd']} />
            <Tabs on={1} />
          </>
        )}
        {kind === 'app' && v === 2 && (
          <>
            <div className="frm-img" />
            <div className="frm-gap" />
            <div className="frm-gap" />
            <Bar w="64%" mod="strong t" />
            <div className="frm-gap" />
            <Bar w="92%" />
            <div className="frm-gap" />
            <Bar w="84%" />
            <div className="frm-gap" />
            <Bar w="58%" />
            <div className="frm-btn" />
            <Tabs on={2} />
          </>
        )}
        {kind === 'site' && v === 0 && (
          <>
            <Nav />
            <div className="frm-grow" />
            <Bar w="86%" mod="strong h" />
            <Bar w="58%" mod="strong h" />
            <div className="frm-pill" />
            <div className="frm-tiles">
              <i />
              <i className="frm-acc" />
              <i className="frm-dk" />
            </div>
          </>
        )}
        {kind === 'site' && v === 1 && (
          <>
            <Nav />
            <div className="frm-edit">
              <div>
                <Bar w="94%" mod="strong h" />
                <Bar w="70%" mod="strong h" />
                <Bar w="82%" mod="strong h" />
                <div className="frm-gap" />
                <Bar w="96%" />
                <Bar w="88%" />
                <Bar w="60%" />
                <div className="frm-gap" />
                <div className="frm-pill" />
              </div>
              <div className="frm-img" />
            </div>
          </>
        )}
        {kind === 'site' && v === 2 && (
          <>
            <Nav />
            <div className="frm-pills">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="frm-tiles frm-grid">
              <i />
              <i />
              <i className="frm-acc" />
              <i />
              <i />
              <i />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
