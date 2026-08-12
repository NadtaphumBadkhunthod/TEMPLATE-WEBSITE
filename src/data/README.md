# Content

Everything the site shows lives in this folder. There is no database and no admin
panel — edit these files, and put the files a project offers in `public/files/`.

> **Adding a file needs no rebuild.** Downloads are read off the disk per request.
> **Editing JSON does**, for the homepage and the project list: those pages are
> prerendered, so rerun `npm run build` after changing them. (In `npm run dev`
> everything appears on reload.)

| File | Holds |
|---|---|
| `projects.json` | Every project |
| `categories.json` | The category list |
| `fields.json` | Custom spec fields shown on a project's detail page |
| `file-groups.json` | Headings for the download sub-folders, per language |
| `settings.json` | Site name, hero copy, contact details, SEO defaults |

Anything with a `{ "th": …, "en": … }` shape is per-language. A missing language falls
back to Thai.

---

## Attaching files to a project — quotations, brochures, anything

This is how a project publishes its quotation now; there is no enquiry form.

**Drop the file into the project's folder. That is the whole job.**

`public/files/<folder>/`, where `<folder>` is the project's `folder` value in
`projects.json`. Everything in there is listed on the project page and is
downloadable. No JSON to edit, no rebuild.

### Sub-folders become headings

Sort the files however you like; each sub-folder turns into its own section:

```
public/files/phuket-traffic-control-centre/
├── สรุปโครงการ.pdf              → listed under "ไฟล์ทั่วไป"
├── brochure/
│   ├── brochure-th.pdf          → listed under "โบรชัวร์"
│   └── brochure-en.pdf
├── quotation/
│   └── ใบเสนอราคา.pdf            → listed under "ใบเสนอราคา"
└── รายงานประจำปี/
    └── 2568.pdf                 → listed under "รายงานประจำปี"
```

A sub-folder named in `file-groups.json` gets that heading in each language. Any other
name is shown exactly as you typed it — which is why a Thai folder name needs no setup
at all. Files sitting loose at the top level are grouped under "ไฟล์ทั่วไป".

To add a bilingual heading of your own, add a line to `file-groups.json`:

```jsonc
{ "warranty": { "th": "ใบรับประกัน", "en": "Warranty" } }
```

Notes:

- Any format works. The type badge and the file size are read from the real file, and
  audio/video get a player as well as a download button.
- Thai filenames and spaces are fine. The name you see on the page is the filename
  without its extension, and it is what the browser saves the file as.
- Files starting with `.` are skipped, so `.gitkeep` never shows up.
- The cover, the gallery images and the brochure are already shown elsewhere on the
  page, so they are not repeated in the download list.

### Adding a label, or a link to somewhere else

Only needed for the two cases the folder cannot express: renaming a file on the page
without renaming it on disk, and linking to a file that is not yours. Put those in the
project's `attachments`, and they are merged into the same list:

```jsonc
"folder": "phuket-traffic-control-centre",
"attachments": [
  {
    "file": "/files/phuket-traffic-control-centre/quotation/q-2568-11.pdf",
    "label": { "th": "ใบเสนอราคา (ฉบับล่าสุด)", "en": "Quotation (latest)" }
  },
  {
    "file": "https://example.com/spec-sheet",
    "label": { "th": "สเปกฉบับเต็ม", "en": "Full spec sheet" }
  }
]
```

- `file` is a path from `public/` (starts with `/`) or a full `http(s)://` link.
- A file listed here that is also on disk is listed once, with this label, under the
  sub-folder it lives in.
- External links get an "open link" button instead of a download.

### The file does not show up

Check these in order — all three have to be true:

| Check | Where |
|---|---|
| The file really is under `public/files/<folder>/` | `<folder>` is the project's `folder` value in `projects.json`, which is not always the same as its slug |
| `"status": "published"` | `projects.json` — a `draft` project has no page at all, so its files have nowhere to appear |
| `"isPublished": true` for the language you are viewing | `projects.json` → `translations.th` / `.en` |

To check the file itself independently of any of that, open it directly:
`http://localhost:3000/download/files/<folder>/<filename>`. That works as soon as the
file is on disk, whatever the project's status — so a 200 there with nothing on the page
means the problem is one of the last two rows.

