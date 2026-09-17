# Lightweight admin setup

The admin has no login page. Click the `© 2026 Bramble Management` footer text ten consecutive times to open the editor.

Until a shared database is connected, edits are saved only in the current browser. This is useful for previewing the complete workflow locally.

## Connect shared resources

1. Create a Supabase project.
2. Open the project's SQL editor.
3. Run the complete contents of `supabase-schema.sql`.
4. From the project settings, copy the project URL and public/publishable key.
5. Add them to `site-config.js`:

```js
window.BRAMBLE_CONFIG = {
  supabaseUrl: "https://YOUR-PROJECT.supabase.co",
  supabaseAnonKey: "YOUR-PUBLIC-KEY"
};
```

Once connected, resources saved in the editor are immediately available to every visitor.

## Security tradeoff

This deliberately uses the hidden ten-click sequence instead of real authentication. It keeps the editor out of normal navigation but does not secure the database against a determined visitor who inspects the site. Do not use this design for private information or anything costly to replace.

Each published resource gets a shareable link in this format:

`https://www.bramblemanagement.com/guides/?slug=your-resource-slug`
