# Resource publishing contract

`resource.schema.json` is the machine-readable schema. `resource-core.js` is the shared browser/build validator. No homepage edits are needed to add resources.

Required: `slug`, `title`, `category`, `description`, `body`. All are non-empty strings. Slugs use lowercase letters/numbers and single hyphens (maximum 100 characters). Titles: 160; categories: 60; descriptions: 500; body: 100,000.

Optional text fields: `badge`, `published_at` (ISO date), `format`, `read_time`, `image_url`, `image_alt`, `download_url`, `download_label`, `action_url`, `action_label`, `cta_label`, `cta_url`, `cta_eyebrow`, `cta_heading`, `cta_description`, `toc_title`, `toc_description`, `prompt_toolbar`, `prompt_copy_success`, `sources_intro`. Reading time is estimated at 200 words/minute if omitted.

Optional booleans: `published`, `featured`, `is_latest_reel`. `sort_order` is an integer, defaults to 100, and accepts negative values. `sources` is an array of `{label,url}`. Existing `id`, `created_at`, and `updated_at` survive editing. Only one published resource may be Latest Reel; the admin asks before replacing it. The builder rejects duplicates. Current selection: **none — owner must choose the Reel's slug**.

Imports default to drafts regardless of their supplied published value. Check “Publish now” in the importer to override; this affects local exports, not the live server. Unknown JSON fields are reported and ignored. Invalid types, executable URLs, invalid sources, duplicate slugs within an import, oversize imports, and unsupported asset locations are rejected. Existing slug replacements require explicit confirmation when saved.

Markdown supports paragraphs, ## and ### headings, ordered and unordered lists, bold, italic, and literal fenced `prompt` blocks. HTML is escaped. No JavaScript, templates, instructions, or arbitrary code are executed. Markdown links/images/tables and generic code blocks are not interpreted.

Simple Markdown front matter is supported between `---` lines with one `key: value` per line. Use JSON booleans/numbers; quoted strings and arrays must use JSON syntax. No YAML tags, aliases, nested mappings, or multiline scalar syntax. The Markdown after the closing delimiter becomes `body`.

Assets: use root-relative `/assets/file.webp` and `/downloads/file.pdf` paths. Images: JPG, JPEG, PNG, WebP, AVIF. Downloads: PDF, TXT, CSV, JSON, ZIP. Do not use data URLs or browser blobs in saved resources. Remote asset origins require explicit `allowedAssetOrigins` configuration plus matching exact CSP origins. They are not enabled by default. Missing/unverifiable assets force local saves to draft. The builder independently checks local assets for published resources.

Cards map old categories Travel Smarter → Travel, Study Smarter → Study, Free Prompt Pack → Creator Tools. Other categories are automatic. Latest Reel sorts first, then `sort_order`, then descending publication/creation date. `featured` is preserved for compatibility; normal mobile cards stay compact.

Static public URLs: `/guides/SLUG/`. Existing `/guides/?slug=SLUG` links still work. Run `node scripts/build-library.cjs` after changing the JSON to create matching covers and rebuild static pages and the sitemap. Thumbnail headlines/motifs live in `data/thumbnail-specs.json`; image paths are attached after generation. Original source-artwork paths are preserved in `data/original-resource-artwork.json`. Optional Supabase reads retain query URLs so new database resources do not require prebuilt files. Supabase is not configured in this project; authenticated writes remain disabled.

Events: listen for `window` CustomEvent `bramble:event`, whose `detail.name` is `newsletter_success`, `latest_reel_click`, `resource_click`, `download`, `share`, `prompt_copy`, `scorecard_copy`, or `work_with_nic`. No third-party analytics are added. Original UTM parameters and landing/resource context are retained in session storage and propagated on internal resource/signup links. The existing newsletter backend does not support attribution columns, so no extra fields are submitted or claimed to be stored there.
