# Project Showcase Platform

A bilingual (Thai / English) project-showcase site with its own PostgreSQL database
and admin panel. Built to be re-skinned and re-used for other clients with the
same shape — change the database and the theme tokens, not the code.

Design rationale lives in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Quick start

Requires Node 20+ and Docker (for Postgres).

```bash
cp .env.example .env      # then edit AUTH_SECRET
npm install
npm run db:up             # starts Postgres on localhost:5433
npm run setup             # prisma generate + db push + seed
npm run dev               # http://localhost:3000
```

The seed creates demo content and an admin account:

| | |
|---|---|
| Public site | http://localhost:3000 → redirects to `/th` |
| Admin | http://localhost:3000/admin |
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
  admin-defined custom fields, price (five display modes), attachments, related projects
- **Pricing** — optional module, 404s when switched off
- **Request a quote** — fields come from the database, not the code
- **Bilingual** — `/th/…` and `/en/…`, per-locale slugs, hreflang + canonical tags,
  language switcher that resolves to the right document rather than swapping the prefix
- `sitemap.xml` and `robots.txt`

### Admin (`/admin`)

| Page | Does |
|---|---|
| Dashboard | New quotes, publish counts, per-language translation gaps |
| Projects | Full CRUD, TH/EN tabs with completeness dots, block editor, feature list, media, categories with a primary flag, price mode, custom fields, SEO, publish per language |
| Categories | CRUD with per-language name/slug/description; delete is blocked while in use |
| Media | Upload, browse, delete (blocked while referenced) |
| Quote requests | Inbox with search and status filter, detail view with the frozen field snapshot, status workflow, internal notes |
| Custom fields | Add project attributes without a migration — they appear in the editor and on the detail page |
| Pricing | Plan CRUD for the pricing module |
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

**Modules.** `settings.modules.*` gate the pricing page and the quote form. Turning
one off removes the route (404), the nav entry, and the related UI — verified end to end.

**Price.** `priceDisplayMode` is an enum, not a boolean: `hidden`, `exact`, `from`,
`range`, `on_request`. A boolean would have needed a migration the first time someone
asked for "from ฿X".

**Rich text.** Descriptions are stored as a typed block array (`paragraph`, `heading`,
`list`, `quote`) and rendered as real elements — nothing goes through
`dangerouslySetInnerHTML`, so admin-entered text cannot inject markup.

---

## Re-using this for another client

1. **Theme** — every colour, font and radius is in the `@theme` block at the top of
   `src/app/globals.css`.
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
  role split are in place.
- **Email notifications** — `settings.quote.notifyEmails` is stored and editable, but
  nothing sends yet. There is a marked `TODO` in `src/app/actions/quote.ts`.
- **Homepage/CMS page editing** — the `pages` tables exist; homepage copy is currently
  edited through Settings rather than a block-based page builder.
- **Rate limiting is in-process** — fine for one instance, needs Redis (or Cloudflare
  Turnstile) before running behind more than one node.
- **Image derivatives** — uploads are stored as-is; no thumbnail generation.

### Before production

- Set a real `AUTH_SECRET` (32+ random chars) and a real `NEXT_PUBLIC_SITE_URL`.
- Replace `prisma db push` with proper migrations (`prisma migrate dev`) and add the
  partial unique indexes currently created in `prisma/seed.ts` to the first migration.
- Move uploads to object storage — swap the adapter in `src/lib/media.ts`; the
  `/api/media/[id]` URLs stay the same.
- PDPA: the consent checkbox is on the form and its text is captured in the snapshot.
  Still needed are a retention/purge job and an audited CSV export.
