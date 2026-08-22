/*
 * The spec's links are repo links: `[the reference](VIRTUAL_CYPHER.md)`,
 * `[skills](skills/)`. Correct on GitHub, 404s here.
 *
 * This rewrites them on the way through, which is the only honest option — the
 * alternative is editing the spec to suit the site, and the spec is not ours.
 * A link to a document this site publishes becomes a site link; anything else
 * becomes a link into the repo, so nothing silently dead-ends.
 *
 * Hand-rolled tree walk rather than a `unist-util-visit` dependency: it is nine
 * lines, over a data structure that is not going to change shape.
 */

const REPO_BLOB = 'https://github.com/embabel-worlds/realm-spec/blob/main/'
/* CLI.md comes from the appliance, and its relative links point at appliance files. */
const APPLIANCE_BLOB = 'https://github.com/embabel-worlds/appliance/blob/main/'
const APPLIANCE_FILES = new Set(['.env.example', 'install.sh', 'README.md'])

/* Must agree with `generateId` in src/content.config.ts — the same two rules. */
const slugFor = (file) => {
  const stem = file.replace(/\.md$/i, '').toLowerCase().replace(/_/g, '-')
  return stem === 'readme' ? 'realms' : stem
}

/** The documents src/pages/spec/[...slug].astro actually renders. */
const PUBLISHED = new Set([
  'README.md', 'VIRTUAL_CYPHER.md', 'VIRTUAL_CYPHER_GUIDE.md', 'DECLARING_TYPES.md',
  'LABELS_AND_COMPOSITION.md', 'EXTERNAL_DOCUMENTS.md', 'CONTEXT.md',
])

/*
 * The guide, from the appliance repo. Its chapters link to each other the way a
 * reader on GitHub needs them to — `[privacy](privacy.md)` — and without this they
 * would fall through to the realm-spec catch-all below and point at a file in a
 * repository that has never held them.
 *
 * README.md is deliberately absent: it is the guide's front page, but the same
 * filename means the spec's front page too, and this plugin cannot tell which
 * document it is rewriting. The guide's own chapters therefore link to `/guide/`
 * directly rather than to `README.md`.
 */
const GUIDE_FILES = new Map([
  ['coding-agents.md', 'coding-agents'],
  ['realms.md', 'realms'],
  ['local-models.md', 'local-models'],
  ['privacy.md', 'privacy'],
])

function rewrite(href) {
  /* Absolute, anchor-only, and already-ours links are left alone. */
  if (!href || /^(https?:|mailto:|#|\/)/.test(href)) return href

  const [path, hash = ''] = href.split('#')
  const fragment = hash ? `#${hash}` : ''

  if (GUIDE_FILES.has(path)) return `/guide/${GUIDE_FILES.get(path)}/${fragment}`
  if (PUBLISHED.has(path)) return `/spec/${slugFor(path)}/${fragment}`
  if (path === 'VIRTUAL_CYPHER_CHEATSHEET.html') return `/cheatsheet.html${fragment}`

  if (APPLIANCE_FILES.has(path)) return `${APPLIANCE_BLOB}${path}${fragment}`

  /* Everything else is a file in the spec repo that this site does not publish —
     a realm.yml, an example directory. Send the reader to the source. */
  return `${REPO_BLOB}${path}${fragment}`
}

export function rewriteDocLinks() {
  return (tree) => {
    const walk = (node) => {
      if (node.tagName === 'a' && node.properties?.href) {
        node.properties.href = rewrite(node.properties.href)
      }
      for (const child of node.children ?? []) walk(child)
    }
    walk(tree)
  }
}
