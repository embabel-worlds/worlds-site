/*
 * The guide's reading order and what each chapter is for.
 *
 * Same editorial layer as spec-docs.ts, and same reason: the appliance ships the
 * guide as a directory of markdown that reads perfectly well on GitHub, and it is
 * not this site's business to add frontmatter to somebody else's repository.
 */
export interface GuideDoc {
  slug: string
  title: string
  blurb: string
}

export const GUIDE_DOCS: GuideDoc[] = [
  {
    slug: 'overview',
    title: 'What you are running',
    blurb: 'The graph, the runtime and the realms, in plain language — and which of the two doors you came through.',
  },
  {
    slug: 'coding-agents',
    title: 'Working with a coding agent',
    blurb: 'Connecting Claude Code to your own appliance, what it can and cannot reach, and the loop that makes building fast.',
  },
  {
    slug: 'realms',
    title: 'Making your own realm',
    blurb: 'Connecting a system nobody has connected yet — including the version where you describe it and an agent builds it.',
  },
  {
    slug: 'local-models',
    title: 'Running your own models',
    blurb: 'LM Studio and Ollama on your own hardware: what to put on them, what it costs you, and how to go fully local.',
  },
  {
    slug: 'privacy',
    title: 'What stays on your machine',
    blurb: 'The exhaustive list of what leaves, when and to whom — and how to check it from your own instance rather than trust it.',
  },
]
