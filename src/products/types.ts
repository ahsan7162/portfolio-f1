/** What a product is. Adding a kind here adds its filter, its stage frame and its Get-it slot. */
export type Kind = 'plugin' | 'app' | 'site';

/** `fact` names what a product's last fact says, for the detail page's facts grid. */
export const KINDS: Record<Kind, { label: string; plural: string; tag: string; fact: string }> = {
  plugin: { label: 'Plugin', plural: 'Plugins', tag: 'PLG', fact: 'Licence' },
  app: { label: 'Mobile app', plural: 'Mobile apps', tag: 'APP', fact: 'Runs on' },
  site: { label: 'Website', plural: 'Websites', tag: 'WEB', fact: 'Runs on' },
};

/** What sits on the product's stage: a live demo of the product, or a frame showing its screens. */
export type StageKind = 'pr-demo' | 'jira-demo' | 'openui-demo' | 'window' | 'phone' | 'browser';

export interface Screen { src: string; title: string; caption: string }

/**
 * A picture for a block: a real image, or (for a dummy product) one of the sample screens in the kind's frame.
 * Give an image its `width` and `height` in pixels when it is not 16:10, so its space is held while it loads.
 */
export type Media = { src: string; alt: string; width?: number; height?: number } | { sample: number; dark?: boolean };

/**
 * A detail page is a list of blocks, shown in the order given. Each product arranges its own page:
 * use any blocks, in any order, any number of times. To add a new kind of block, add its shape here
 * and its component to the registry in detail/blocks.
 * Blocks with a `label` are numbered down the page (01 Why, 02 How, …).
 */
export type Block =
  /** The product itself: its live demo, or its screens in the frame its kind calls for, with the hint under it. */
  | { type: 'stage' }
  /** One big sentence (wrap the words to accent in *asterisks*), a paragraph beside it, and optional short points. */
  | { type: 'statement'; label: string; head: string; body: string; points?: string[] }
  /** Plain paragraphs under an optional heading. */
  | { type: 'text'; label?: string; head?: string; body: string[] }
  /** A grid of things the product does: a short title and a sentence each. */
  | { type: 'features'; label: string; items: { title: string; body: string }[] }
  /** A short sequence shown as connected steps (how a request travels, how to set it up). */
  | { type: 'steps'; label: string; steps: { tag: string; title: string; body: string }[] }
  /** A few huge numbers, each with a label. */
  | { type: 'stats'; stats: { value: string; unit?: string; label: string }[] }
  /** Keyboard shortcuts: the keys and what they do. */
  | { type: 'keys'; label: string; note?: string; keys: { keys: string[]; does: string }[] }
  /** A sideways gallery. With no screens (a dummy product) it shows sample screens in the kind's frame. */
  | { type: 'screens'; label: string; screens: Screen[] }
  /** A film with its poster. `credit` is the licence line its music or sounds require. */
  | { type: 'film'; label: string; src: string; poster: string; duration: string; title: string; credit?: string }
  /** A screen on one side and words on the other. Alternate `side` down a page for a feature-by-feature walk. */
  | { type: 'split'; label?: string; side: 'left' | 'right'; media: Media; head: string; body: string; points?: string[] }
  /** Two or three screens fanned out, large: the product shown off, with an optional caption. */
  | { type: 'showcase'; label?: string; media: Media[]; caption?: string }
  /** Before and after, under a handle the visitor drags across. */
  | { type: 'compare'; label: string; before: Media; after: Media; beforeLabel: string; afterLabel: string; caption?: string }
  /** A grid of mixed tiles: a number, a short text, or a screen. */
  | {
      type: 'bento'; label: string;
      tiles: ({ kind: 'number'; value: string; unit?: string; label: string } | { kind: 'text'; title: string; body: string } | { kind: 'media'; media: Media; caption?: string })[];
    }
  /** A band of big moving words, to break up a long page. */
  | { type: 'marquee'; words: string[] }
  /** Scores out of a maximum, drawn as rings (performance, accessibility, a rating). */
  | { type: 'scores'; label: string; note?: string; scores: { value: number; max: number; label: string }[] }
  /** Releases or milestones in order. */
  | { type: 'timeline'; label: string; events: { when: string; title: string; body?: string }[] }
  /** Questions that open and close. */
  | { type: 'faq'; label: string; items: { q: string; a: string }[] }
  /** One large pull quote. */
  | { type: 'quote'; text: string; by?: string; role?: string }
  /** The product's own colours and typefaces. */
  | { type: 'palette'; label: string; colours: { name: string; hex: string }[]; faces?: { name: string; sample: string }[] }
  /** A piece of code with Copy. `title` is its file name or language. With `result`, the screen it produces sits beside it. */
  | { type: 'code'; label: string; note?: string; title: string; code: string; result?: Media; caption?: string }
  /** Plain facts as rows: what it needs, what it costs, where its data comes from. */
  | { type: 'specs'; label: string; rows: { name: string; value: string; note?: string }[] }
  /** Limits and things to know before installing. `warn` marks the ones that can bite. */
  | { type: 'notes'; label: string; items: { title: string; body: string; warn?: boolean }[] }
  /** A wall of names: what it works with, what it supports. */
  | { type: 'chips'; label: string; note?: string; items: string[] }
  /** How to get the product: an install command, store buttons, or a link. */
  | { type: 'get'; label: string; note: string; via: { kind: 'command'; command: string } | { kind: 'stores' } | { kind: 'link'; href: string; label: string } };

