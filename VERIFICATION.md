# Newsletter verification — September 23, 2026

## Provisioning

- Created **Bramble Management Newsletter Subscribers**, worksheet **Subscribers**.
- Verified Restricted sharing with only the owner listed.
- Added the seven required headers, froze row 1, styled headers, set email cells
  to plain text, and formatted timestamps. Visually inspected in Google Sheets.
- Created the bound **Bramble Management Newsletter Signup** Apps Script.
- Owner completed Google’s authorization warning and consent.
- Ran setup successfully, stored the Sheet ID privately in Script Properties,
  and removed the temporary public setup wrapper before deployment.
- Deployed version 1 as the owner with anonymous signup access. No mail-sending
  functions or subscriber-read endpoint are included.

## Verification

- Nine Node tests passed for normalization, duplicates, suppression preservation,
  malformed/formula-leading inputs, consent, honeypot/timing checks, write failures,
  lock contention, quota enforcement, response privacy, URL safety and local assets.
- Chrome test on the production HTTPS origin using temporary browser-only branch
  markup and code saved one test row and received the real success acknowledgment.
- Confirmed the saved address was lowercase and timestamped in the private Sheet.
- Repeating the signup returned the duplicate acknowledgment.
- A honeypot submission to the live backend returned a generic rejection.
- A malformed address accepted by browser validation was rejected by the backend.
- A simulated network failure displayed an honest unconfirmed-signup message.
  Network settings were restored and the temporary production preview reloaded.
- One synthetic test subscriber remains in the private Sheet; remove it before
  exporting a real mailing list.
- Client-side invalid email and missing consent produced visible errors and
  moved focus to the relevant input. Keyboard Tab reached the submit button.
- Desktop, 390px mobile and 820px tablet layouts have no horizontal overflow.

The production-origin test was a temporary browser preview, not a public website
deployment. The website still deploys from main; the branch remains unmerged.

## Security findings and changes

- The optional Supabase schema granted anonymous write access and draft reads.
  Updated it to published-only reads without browser write policies. No remote
  Supabase database was configured or changed. Existing installations must apply
  the corrected SQL and review any other policies themselves.
- Disabled shared admin writes pending actual owner authentication. Browser-local
  resource previews still work. Removed the unused external Supabase CDN import.
- Added URL protocol checks to prevent executable guide/download URLs, CSP meta
  policies, referrer policy, and noopener/noreferrer on new-window links.
- Existing copyright already updates dynamically. Local resource PDFs, images,
  scripts and styles referenced by the site resolve.
- No tracking scripts added. Google Fonts remains from the existing design.
- CSP frame/form destinations allow Google’s dynamic googleusercontent subdomains
  because Apps Script uses them. JavaScript reply validation is narrower. Scripts
  remain self-only and do not allow inline execution or eval.
- GitHub Pages cannot set arbitrary response headers through a static meta tag.
  `frame-ancestors` and HSTS need hosting/edge configuration, not meta tags.

## Release requirements

1. Resolved: the owner supplied office@nicbuilds.com as the public privacy and
   removal contact; it is linked in `privacy.html`.
2. Resolve GitHub Pages HTTPS enforcement. The HTTPS site loaded successfully,
   but Pages reported `https_enforced: false` and rejected enabling it with
   “The certificate does not exist yet.” Check custom-domain DNS/any proxy and
   certificate provisioning in Pages settings, then enable HTTPS enforcement.
   No DNS changes were made. The signup code refuses production HTTP submissions.
3. Review and merge `codex/google-sheets-newsletter` into main, wait for the Pages
   build, then perform a final signup/duplicate test on the published page.
4. Before newsletter sending, connect a provider for unsubscribe, bounce handling,
   email ownership confirmation and authenticated sending.

Free intake has finite quotas and simple bot defenses; it is not a guarantee
against spam, exhaustion, or every security issue.