---

## `projects.json`

```jsonc
{
  "id": "81b03304-…",              // any unique string; used for React keys and related-project matching
  "status": "published",           // "published" | "draft" | "archived" — only published shows
  "sortOrder": 1,                  // ascending
  "publishedAt": "2026-07-14T13:18:40.995",
  "isFeatured": true,              // shows in the homepage highlights
  "infoDisplay": "text",           // "text" | "brochure" | "both"
  "folder": "phuket-traffic-control-centre",   // its folder under public/files/

  "categories": [
    { "id": "<category id from categories.json>", "isPrimary": true }
  ],

  "cover": null,                   // or { "file": "/files/…/cover.jpg", "alt": { "th": "…", "en": "…" } }
  "gallery": [],                   // [{ "file": …, "alt": { … } }] — cover is shown first automatically
  "brochure": [],                  // [{ "file": …, "label": { … }, "locale": "th" | "en" | null }]
  "attachments": [],               // usually empty — the folder is scanned; see above

  "custom": { "connectivity": "fiber" },   // non-translatable custom field values

  "translations": {
    "th": {
      "slug": "ศูนย์ควบคุมจราจรอัจฉริยะภูเก็ต",   // unique per language; the URL
      "title": "ศูนย์ควบคุมจราจรอัจฉริยะ จังหวัดภูเก็ต",
      "summary": "…",                       // card text and meta description
      "body": [                             // typed blocks, not HTML
        { "type": "paragraph", "text": "…" },
        { "type": "heading",   "text": "…" },
        { "type": "list",      "items": ["…", "…"] },
        { "type": "quote",     "text": "…" }
      ],
      "features": [{ "text": "…" }],        // bullet list beside/under the body
      "custom": { "coverage_area": "…" },   // translatable custom field values
      "seoTitle": null,
      "seoDescription": null,
      "isPublished": true                   // per language: Thai can be live while English is drafted
    },
    "en": { … }
  }
}
```

`brochure[].locale` is which printed language that file is: `"th"`, `"en"`, or `null`
for one file used in every language.

---

## `categories.json`

```jsonc
{
  "id": "…",
  "parentId": null,
  "sortOrder": 0,
  "isActive": true,
  "translations": {
    "th": { "slug": "ระบบจราจรและขนส่ง", "name": "ระบบจราจรและขนส่ง", "description": null },
    "en": { "slug": "smart-mobility", "name": "Smart Mobility", "description": null }
  }
}
```

A project links to a category by `id`. Filter links match a slug in **any** language, so
a link shared from the Thai site still filters correctly when opened in English.

---

## `fields.json`

Spec rows on the detail page.

```jsonc
{
  "entity": "project",
  "key": "coverage_area",          // the key to use inside a project's "custom"
  "dataType": "text",              // text | number | boolean | date | select | url
  "isTranslatable": true,          // true = value lives in translations[].custom, false = project.custom
  "isFilterable": false,
  "showOnCard": false,
  "showOnDetail": true,
  "isActive": true,
  "sortOrder": 0,
  "options": { "unit": "km²" },    // "choices" for select types
  "translations": {
    "th": { "label": "พื้นที่ให้บริการ", "helpText": null, "choiceLabels": {} },
    "en": { "label": "Coverage area",   "helpText": null, "choiceLabels": {} }
  }
}
```

For `dataType: "select"`, `choiceLabels` maps the stored value to what a reader sees:
`{ "fiber": "ไฟเบอร์ออปติก" }`.

---

## `settings.json`

Only the keys you want to override — anything missing falls back to `defaultSettings`
in `src/lib/settings.ts`.

```jsonc
{
  "site":    { "name": { "th": "…", "en": "…" }, "tagline": { … } },
  "hero":    { "title": { … }, "subtitle": { … }, "ctaLabel": { … } },
  "contact": { "email": "…", "phone": "…", "address": { … } },
  "seo":     { "defaultTitle": { … }, "defaultDescription": { … } },
  "i18n":    { "contentFallback": "fallback" }   // "fallback" = show Thai when English is missing; "hide" = 404
}
```
