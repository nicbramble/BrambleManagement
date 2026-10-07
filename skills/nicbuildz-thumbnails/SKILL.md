---
name: nicbuildz-thumbnails
description: Create and maintain consistent NIC.BUILDZ guide thumbnails and share covers when adding resources to nicbuilds.com or refreshing its library artwork. Use the repository's editorial cover renderer and topic-specific illustration system.
---

# NIC.BUILDZ Thumbnails

Give each guide a recognizable cover in the same editorial system as the other resources. Read [the design system](references/design-system.md) before choosing a headline or illustration.

## Find the project

Use the current NIC.BUILDZ checkout, identified by `data/resources.json`, `scripts/prepare-thumbnails.py`, and `scripts/build-library.cjs`. In the Nic.Buildz workspace it is the `BrambleManagement` directory. If the current workspace is elsewhere, locate the saved project before editing; do not recreate the site from this skill.

## Create a cover with a guide

1. Read the guide's actual promised outcome and format. Choose a short, specific cover headline and a relevant illustration from the renderer's `MOTIFS`. Add or update its slug in `data/thumbnail-specs.json` with `headline` and `motif`. A line break can express the intended headline layout. Keep topic facts in the guide; diagrams are illustrative. If the guide supplies original artwork, preserve its real `image_url` and `image_alt` under the same slug in `data/original-resource-artwork.json` before building; the guide will continue to display that source artwork while its library card uses the cover.
2. Render an isolated preview with `python3 scripts/prepare-thumbnails.py --slug SLUG --output /tmp/nicbuildz-cover-preview`. Use a Python environment with Pillow >= 10. In Codex desktop, discover its bundled Python with `load_workspace_dependencies` if the default Python lacks Pillow. Do not install packages or fonts merely to rediscover dependencies already bundled.
3. Inspect the cover at full size and approximately 320 pixels wide. Check the actual headline, readable illustration, palette, complete framing and absence of clipping. If the topic has no suitable motif, extend the renderer's illustration vocabulary while keeping the frame and typography fixed; do not invent a new layout for that guide.
4. Run `node scripts/build-library.cjs` in the project. If needed set `NICBUILDZ_PYTHON` to the Python executable containing Pillow. This generates covers, updates `image_url`/`image_alt` and responsive variants, produces matching social cards, then validates and builds guide pages. The renderer uses content hashes in filenames so changed covers do not depend on visitors clearing their cache.
5. Check the guide/card preview and run the repository's existing checks. Report whether the work is local or published. Follow the user's existing publishing authorization; this skill is not authorization to publish.

The wrapper generates a category-appropriate cover for a new guide without a custom spec. Add a custom spec whenever possible so its headline and diagram communicate the actual benefit. Very long unspecialized titles get a safe branded cover; explicitly supplied headlines that cannot fit fail with an actionable error. Draft status and article content must stay intact.

## Existing artwork

The resource library uses consistent covers. Preserve original photos, screenshots, printables and downloads at their existing paths; do not overwrite or delete them when changing a resource's cover. Original artwork mappings live in `data/original-resource-artwork.json`. A new screenshot or original asset can remain in the guide without becoming its cover.

The static site does not spawn agents or call an image service at runtime. Codex can use this skill during guide creation; `build-library.cjs` handles repeatable rendering. A thumbnail-only task does not authorize changes to guide claims, subscriber data, newsletter settings, or unrelated site content.
