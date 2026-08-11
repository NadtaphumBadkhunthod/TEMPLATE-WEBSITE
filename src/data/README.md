# Content

Everything the site shows lives in this folder. There is no database and no admin
panel — edit these files, put the matching files in `public/files/`, and rebuild.

> In `npm run dev` changes appear on reload. In production (`npm start`) the listing
> pages are prerendered and `public/` is served from a build-time manifest, so
> **rerun `npm run build`** after editing JSON or adding a file.

| File | Holds |
|---|---|
| `projects.json` | Every project |
| `categories.json` | The category list |
| `fields.json` | Custom spec fields shown on a project's detail page |
| `settings.json` | Site name, hero copy, contact details, SEO defaults |

Anything with a `{ "th": …, "en": … }` shape is per-language. A missing language falls
back to Thai.

---

## Attaching files to a project — quotations, brochures, anything

This is how a project publishes its quotation now; there is no enquiry form.

1. Put the file in the project's folder: `public/files/<folder>/`, where `<folder>` is
   the project's `folder` value in `projects.json`.
2. **Add an entry to that project's `attachments`.** Dropping the file in the folder is
   not enough on its own — the folder is storage, this list is what the site reads.
3. `npm run build`.

```jsonc
"folder": "phuket-traffic-control-centre",
"attachments": [
  {
    "file": "/files/phuket-traffic-control-centre/quotation.pdf",
    "label": { "th": "ใบเสนอราคา", "en": "Quotation" }
  },
  {
    "file": "/files/phuket-traffic-control-centre/brochure.pdf",
    "label": { "th": "โบรชัวร์", "en": "Brochure" }
  },
  {
    "file": "https://example.com/spec-sheet",
    "label": { "th": "สเปกฉบับเต็ม", "en": "Full spec sheet" }
  }
]
```

- `file` is a path from `public/` (starts with `/`) or a full `http(s)://` link.
- `label` is optional — the filename is used if you leave it out.
- Any format works. The type badge and the file size are read from the real file, and
  audio/video get a player as well as a download.
- A file listed but not yet present still renders; it just shows no size. Nothing breaks.

Thai filenames and spaces work — the path is stored exactly as the file is named and
encoded when it becomes a link. ASCII names still make for tidier URLs.

### The file does not show up

Check these in order — all four have to be true:

| Check | Where |
|---|---|
| The file is listed in `attachments` | `projects.json` — an empty `[]` shows nothing, however many files sit in the folder |
| `"status": "published"` | `projects.json` — a `draft` project has no page at all, so its files have nowhere to appear |
| `"isPublished": true` for the language you are viewing | `projects.json` → `translations.th` / `.en` |
| You rebuilt | `npm run build` (not needed in `npm run dev`) |

To check the file itself independently of any of that, open it directly:
`http://localhost:3000/files/<folder>/<filename>`. That works as soon as the file is on
disk and you have rebuilt, whatever the project's status — so a 200 there with nothing
on the page means the problem is one of the first three rows.

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
  "attachments": [],               // see above

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
