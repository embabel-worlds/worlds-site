/*
 * The reading order, and what each document is for — this site's editorial layer
 * over the spec repo, which ships a flat directory of markdown with no opinion
 * about where a newcomer should start. Titles live here rather than in
 * frontmatter because the spec's files are not ours to add frontmatter to.
 */
export interface SpecDoc {
  slug: string
  title: string
  blurb: string
}

export const SPEC_DOCS: SpecDoc[] = [
  {
    slug: 'realms',
    title: 'The realm specification',
    blurb: 'The normative document: what a realm is, every directory it may contain, and what the host does with each.',
  },
  {
    slug: 'virtual-cypher-guide',
    title: 'Virtual Cypher — a guide',
    blurb: 'Learn it by worked example, in order. Start here; the reference will make sense afterwards.',
  },
  {
    slug: 'virtual-cypher',
    title: 'Virtual Cypher — reference',
    blurb: 'The normative semantics: producers, virtual labels, materialization, and what the planner guarantees.',
  },
  {
    slug: 'declaring-types',
    title: 'Declaring types',
    blurb: 'How a realm adds new kinds of thing to the graph, and what the host validates before it accepts them.',
  },
  {
    slug: 'labels-and-composition',
    title: 'Labels and composition',
    blurb: 'What happens when several realms describe the same entity — the rules that keep them from fighting.',
  },
  {
    slug: 'external-documents',
    title: 'External documents',
    blurb: 'Reaching documents that live in someone else’s system without mirroring them into yours.',
  },
  {
    slug: 'context',
    title: 'Context',
    blurb: 'How a realm scopes what the agent can see at any moment.',
  },
]
