# Publish an AI-generated resource

Open **https://nicbuilds.com/admin/** after this update is deployed, or **http://127.0.0.1:8765/admin/** in the local preview. There is no public admin link and no hidden copyright-button gesture. This is a browser-local editor, not authentication or a server publisher. Newsletter records and secrets are never available here.

1. Click **Copy AI creation prompt**. Add your brief and give it to your AI. Ask for JSON using the supplied schema.
2. Click **Import AI Resource / backup**, paste the result (or select its JSON file), and choose **Validate and review**. Imports default to draft. Arrays open as a review queue: save each item, then choose **Next imported resource**.
3. Edit the text, category, labels, reading time and paths. Choose existing assets or select files for a temporary preview. The editor supplies the exact `/assets/` or `/downloads/` destination. Add the actual files to that repository folder; selection does not upload. Choose **Check asset paths**.
4. Choose **Preview changes** to see the mobile card, Latest Reel card and full guide using the public renderer. Choose Latest Reel if this matches the Reel you posted. Replacing an existing Latest Reel requires confirmation.
5. Choose **Published in export** (or leave unchecked for draft) and save. Missing asset paths keep the resource a draft. Copy its public URL.
6. Choose **Export all resources**. Replace `data/resources.json` with the downloaded file; keep all wanted resources in this array. Add the associated assets. Run **`node scripts/build-resources.cjs`** to validate the complete library, generate shareable guide pages and update the sitemap. Review the local site, then publish the repository through the usual release process. No homepage markup editing is needed.

The editing portion is designed for a short paste → review → save workflow. Repository file placement, build and deployment remain separate steps; this admin cannot safely perform them without a configured authenticated backend. “Published in export” never means “already live.”

## Backup and recovery

Export all resources before bulk work; store the backup outside the public repository if it contains private drafts. Import that JSON to restore resources through the same review queue. Existing slugs are never silently overwritten. **Export this resource** includes current editor values; **Export all** includes saved values only. Duplicate creates a new draft with a unique slug and clears Latest Reel status. Deletion requires confirmation and affects only this browser's workspace until a replacement JSON is deployed. Drafts in a public repository/JSON are not confidential, even though the UI hides them.

Clearing browser storage loses unexported work. The editor reports corrupt/unavailable storage rather than overwriting it. Public pages read deployed JSON (or configured Supabase); local edits appear only in the studio's preview.

## Optional shared database (not configured)

Public Supabase reads and the local JSON fallback remain supported. Shared writes remain disabled until owner-only authentication and RLS are implemented. Never add anonymous writes or a service-role key to browser code. Use the database dashboard for authorized changes. `supabase-schema.sql` is an unapplied migration, including optional metadata columns and a unique index for published Latest Reel resources. Resolve any duplicate Latest Reel records before applying it.

The CSP defaults to same-origin data and images. Reconnecting Supabase requires its exact origin in `connect-src`; external images also require their exact origin in `img-src` and `allowedAssetOrigins`. Do not use wildcard allowances.

## Images and social previews

Existing images have responsive WebP variants. Optional: `python3 scripts/prepare-assets.py` (Pillow required) rebuilds variants and 1200×630 share artwork from current resources. This is not required to publish: new images render with their original safe URL, and new guide share previews fall back to the branded homepage card. Run the page builder after preparing new social cards. The build and front end share guide/card logic; no separate preview design exists.
