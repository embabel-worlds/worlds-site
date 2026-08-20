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

export const collections = { spec }
