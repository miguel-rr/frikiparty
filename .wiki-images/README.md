Pictures for the games wiki (units, heroes, structures, power icons, crests).
This folder is git-ignored; the files live in the shared R2 bucket under
`wiki/` and the seed (`pnpm run db:seed:wiki`) points at them by key.

Layout mirrors the keys: `aotr/<faction code>/<units|heroes|structures|powers>/<slug>.webp`,
portraits as `<slug>-portrait.webp`, the faction crest as `aotr/<code>/logo.webp`.
Slugs are the `slug` fields in `scripts/wiki-data/*.ts`.

- `pnpm run wiki:images -- manifest` lists every key the seed expects with its
  source file on the community wiki (aotr.fandom.com, CC BY-SA); power icons
  are cropped from the faction's spellbook image (`spellbook:<tier>:<position>`).
- Convert sources to WebP, at most 800 px wide, and drop them here.
- `pnpm run wiki:images` uploads what is missing (existing keys are skipped:
  rename the key to replace a picture).
