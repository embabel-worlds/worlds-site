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

function rewrite(href) {
  /* Absolute, anchor-only, and already-ours links are left alone. */
  if (!href || /^(https?:|mailto:|#|\/)/.test(href)) return href

  const [path, hash = ''] = href.split('#')
  const fragment = hash ? `#${hash}` : ''

  if (PUBLISHED.has(path)) return `/spec/${slugFor(path)}/${fragment}`
  if (path === 'VIRTUAL_CYPHER_CHEATSHEET.html') return `/cheatsheet.html${fragment}`

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
