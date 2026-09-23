# Local resource preview

Click the copyright ten times to open the browser-local editor. Changes are saved
only in that browser. Publish resource changes by editing `data/resources.json`
and the assets in GitHub. The ten-click sequence is not authentication.

## Optional shared database (disabled)

The previous SQL granted anonymous visitors full write access. The replacement
`supabase-schema.sql` allows public reads of published resources only, and removes
those anonymous write policies. It has NOT been run against a remote database.
If the old schema was deployed elsewhere, apply the migration there and review
other policies before reconnecting it. Existing policies are additive.

Shared browser editing is disabled until real owner-only authentication and RLS
policies are implemented. Use the Supabase dashboard for any intentional database
administration. Do not restore anonymous insert/update/delete policies.

The current CSP allows only the local resource data and images. A future database
integration must add its exact HTTPS project origin to `connect-src` and its exact
image origin to `img-src`. Never add a service-role key to frontend configuration.

Newsletter subscribers are stored separately in a restricted Google Sheet and
are never available to this editor or its local storage.
