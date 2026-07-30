# Science &amp; Technology Expo — NST Fair skin

A bilingual (Thai / English) project-showcase site with its own PostgreSQL database
and admin panel. **Identical in features to the sibling Smart City site; different
skin.** It exists to prove the template's premise — that a new site is a new
database plus new theme tokens, not new code.

The site name is content, not code: it lives in `settings.site.name` (per language)
and is editable from **Admin → Settings**.

Design rationale lives in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

### Runs alongside the sibling site

Nothing is shared — separate database, container, volume, port and uploads folder,
so both projects can run at the same time.

| | This site | Sibling Smart City site |
|---|---|---|
| Dev server | `http://localhost:3100` | `http://localhost:3000` |
| Postgres | `nstfair-db` on `5434` | `showcase-db` on `5433` |
| Database | `nstfair` | `showcase` |
| Uploads | `./uploads` (own folder) | its own folder |

### Placeholder content

The seed's branding copy is written in a science-expo register to suit the skin,
but it is **deliberately generic** — it is not the real NST Fair's name, logo or
programme. The visual style is borrowed; the identity is not. The demo projects are
the same six carried over from the sibling site. Replace all of it from the admin
panel; none of it is referenced in code.

---

## Quick start

Requires Node 20+ and Docker (for Postgres).

```bash
cp .env.example .env      # then edit AUTH_SECRET
npm install
npm run db:up             # starts Postgres on localhost:5434
npm run setup             # prisma generate + db push + seed
npm run dev               # http://localhost:3100
```

The seed creates demo content and an admin account:

| | |
|---|---|
| Public site | http://localhost:3100 → redirects to `/th` |
| Admin | http://localhost:3100/admin |
| Login | `admin@example.com` / `admin1234` |

