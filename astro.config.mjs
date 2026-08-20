import { defineConfig } from 'astro/config'
import { rewriteDocLinks } from './plugins/rewrite-doc-links.mjs'

/* Built to a static `dist/` and served at the root of its own hostname, so `site`
   is the real host and there is no `base`. Get `site` wrong and every canonical
   URL points somewhere that is not us. */
export default defineConfig({
  site: 'https://worlds.embabel.com',
  build: { format: 'directory' },
  markdown: {
    /* The spec is published here but written elsewhere; its repo-relative links
       have to be repointed on the way through. See the plugin. */
    rehypePlugins: [rewriteDocLinks],
    shikiConfig: { theme: 'github-dark-default' },
  },
})