export type BlockOf<T extends Block['type']> = Extract<Block, { type: T }>;

export interface Product {
  slug: string;
  /** The product's own colour, taken from its interface (hex). The page is neutral; this colour appears only on the product's own stage and detail page. */
  brand: string;
  name: string;
  /** The name as it breaks on the featured stage, one entry per line (1 or 2 lines). */
  lines: string[];
  kind: Kind;
  year: number;
  /** Small facts shown beside the kind, e.g. "v0.3", "MIT", "iOS + Android". */
  facts: string[];
  /** One sentence on what it does. */
  line: string;
  /** The short hook under the name on the featured stage (a question or a claim). */
  hook: string;
  /** How to use the stage, e.g. "Click a blocker to clear it." */
  hint: string;
  stack: string[];
  /** A dummy product, there to show the layout. Shown with a "Sample" tag; remove before publishing. */
  sample?: boolean;
  /** Leads the main page with a full screen of its own. */
  featured?: boolean;
  stage: StageKind;
  /** Which of the sample-screen variants a dummy product shows (0, 1 or 2). */
  variant?: number;
  /**
   * The pictures on a `window`, `phone` or `browser` stage, in order: one screen for a window; two phone
   * screens for an app; the desktop page, then the phone page, for a website. A missing one is a sample screen.
   */
  shots?: Media[];
  /** A small screenshot for the catalogue's previews. Without one, the preview is a sample screen in the kind's frame. */
  thumb?: string;
  links: { label: string; href: string }[];
  /**
   * For search engines, on a real product. `title` is at most 60 characters and leads with what people
   * search for; `description` is about 150; `keywords` are the phrases the page should be found by, and
   * each must appear in the page's own copy.
   */
  seo?: { title: string; description: string; keywords: string[] };
  /** The detail page, top to bottom, between the hero and the link to the next product. */
  blocks: Block[];
}

/** The first block of a type on a product's page, e.g. its film or its Get-it block. */
export function findBlock<T extends Block['type']>(product: Product, type: T): BlockOf<T> | undefined {
  return product.blocks.find((b): b is BlockOf<T> => b.type === type);
}

/** The id a page's first film block carries, so links can land on it. */
export const FILM_ID = 'film';

/** Props every live demo takes. */
export interface DemoProps {
  /** True while this demo is the one on screen: only then may it listen to the keyboard. */
  active: boolean;
  /** Reports the demo's headline number whenever it changes (blockers left, open tickets). */
  onTally?: (value: number) => void;
}
