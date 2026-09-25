# Bramble Management / nic.buildz

The link-in-bio hub for Nic Bramble. It provides a clear path to start a project with MTN Automations and a library of individually shareable resources.

## Local preview

Serve the repository with any static web server, then open the root page. The site falls back to `data/resources.json` until the secure resource service is connected.

## Content admin

Click the footer copyright ten consecutive times to open the browser-local preview editor. It does not publish to a shared database. See `ADMIN_SETUP.md` for the security requirements before connecting shared editing.

## Resource links

Every published resource has a stable link in this form:

`/guides/?slug=resource-slug`

The featured **Study Smarter** guide is at `/guides/?slug=chatgpt-study-prompts`.
Its body lives in `data/resources.json`; keep `downloads/chatgpt-study-prompts.txt`
in sync when editing it. A test checks that the downloadable copy matches.
Guide bodies support fenced `prompt` blocks, which display as copyable prompt
cards. Guides with these blocks automatically get section navigation. Optional
`sources`, `cta_eyebrow`, `cta_heading`, and `cta_description` fields supply
references and resource-specific footer copy.

## Newsletter

The signup card sits at the top of the free-resources section. It posts to a Google
Apps Script web app, which validates the request and writes to a restricted Google
Sheet. There are no Google credentials or subscriber records in this repository.

The owner’s Drive contains **Bramble Management Newsletter Subscribers**, with the
**Subscribers** tab. Its bound script is **Bramble Management Newsletter Signup**.
Open it through **Extensions → Apps Script**. Keep Sheet sharing **Restricted**.

### Configuration and deployment

- `site-config.js`: the public `/exec` deployment URL. This URL is intentionally
  public; its secrecy is not a security control.
- `google-apps-script/Code.gs`: backend source matching the deployed script.
- `google-apps-script/appsscript.json`: runtime, scope, and web-app configuration.
- Apps Script **Project Settings → Script properties**: `SPREADSHEET_ID` stays
  here, outside Git. The script uses `openById` because a web app has no active Sheet.
- `NEWSLETTER.origin` in `Code.gs`: exact production origin for postMessage replies.

To update the backend, replace `Code.gs` in the bound editor with the repository
copy, save, and use **Deploy → Manage deployments → Edit → New version → Deploy**.
Updating the existing deployment preserves the `/exec` URL. Saving code alone
does not update the public deployment. If creating a new deployment, choose
**Web app**, **Execute as: Me**, **Who has access: Anyone**, then update the public
endpoint in `site-config.js`. Review Google authorization prompts yourself.

For a new Sheet, first create the seven headers below. The private
`setupNewsletter_` helper formats the Sheet and saves its ID when run from the
bound editor. To invoke it through the editor’s function dropdown, temporarily
add `function setupNewsletter() { setupNewsletter_(); }`, run it, then REMOVE the
wrapper and save before deploying. The underscore on private helpers prevents
them being called through the public HTML-service RPC interface. Never deploy a
public setup, export, read-subscribers, or administrative helper.

### Columns and subscriber management

| Column | Meaning |
| --- | --- |
| email | Trimmed lowercase address stored as text |
| subscribed_at | Server-generated signup date/time |
| source | `website` |
| consent_version | `2026-09-v1`, matching the form’s consent wording |
| status | `active`, or a manual suppression such as `unsubscribed` or `bounced` |
| unsubscribed_at | Owner-entered date/time when someone opts out |
| bounce_type | Reserved for future email-provider delivery information |

To unsubscribe someone now, find their row, set `status` to `unsubscribed`, and
enter the date/time in `unsubscribed_at`. Do not simply remove suppression records
as a substitute for unsubscribing. The public form never reactivates a non-active
row. Deletion requests should be handled deliberately under the privacy policy.

Duplicates are matched case-insensitively inside a script lock. They never create
another row. New writes use plain-text email cells and reject formula-leading
characters. The server generates the source, consent version and timestamp.

### Submission behavior and limits

The form submits by HTTPS POST into a hidden iframe. Apps Script nests its own
Google sandbox inside that iframe. Its response sends only a status and a random
request ID to the exact production origin. The frontend checks Google’s sender
origin, the iframe ancestry, the message shape and the request ID. It displays
success only after confirmation. A missing response times out after 25 seconds
with an honest “couldn’t confirm” message; the record may already have been saved,
and retrying is safe because duplicates are detected. No `no-cors` success guesses.

`doGet` returns only a fixed health message. There is no subscriber listing API.
Email validation, consent, a honeypot, a 2.5-second minimum completion time, a
24-hour form expiry and global limits of 30 admitted requests/minute and 500/day
are checked server-side. Invalid submissions do not add rows. The rate counters
are protected by the same script lock and persist in Script Properties.

These are modest anti-abuse controls for a small free list. A bot can forge the
client timestamp, ignore the honeypot, and consume the global allowance. Origin
checks and the public endpoint URL do not authenticate submitters. Apps Script
does not expose a reliable client IP here. If targeted abuse occurs, add a
server-verified challenge or move intake to a service with stronger rate limits.
This version does not confirm email ownership or send double-opt-in messages.

Google’s service quotas still apply. $0/month describes this setup within the
available free quotas, excluding your existing domain renewal. There is no paid
hosting subscription, email sender, or paid third-party script added.

### Before sending newsletters

Do not use Apps Script or Gmail for bulk marketing. Unsubscribe and bounce fields
are manual until an email provider is connected. Use Beehiiv, Brevo, or another
provider for confirmation, authenticated delivery, unsubscribe links and bounce
suppression before the early-2027 launch.

To export only active records, create a PRIVATE temporary export Sheet and copy
only rows whose status is exactly `active`. Check every exported row’s status,
then download that export tab as CSV. Do not assume a UI filter excludes hidden
rows from CSV downloads. Import only the active list into the provider; migrate
suppressed records separately using the provider’s suppression import process.
Never re-import an old backup as an all-active list. Do not commit exports to Git.

### Testing and release

Run `node --test tests/*.test.cjs` and `git diff --check`.
Serve the root with `python3 -m http.server 8765 --bind 127.0.0.1` for visual checks.
Backend acknowledgments intentionally target the production HTTPS origin, so a
localhost submission cannot display a successful live acknowledgment. Use a
production-origin browser preview or the reviewed published page for end-to-end
tests. Do not weaken the reply origin to `*` for testing.

The website deploys from `main`. The newsletter branch must be reviewed and merged
before the public site changes. `VERIFICATION.md` records completed tests and
remaining release requirements, including the privacy contact and HTTPS setup.

Never commit OAuth tokens, passwords, Google account details, private Sheet links,
subscriber data, `.clasp.json`, service-role keys or credential files. The public
Apps Script source and `/exec` endpoint are safe to version-control.