Change those in `.env` (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`) before seeding,
or change the password from the admin panel afterwards.

### Scripts

| Script | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:up` / `db:down` | Start/stop the Postgres container |
| `npm run db:push` | Sync the Prisma schema to the database |
| `npm run db:seed` | Reset content tables and load demo data |
| `npm run db:studio` | Prisma Studio |

---

## What's here

### Public site (`/[locale]/…`)

- **Homepage** — hero (editable in Settings), featured projects, category browser, CTA
- **Project listing** — multi-select category filter, sorting, pagination. Filters are
  plain links, so they are shareable and crawlable and work without JS.
- **Project detail** — gallery, block description, feature list, specifications from
  admin-defined custom fields, downloads, related projects, enquiry call-to-action
- **Downloads** — every attachment is downloadable whatever the format (PDF, Word,
  Excel, PowerPoint, MP3, MP4, ZIP, …), with a file-type badge and size. Audio and
  video also get a native player
- **Request a quote** — fields come from the database, not the code
- **Bilingual** — `/th/…` and `/en/…`, per-locale slugs, hreflang + canonical tags,
  language switcher that resolves to the right document rather than swapping the prefix
- `sitemap.xml` and `robots.txt`

### Admin (`/admin`)

| Page | Does |
|---|---|
| Dashboard | New quotes, publish counts, per-language translation gaps |
| Projects | Full CRUD, TH/EN tabs with completeness dots, block editor, feature list, media, categories with a primary flag, custom fields, SEO, publish per language |
| Categories | CRUD with per-language name/slug/description; delete is blocked while in use |
| Media | Upload, browse, delete (blocked while referenced) |
| Quote requests | Inbox with search and status filter, detail view with the frozen field snapshot, status workflow, internal notes |
| Custom fields | Add project attributes without a migration — they appear in the editor and on the detail page |
| Settings | Module toggles, site/hero/contact/SEO copy per language, translation fallback policy |

The admin UI itself is bilingual too (toggle at the bottom of the sidebar), independent
of the content language being edited.

---

## How the flexible bits work

**Custom fields.** `Settings → Custom fields` writes a row to `field_definitions`
(key, type, per-language labels, choices, translatable or not). The project editor
generates inputs from it and values are stored in a `custom` JSONB column — on the
project for shared values, on the translation row for per-language ones. No migration
needed to add "Coverage area" or "Sensor type".

**Quote form.** `form_fields` + `form_field_translations` drive the public form.
Fields with `mapsToColumn` land in real columns (`name`, `email`, `phone`, `message`)
so the inbox can search them; everything else goes to `data` JSONB. Every submission
also stores a `fieldSnapshot` of the labels and types **as they were at submit time**,
so editing the form later never makes old submissions unreadable.

**Modules.** `settings.modules.*` gate optional parts of the site — currently the
quote form. Turning one off removes the route (404), the nav entry, and the related
UI — verified end to end. Adding a module back means a key here plus a route guard.

**No pricing.** This build carries no price or pricing-plan concept: no columns on
`projects`, no `pricing_plans` tables, no `/pricing` route. Projects are presented as
work, and the call to action is the enquiry form rather than a price. If a future site
built on this template needs prices, that is an additive change, not an un-picking one.

**Rich text.** Descriptions are stored as a typed block array (`paragraph`, `heading`,
`list`, `quote`) and rendered as real elements — nothing goes through
`dangerouslySetInnerHTML`, so admin-entered text cannot inject markup.

**Attachments.** Any file type is accepted. The upload check in
`src/lib/file-types.ts` is a *denylist*, not an allowlist, so a format nobody
anticipated needs no code change — only executables, installers, shell/script files
and server-side sources are refused, because a public download link is exactly how
such a file would get distributed. Office macro formats (`.xlsm`, `.docm`) are
refused with a message pointing at the macro-free equivalent. Set
`UPLOAD_ALLOW_ALL_TYPES=true` to lift this entirely, and `UPLOAD_MAX_MB` to change
the 100MB default.

Downloads are served through `/api/media/[id]`, which decides inline-vs-download per
type: images, audio, video and PDFs render in the tab, everything else is sent as an
attachment so an uploaded `.html` or `.svg` can never execute against this origin
(both also get a locked-down CSP). `?download=1` forces a download of anything.
The route supports HTTP Range requests, so seeking in an audio or video file works
instead of refetching from the start, and filenames are emitted with RFC 5987
encoding so Thai names survive.

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

   Base styles live inside `@layer base` on purpose. Unlayered CSS outranks every
   layered rule, so a heading colour declared outside a layer would override
   Tailwind's `text-white` and render dark-on-dark on the gradient hero.
2. **Content** — all in Postgres. A new site is a fresh database plus a seed.
3. **Modules** — toggle in Settings.
4. **Domain vocabulary** — lives in `field_definitions` rows, not in the schema.
5. **Languages** — the `locales` table is data. Adding a third language means adding a
   row, translation rows, and one entry in `src/i18n/config.ts` (plus a message
   catalogue in `src/i18n/messages/`).

---

## Implementation notes

A few places where this deviates from `docs/ARCHITECTURE.md`, all deliberate:

- **Auth is hand-rolled** (`jose` JWT in an httpOnly cookie + bcrypt), not Auth.js.
  For a single-role admin panel this is ~80 lines with no beta dependency, and it is
  edge-compatible so the middleware can gate `/admin` without touching the database.
- **i18n is hand-rolled**, not `next-intl` — locale routing is a small middleware and
  the message catalogues are plain JSON. Fewer moving parts for two locales.
- **The rich-text editor is a block editor**, not Tiptap. Same stored shape as the doc
  describes (portable JSON), much smaller client bundle, and XSS-free by construction.
- **Emails are camelCase in the database.** The design draft used `citext` and
  snake_case columns; the implemented schema normalises emails to lowercase in
  application code instead, so the database needs no extension step. Table names are
  snake_cased via `@@map`, column names are not — relevant if you write raw SQL
  (see the quoted identifiers in `prisma/seed.ts`).
- **Listing queries filter and paginate in memory.** This keeps the per-locale publish
  and fallback rules in one readable place and is fine for a few thousand projects.
  Move to SQL-level pagination if the catalogue gets much bigger.

### Not built yet

- **Admin user management UI** — the seeded admin is the only account; adding more
  means a seed edit or a direct insert. The `admin_users` table and the `admin`/`editor`
  role split are in place. The sidebar deliberately has no "Users" entry, since
  `/admin/users` does not exist — re-add it in `AdminNav.tsx` when it does.
- **Image thumbnails and video posters** — uploads are stored and served as-is, so a
  gallery of large photos ships full-size bytes to the browser.
- **Virus scanning** — uploads are type-checked, not scanned. Worth adding a
  ClamAV or hosted-scanner pass before accepting files from anyone but staff.
- **Email notifications** — `settings.quote.notifyEmails` is stored and editable, but
  nothing sends yet. There is a marked `TODO` in `src/app/actions/quote.ts`.
- **Homepage/CMS page editing** — the `pages` tables exist; homepage copy is currently
  edited through Settings rather than a block-based page builder.
- **Rate limiting is in-process** — fine for one instance, needs Redis (or Cloudflare
  Turnstile) before running behind more than one node.

### Before production

- Set a real `AUTH_SECRET` (32+ random chars) and a real `NEXT_PUBLIC_SITE_URL`.
- Replace `prisma db push` with proper migrations (`prisma migrate dev`) and add the
  partial unique indexes currently created in `prisma/seed.ts` to the first migration.
- Move uploads to object storage — swap the adapter in `src/lib/media.ts`; the
  `/api/media/[id]` URLs stay the same.
- PDPA: the consent checkbox is on the form and its text is captured in the snapshot.
  Still needed are a retention/purge job and an audited CSV export.
