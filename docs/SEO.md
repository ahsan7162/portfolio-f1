# SEO guidelines

Status and plan for search visibility of the portfolio. Audited against the built `dist/index.html`.

## Already done

- **Prerendered HTML:** `scripts/prerender.ts` renders the full page, so crawlers read it without running JavaScript.
- **Title:** "Muhammad Ahsan, Full Stack / AI Developer".
- **Meta description:** about 145 characters, leading with "full stack and AI developer".
- **Headings:** one `h1` and 10 section `h2`s in order.
- **Structured data:** JSON-LD `Person` (`jobTitle`, `worksFor`, `alumniOf`, `knowsAbout`, `sameAs` GitHub and LinkedIn).
- **Crawl file:** `public/robots.txt`.
- **Wording rule:** headings, nav labels, section ids and body copy use plain developer terms. F1 styling is visual only (`aria-hidden`).

## 1. Biggest gap: detailed content is not in the HTML

> **Status: 1b done.** `src/components/CrawlableDetails.tsx` prerenders all 16 breakdowns (3 jobs, 3 projects, 10 archive items) as `hidden="until-found"` blocks in the Work experience and Projects sections. All 52 long descriptions are now in `dist/index.html`. Find-in-page on that text opens the matching dialog. 1a (separate pages) is still the bigger long-term win.

44 of the 52 longer descriptions are not in the prerendered HTML:

- job breakdowns
- project write-ups
- archive items

They only exist inside the dialogs, which mount on click. Crawlers never click, so the specifics are invisible: the stack (Kafka, OpenSearch) and the measured results ("250 s to 30 s", "450+ agents").

Fix options, best first:

- **a. Separate pages** for each project and job (for example `/projects/ai-agent-platform`, `/experience/careem`).
  - Each page gets its own title, description and OG image, prerendered like the home page.
  - The dialogs stay as the quick view.
  - This is the biggest long-term win: each page can rank for its own search.
- **b. Cheaper:** keep one page, but prerender the dialog content in the HTML as collapsed `<details>` sections or visually hidden blocks under each job and project. The look is unchanged and crawlers see the text.

## 2. Must-do at launch (needs the domain)

1. **Set `SITE_URL`** in `src/content/data.ts` (or `SITE_URL=https://… npm run build`).
   > **Status: wired.** `scripts/prerender.ts` then writes `<link rel="canonical">`, `og:url`,
   > `og:image` (+ width, height, alt) and `twitter:image`; until it is set the build warns and
   > writes none of them. The **OG image** is `public/og.jpg` (1200×630: name, title, skills,
   > 450+ and the helmet), made with HyperFrames in `motion-lab/`. `twitter:card` is
   > `summary_large_image`.
2. **`public/sitemap.xml`**: list the home page (plus project and job pages if 1a is done). Reference it from `robots.txt`.
3. **Google Search Console:**
   - Verify the domain, submit the sitemap, and watch indexing and search terms.
   - Also add Bing Webmaster Tools (import from Search Console).
4. **Icons:** `apple-touch-icon` done (`public/apple-touch-icon.png`, from `motion-lab/touch-icon`). Still to do: a 32px PNG favicon and `site.webmanifest`.

## 3. Content: match what recruiters search

- **Location:** add location and "open to remote" to the copy and to the JSON-LD (`address`, `workLocation`). Targets searches like "senior full stack developer Karachi" or "Go developer Pakistan remote".
- **Stack terms:** use them in real sentences, not keyword lists: Golang, microservices, Kafka, FastAPI, LLM, AI agents.
- **Richer JSON-LD:**
  - per-job entries with dates (`hasOccupation` / `worksFor`)
  - projects as `CreativeWork` or `SoftwareSourceCode`, linked to GitHub where public
- **Case studies or a blog:** 2 to 3 short posts, for example "How we cut AI agent builds from 3 days to 10 minutes". They bring long-tail search traffic and give other sites a reason to link.

## 4. Backlinks and consistent identity

Put the portfolio link in all of these, with the same name and title everywhere:

- LinkedIn (Featured section and contact info)
- GitHub profile README and bio
- the CV PDF
- Stack Overflow and dev.to / Medium, if used

Matching profiles help Google treat them as one person and help you own searches for your name.

## 5. Page speed (Core Web Vitals)

- **Already good:**
  - The `h1` never waits on WebGL, so first render (LCP) isn't held up.
  - Layout shift is minimal.
- **Watch:** startup JS is about 124KB gzip plus 72KB of motion-core (GSAP and Lenis); three.js loads later, in idle time. This can still hurt responsiveness (INP) on mid-range phones.
- **Fixes:**
  - ~~Drop the `motion` library~~ done: every animation is GSAP.
  - Subset the fonts (Latin only, used weight and width ranges).
- **Check:** after deploy, run Lighthouse and PageSpeed Insights on the live URL. Target 90+ on mobile.

## 6. Small fixes

- **CV PDF:** set the document Title and Author metadata. Google indexes PDFs and shows that title.
- **Screenshots:** give project screenshots descriptive `alt` text when they are added (there are no `<img>` tags yet).
- **One domain:** redirect `www` and the host's default domain (for example `*.pages.dev`) to the main domain, so ranking is not split.

## Suggested order

1. ~~1b (make the content crawlable)~~ done; 1a optional later
2. Section 2 (launch essentials, once the domain exists)
3. Section 3 (content and structured data)
4. Section 4 (backlinks)
5. Re-check Section 5 on the live site
