# Science &amp; Technology Expo — NST Fair skin

A bilingual (Thai / English) project-showcase site. **No database, no admin panel,
no backend** — every piece of content is a JSON file in `src/data/`, and every file
a project offers sits in `public/files/`.

**Identical in features to the sibling Smart City site; different skin.** It exists
to prove the template's premise — that a new site is new content plus new theme
tokens, not new code.

The site name is content, not code: it lives in `settings.json` under `site.name`,
per language.

Design rationale for the original database-backed build lives in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — kept as a record. The shipped app no
longer follows it: see [Why there is no database](#why-there-is-no-database).

---

## Quick start

Requires Node 20+. Nothing else — no Docker, no Postgres.

```bash
cp .env.example .env
npm install
npm run dev               # http://localhost:3100
```

Port 3100, not 3000, so this and the sibling Smart City site can run side by side.

| | |
|---|---|
| Public site | http://localhost:3100 → redirects to `/th` |
| Content | `src/data/*.json` — see [`src/data/README.md`](src/data/README.md) |
| Files | `public/files/<project folder>/` |

### Scripts

| Script | Does |
|---|---|
| `npm run dev` | Dev server on :3100. JSON edits and new files appear on reload. |
| `npm run build` / `npm start` | Production build and serve on :3100 |
| `npm run typecheck` | `tsc --noEmit` |

---

## Editing content

Everything is in [`src/data/`](src/data/) and documented in
[`src/data/README.md`](src/data/README.md):

| File | Holds |
|---|---|
| `projects.json` | Every project: status, categories, per-language title/summary/body/features, files |
| `categories.json` | Category list with per-language name and slug |
| `fields.json` | Custom spec fields shown on the detail page |
| `settings.json` | Site name, hero copy, contact details, SEO defaults, fallback policy |

> **In production, rerun `npm run build` after editing.** The listing pages are
> prerendered and Next serves `public/` from a build-time manifest, so neither JSON
> edits nor newly added files show up on a running `npm start` until you rebuild.
> `npm run dev` picks both up immediately.

---

## What's here

### Public site (`/[locale]/…`)

- **Homepage** — hero (from `settings.json`), featured projects, category browser
- **Project listing** — multi-select category filter, sorting, pagination. Filters are
  plain links, so they are shareable and crawlable and work without JS.
- **Project detail** — gallery, block description, feature list, specifications from
  `fields.json`, downloads, related projects
- **Brochure or text** — each project chooses how it reads: typed text, a brochure
  shown in its place, or the brochure with the text underneath
- **Downloads** — every file a project attaches is downloadable whatever the format
  (PDF, Word, Excel, PowerPoint, MP3, MP4, ZIP, …), with a file-type badge and its real
  size. Audio and video also get a native player.
- **Bilingual** — `/th/…` and `/en/…`, per-locale slugs, hreflang + canonical tags,
  language switcher that resolves to the right document rather than swapping the prefix
- `sitemap.xml` and `robots.txt`

---

## Why there is no database

The earlier build carried PostgreSQL, Prisma, an authenticated `/admin` panel, a media
library and a quote-request inbox. All of it was removed:

- **Content moved to JSON.** `src/lib/data.ts` reads the files; `src/lib/content.ts`
  keeps exactly the API the pages already used (`getProjects`, `getProjectBySlug`,
  `getCategoriesWithCounts`, …), so the pages were barely touched.
- **The admin panel is gone.** Editing means editing a JSON file and committing it.
- **"Request a quote" is gone** — no form, no `/quote` route, no inbox. A project that
  wants to publish its quotation attaches the document to itself instead, and it appears
  under Downloads on the project page.
- **Uploads are gone.** Files are put in `public/files/<project folder>/` by hand.

Two files that had been uploaded to the old media library but were never attached to any
project are preserved under `public/files/_unattached/` (`s2.pdf`, `s2.mp3`). Delete them
if they were only ever test uploads.

---

## How the flexible bits work

**Custom fields.** `fields.json` describes a spec field (key, type, per-language label,
choices, translatable or not). Values live under `custom` — on the project for shared
values, on the translation for per-language ones.

**Rich text.** Descriptions are a typed block array (`paragraph`, `heading`, `list`,
`quote`) rendered as real elements — nothing goes through `dangerouslySetInnerHTML`.

**Brochure instead of typed text.** `infoDisplay` (`text` / `brochure` / `both`) decides
what the detail page shows. Brochure entries carry their own `locale`, because the Thai
and English ones are different printed files. Choosing `brochure` with no brochure listed
falls back to the typed text rather than rendering an empty page.

**Attachments.** Any file type works — the badge and the audio/video player are derived
from the extension. A missing file degrades to "no size shown" rather than breaking the
page.

---

## Re-using this for another client

1. **Theme** — every colour, font and radius is in the `@theme` block at the top of
   `src/app/globals.css`. This skin follows the NST Fair site: electric blue
   `#0119b9` running into cyan `#29a4dd` and teal `#00a298` through 135° gradients,
   an orange `#f0901f` highlight, 16px cards, 100px pills, soft blue-tinted shadows
   instead of borders, and Kanit throughout (it covers Thai and Latin, so both
   locales share one vertical rhythm). Swap the `--color-brand-*` /
   `--color-accent-*` ramps and the whole site follows.

   Three contrast rules are baked into this palette, and breaking them is how you
   get invisible text:
   - `accent-500` is a **fill**, never text — it is 2.4:1 on white. Put `ink-900`
     on it (7.8:1). For orange text on a light background use `accent-700` (5.2:1).
   - `ink-500` is the **lightest grey usable as text** (5.2:1 on white, 4.8:1 on the
     band). `ink-50`–`ink-400` are backgrounds, borders and dividers only.
   - `.grad-brand` is **decorative only** — white text over its cyan stop is 2.8:1.
     Surfaces carrying white copy use `.grad-brand-text`, the same gradient under a
     32% navy scrim, which lifts the worst point to 5.1:1. Buttons use
     `.grad-action`, which ends on `aqua-700` so white clears 4.5:1 across the fill.
2. **Content** — replace `src/data/*.json` and `public/files/`.
3. **Domain vocabulary** — lives in `fields.json`, not in the code.
4. **Languages** — adding a third language means a key in each `translations` object,
   one entry in `src/i18n/config.ts`, and a message catalogue in `src/i18n/messages/`.

---

## Implementation notes

- **i18n is hand-rolled**, not `next-intl` — locale routing is a small middleware and
  the message catalogues are plain JSON.
- **The rich-text format is a typed block array**, not HTML — portable, and XSS-free by
  construction.
- **Listing queries filter and paginate in memory**, which keeps the per-locale publish
  and fallback rules in one readable place.
- **JSON is read per request and cached per render** (`react.cache`). On the prerendered
  routes those reads happen at build time.
- **`src/i18n/messages/*.json` still carry the old quote-form strings.** They are unused
  and harmless; delete them when you next touch the catalogues.

### Before production

- Set a real `NEXT_PUBLIC_SITE_URL` — `sitemap.xml` and canonical tags use it.
- Remember the rebuild rule above.
