# NIC.BUILDZ guide workflow

When creating or improving a guide for nicbuilds.com, use `nicbuildz-guides` at `skills/nicbuildz-guides/SKILL.md` for editorial quality, practical examples and source verification. Use the resource schema and existing public renderer. Create its cover with the `nicbuildz-thumbnails` skill at `skills/nicbuildz-thumbnails/SKILL.md`; it defines the editorial cover system and preview checks.

Add the resource to `data/resources.json` and its short cover headline/motif to `data/thumbnail-specs.json`. Run `node scripts/build-library.cjs` to generate and attach consistent thumbnails, responsive variants, social cards, static guide pages and the sitemap. This replaces the standalone page-builder step for ordinary guide creation. Set `NICBUILDZ_PYTHON` to a Python executable with Pillow if the default Python lacks it. In Codex desktop the bundled runtime is discoverable with `load_workspace_dependencies`.

Preserve original artwork and downloadable files. Resource bodies, draft/published status and guide navigation use their existing contracts. The public admin remains a local editor; it does not run scripts, spawn agents or publish from the browser.

For validation, run `node --test tests/*.test.cjs`, the thumbnail renderer tests with the same Pillow-enabled Python, and `git diff --check`. Check new covers at card size and verify their actual guide links. Do not add subscriber data, private exports or credentials to the repository.
