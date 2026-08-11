# Smart City Research Center

A bilingual (Thai / English) project-showcase site. **No database, no admin panel,
no backend** — every piece of content is a JSON file in `src/data/`, and every file
a project offers sits in `public/files/`. Built to be re-skinned and re-used for
other clients with the same shape: change the JSON and the theme tokens, not the code.

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
npm run dev               # http://localhost:3000
```

| | |
|---|---|
| Public site | http://localhost:3000 → redirects to `/th` |
| Content | `src/data/*.json` — see [`src/data/README.md`](src/data/README.md) |
| Files | `public/files/<project folder>/` |

### Scripts

| Script | Does |
|---|---|
| `npm run dev` | Dev server. JSON edits and new files appear on reload. |
| `npm run build` / `npm start` | Production build and serve |
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

What this buys: the site deploys anywhere that can serve static output, has no
migrations, no credentials, no backup story, and no upload attack surface. What it
costs: content edits are a developer task and a redeploy, not a login.

---

## How the flexible bits work

**Custom fields.** `fields.json` describes a spec field (key, type, per-language label,
choices, translatable or not). Values live under `custom` — on the project for shared
values, on the translation for per-language ones. Adding "Coverage area" or
"Sensor type" is a JSON edit, not a schema change.

**Rich text.** Descriptions are a typed block array (`paragraph`, `heading`, `list`,
`quote`) rendered as real elements — nothing goes through `dangerouslySetInnerHTML`,
so content cannot inject markup.

**Brochure instead of typed text.** Not every project gets written up — plenty already
exist as a designed PDF or a set of page images. `infoDisplay` (`text` / `brochure` /
`both`) decides what the detail page shows.

Brochure entries carry their own `locale`, because a brochure is a printed artefact —
the Thai and English ones are different files, not one file with different captions.
The lookup is: this language's pages → pages marked as shared (`"locale": null`) → the
default language's, with a visible notice when a reader is shown another language's
brochure. A PDF is embedded in the browser's own viewer; image pages are stacked.
Either way every page also gets an explicit download, since an embedded PDF is
unreliable on mobile and unusable to a screen reader.

Choosing `brochure` with no brochure listed **falls back to the typed text** rather
than rendering an empty page, so the setting is safe to set before the file exists.

**Attachments.** Any file type works — the badge and the audio/video player are derived
from the extension. A missing file degrades to "no size shown" rather than breaking the
page, so you can list a file before it is delivered.

---

## Re-using this for another client

1. **Theme** — every colour, font and radius is in the `@theme` block at the top of
   `src/app/globals.css`. The current skin follows Thailand's Smart City Office site:
   navy `#173b6b` with a yellow `#fff200` accent, squared corners, Kanit for headings
   and Sarabun for body text (both cover Thai and Latin, so the two locales share one
   vertical rhythm). Swap the `--color-brand-*` and `--color-accent-*` ramps and the
   whole site follows. Note that `accent-400` is a fill and rule colour only — it fails
   contrast as text on white, so keep it behind navy text rather than on it.
2. **Content** — replace `src/data/*.json` and `public/files/`.
3. **Domain vocabulary** — lives in `fields.json`, not in the code.
4. **Languages** — adding a third language means a key in each `translations` object,
   one entry in `src/i18n/config.ts`, and a message catalogue in `src/i18n/messages/`.

---

## Implementation notes

- **i18n is hand-rolled**, not `next-intl` — locale routing is a small middleware and
  the message catalogues are plain JSON. Fewer moving parts for two locales.
- **The rich-text format is a typed block array**, not HTML — portable, and XSS-free by
  construction.
- **Listing queries filter and paginate in memory.** This keeps the per-locale publish
  and fallback rules in one readable place and is fine for a few thousand projects.
- **JSON is read per request and cached per render** (`react.cache`), so a page render
  reads each file once. On the prerendered routes those reads happen at build time.
- **`src/i18n/messages/*.json` still carry the old quote-form strings.** They are unused
  and harmless; delete them when you next touch the catalogues.

### Before production

- Set a real `NEXT_PUBLIC_SITE_URL` — `sitemap.xml` and canonical tags use it.
- Remember the rebuild rule above, or run the site with `next dev` behind a proxy if you
  genuinely need live content edits.
