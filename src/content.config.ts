import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'

/*
 * The realm spec, loaded from the checkout scripts/pull.mjs makes. `base` points
 * outside src/ on purpose: these files are not ours to keep, and a copy in src/
 * would be a fork of the spec wearing the spec's name.
 */
const spec = defineCollection({
  loader: glob({
    pattern: '*.md',
    base: './vendor/spec-docs',
    /* The repo's filenames are SHOUTING_SNAKE. URLs are not. README is the spec
       itself, so it gets the name people would guess. */
    generateId: ({ entry }) => {
      const stem = entry.replace(/\.md$/, '').toLowerCase().replace(/_/g, '-')
      return stem === 'readme' ? 'realms' : stem
    },
  }),
})

/*
 * The appliance's own documentation — today the CLI reference. Separate from the
 * spec because it comes from a different repository with a different release
 * cadence, and folding them into one collection would make that invisible.
 */
const appliance = defineCollection({
  loader: glob({
    pattern: '*.md',
    base: './vendor/appliance-docs',
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
})

export const collections = { spec, appliance }
