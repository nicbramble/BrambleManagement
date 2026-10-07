# NIC.BUILDZ Editorial Covers — v1

## Fixed frame

1200 × 630 landscape master. Responsive WebP exports: 160, 400 and 800 pixels wide, preserving aspect ratio. JPEG share card: 1200 × 630. Keep the whole composition visible in resource cards and expandable guide artwork.

- Background: cream `#f4efe5`; illustration paper: `#fbf8f1`.
- Main ink: `#171512`; accent: rust `#b7351e`.
- Illustration backing: sand `#e5dac8`; quiet rules: `#c9bead`.
- Display type: bundled Oswald, weight 600. Supporting type: bundled DM Sans.
- Shared header: NIC.BUILDZ wordmark at left, THE USEFUL CORNER at right; thin divider.
- Left: resource format, a brief outcome headline, short rust rule.
- Right: one bold topic illustration, backed by a sand circle. Use the same 4–6 pixel strokes, paper shapes and limited colors. Diagrams represent concepts rather than fabricated product screenshots.
- Footer: category and NICBUILDS.COM; thin divider. No claim badges, decorative logos or extra copy.

Artwork occupies x=650..1110 and y=160..533. Text stays in the left 530-pixel safe area. Header/footer margins are 56 pixels. The renderer fits the headline without silently truncating it. Prefer two lines with roughly 2–6 words in total; three lines are acceptable. Headlines should be truthful and useful: BETTER AI PROMPTS, MAKE ROOM FOR YOUR WEEK, FIND YOUR NEXT FLIGHT. Do not imply guaranteed virality, profits, savings or outcomes.

## Illustration vocabulary

`prompts`: four stacked context cards. `planner`: a weekly calendar. `automation`: a task/result loop. `video`: a video player and timeline. `domains`: .AI/.SI name cards. `learning`: video input to reusable skill. `swaps`: two tool stacks exchanging arrows. `tree`: tree to quote. `marketplace`: example offer conversation. `workbook`: notes and pencil. `travel`: paper plane and route. `study`: question cards. `styles`: four distinct visual treatments. `avatar`: framed illustrated portrait. `meal`: meal plate. `resource`: useful-notes sheet.

Avoid using the same generic star or arrow as the entire illustration. Small spark accents may appear within a meaningful scene. Add a new motif only when the existing vocabulary cannot communicate the guide's topic.

## Authoring data

The existing resource schema stays unchanged. Cover art direction belongs in `data/thumbnail-specs.json`, keyed by the existing slug:

```json
{
  "plan-your-week-with-chatgpt": {
    "headline": "MAKE ROOM\nFOR YOUR WEEK",
    "motif": "planner"
  }
}
```

The renderer owns asset naming and updates actual resource paths after files exist. Do not hand-write a predicted hash or an image path before rendering. The site has a matching default cover for resources imported without artwork. Existing source assets remain preserved; the cover renderer never deletes them.
