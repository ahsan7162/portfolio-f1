import type { LiveName } from './stage/names';

/** What a product is. Adding a kind here adds its filter, its stage frame and its Get-it slot. */
export type Kind = 'plugin' | 'app' | 'site';

/** `fact` names what a product's last fact says, for the detail page's facts grid. */
export const KINDS: Record<Kind, { label: string; plural: string; tag: string; fact: string }> = {
  plugin: { label: 'Plugin', plural: 'Plugins', tag: 'PLG', fact: 'Licence' },
  app: { label: 'Mobile app', plural: 'Mobile apps', tag: 'APP', fact: 'Runs on' },
  site: { label: 'Website', plural: 'Websites', tag: 'WEB', fact: 'Runs on' },
};

/** What sits on the product's stage: a live demo of the product, or a frame showing its screens. */
export type StageKind = 'pr-demo' | 'jira-demo' | 'openui-demo' | 'dash-demo' | 'md-demo' | 'window' | 'phone' | 'browser';

export interface Screen { src: string; title: string; caption: string }

/**
 * A picture for a block: a real image, (for a dummy product) one of the sample screens in the kind's
 * frame, or a live screen: one drawn in code, by name, that builds itself in when its block shows it.
 * Give an image its `width` and `height` in pixels when it is not 16:10, so its space is held while it loads.
 */
export type Media =
  | { src: string; alt: string; width?: number; height?: number }
  | { sample: number; dark?: boolean }
  | { live: LiveName; alt: string };

/** What every live screen takes. It fills the box it is given and never changes that box's size. */
export interface LiveProps {
  /**
   * True while the screen is the one being shown. It builds itself in each time this turns true
   * (once it is in view), and with reduced motion is simply in its finished state.
   */
  active: boolean;
  /** What the screen shows, for a screen reader: the drawing itself is decorative. */
  alt: string;
  /** For a screen taken apart (the anatomy block): the part to show, and which of its states. */
  part?: string;
  state?: number;
}

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
  /** One stage that rotates through cases: what was asked, and the screen that came of it. A tab per case; the active tab fills as its timer. */
  | { type: 'cases'; label: string; note?: string; cases: { tab: string; ask?: string; media: Media; caption?: string }[] }
  /**
   * A list of points beside one screen: the active point's screen shows, and the list steps on by itself.
   * `focus` is the part of the screen the step is about: `x` and `y` from 0 to 1, and how far to ease in (`zoom`, 1.2 to 1.6).
   */
  | { type: 'tour'; label: string; head?: string; steps: { title: string; body: string; media: Media; focus?: { x: number; y: number; zoom: number } }[] }
  /**
   * The product's live demo playing itself through named scenes, a tab per scene. The visitor can take
   * over at any point. Takes the place of `stage` on a page; the demo must list its scenes in SCENES (stage/names.ts).
   * `head` is a short line set large as the scene plays ("Ask for it."). `cost` is what the scene costs, a number
   * then its words ("1 model call"): the number rolls in when the demo spends it, or pulses if it is 0.
   */
  | {
      type: 'scenes'; label: string; note?: string; scenes: { tab: string; head?: string; cost?: string; ask?: string; caption?: string }[];
      /**
       * A last tab where the scenes stop and the visitor drives, with goals to do. The demo dispatches a bubbling
       * `scene-goal` (detail: the goal's id) when one is done, and `scene-input` for each key it answers; the block counts both, and clicks.
       */
      turn?: { tab: string; head: string; caption?: string; goals: { id: string; text: string; keys?: string }[] };
    }
  /** A wall of names: what it works with, what it supports. */
  | { type: 'chips'; label: string; note?: string; items: string[] }
  /** How to get the product: an install command, store buttons, or a link. */
  /** One edit, and the file each way of saving it leaves: changed lines marked and counted, the picked way in the product's colour. */
  | { type: 'diff'; label: string; head?: string; note?: string; edit: string; file: string; before: string; ways: { name: string; after: string; pick?: boolean }[] }
  /** A wall of named checks that run in turn: each passes, or is refused by design with its reason; a total lands at the end. */
  | { type: 'checks'; label: string; head?: string; note?: string; steps: string[]; items: { name: string; pass: boolean; detail: string; proof?: string }[]; total?: { value: string; label: string } }
  /** A hand of cards that fans out; pick one and it opens full size. `source` is the text behind a card, shown by the second of `views`. */
  | { type: 'deck'; label: string; head?: string; note?: string; views?: [string, string]; cards: { title: string; body: string; media: Media; source?: string }[] }
  /**
   * One screen or object drawn large and taken apart: its parts numbered above it. Hover previews a part, a click
   * pins it, and a pinned part plays its `states` in the drawing. A live screen marks each part with data-part="<id>"
   * and draws the `part` and `state` it is given; an image gives each part an `at` box (0 to 1). `start` is the part pinned first.
   */
  | {
      type: 'anatomy'; label: string; head?: string; note?: string; media: Media; start?: string;
      parts: { id: string; name: string; body: string; states?: string[]; at?: { x: number; y: number; w: number; h: number } }[];
    }
  /**
   * Where the product's requests go: its `stops` set large along one line, and `runs` (tabs that rotate) that send a
   * light along their hops while each hop says what it carries. `never` is a last stop, struck through: where nothing goes.
   */
  | {
      type: 'route'; label: string; head?: string; note?: string; never?: string;
      stops: { name: string; where: string; holds?: string[] }[];
      runs: { name: string; hops: { from: number; to: number; says: string }[] }[];
    }
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
  /**
   * The scene to play by itself (0-based), for a demo that lists scenes in SCENES. Each time it changes
   * the demo plays that scene from its start. Undefined: the visitor drives, and the demo keeps the
   * state it is in. A demo without scenes ignores it.
   */
  scene?: number;
}
