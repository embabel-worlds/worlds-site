/*
 * Pull the documents this site publishes from the repos that own them.
 *
 * Nothing under vendor/, and none of the copied files in public/, is committed
 * here. The realm spec lives in realm-spec; the installer lives in the
 * appliance. A copy in this repo would be a second version of both, free to
 * disagree with the first and impossible to notice when it did — which is
 * exactly the failure a marketing site quoting a spec is prone to.
 *
 * Runs before both `dev` and `build`, so what you see locally is what deploys.
 *
 * Local editing: point a source at a working copy to iterate on the docs and
 * the site together —
 *
 *   SOURCE_REALM_SPEC=../realm-spec npm run dev
 */
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/* TODO: move these to release TAGS once the repos cut them. `main` means the
   site can publish whatever landed this morning, which is the same complaint
   install.sh already makes about itself. */
const SOURCES = {
  'realm-spec': { repo: 'https://github.com/embabel-worlds/realm-spec.git', ref: 'main' },
  'appliance': { repo: 'https://github.com/embabel-worlds/appliance.git', ref: 'main' },
  /* The API document. It is PRODUCED in embabel/me, which is private, and pushed
     here by that repo's publish-openapi job — so the kit is the public face of a
     document this site could not otherwise read. See README-openapi.md there. */
  'appliance-kit': { repo: 'https://github.com/embabel-worlds/appliance-kit.git', ref: 'main' },
}

const git = (args, cwd) => execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim()

/* One shallow checkout per source under vendor/, refreshed in place on later
   runs so a rebuild is a fetch rather than a full clone. */
function fetchSource(name) {
  const override = process.env[`SOURCE_${name.toUpperCase().replace(/-/g, '_')}`]
  if (override) {
    const path = resolve(ROOT, override)
    if (!existsSync(path)) throw new Error(`${name}: override path does not exist: ${path}`)
    console.log(`  ${name}  ← ${path} (local override)`)
    return path
  }

  const { repo, ref } = SOURCES[name]
  const path = join(ROOT, 'vendor', name)
  if (existsSync(join(path, '.git'))) {
    git(['fetch', '--depth', '1', 'origin', ref], path)
    git(['checkout', '--force', 'FETCH_HEAD'], path)
  } else {
    rmSync(path, { recursive: true, force: true })
    mkdirSync(join(ROOT, 'vendor'), { recursive: true })
    git(['clone', '--depth', '1', '--branch', ref, repo, path])
  }
  console.log(`  ${name}  ← ${repo} @ ${ref} (${git(['rev-parse', '--short', 'HEAD'], path).slice(0, 7)})`)
  return path
}

console.log('\nPulling published documents:')
const spec = fetchSource('realm-spec')
const appliance = fetchSource('appliance')
const kit = fetchSource('appliance-kit')

/* The spec's markdown is rendered into the site's own chrome by
   src/pages/spec/[...slug].astro, so it only has to land where the content
   collection looks for it. */
rmSync(join(ROOT, 'vendor/spec-docs'), { recursive: true, force: true })
mkdirSync(join(ROOT, 'vendor/spec-docs'), { recursive: true })
for (const f of ['README.md', 'VIRTUAL_CYPHER.md', 'VIRTUAL_CYPHER_GUIDE.md',
                 'DECLARING_TYPES.md', 'LABELS_AND_COMPOSITION.md',
                 'EXTERNAL_DOCUMENTS.md', 'CONTEXT.md']) {
  cpSync(join(spec, f), join(ROOT, 'vendor/spec-docs', f))
}

/* The cheat sheet is already a finished, self-contained, printable page. It is
   served verbatim rather than re-rendered: re-rendering it would mean
   maintaining its layout twice, and the version people print should be the
   version the spec repo tests. */
cpSync(join(spec, 'VIRTUAL_CYPHER_CHEATSHEET.html'), join(ROOT, 'public/cheatsheet.html'))

/* Serving the installer here is what makes the curl line short — and pins new
   users to whatever ref SOURCES names above, rather than to the appliance's
   moving main. */
cpSync(join(appliance, 'install.sh'), join(ROOT, 'public/install.sh'))

/* The CLI reference, from the repo that owns the CLI. Same rule as the spec: it
   is rendered here, never edited here, so `embabel --help` and this page cannot
   describe different commands. */
mkdirSync(join(ROOT, 'vendor/appliance-docs'), { recursive: true })
cpSync(join(appliance, 'CLI.md'), join(ROOT, 'vendor/appliance-docs/cli.md'))

/* The user guide, rendered by /guide/. Written in the appliance repo because that
   is the public repository the product ships from, and read by people who will also
   meet it there — so it has to work as plain markdown on GitHub, not only in this
   site's chrome. */
rmSync(join(ROOT, 'vendor/guide-docs'), { recursive: true, force: true })
mkdirSync(join(ROOT, 'vendor/guide-docs'), { recursive: true })
/* Tolerated the way the API document is, and for the same reason: this site and the
   appliance are separate repositories that land at separate times, so an absent guide
   must not take down every other page while one of them catches up. */
const guideDir = join(appliance, 'docs/guide')
if (existsSync(guideDir)) {
  const chapters = readdirSync(guideDir).filter((n) => n.endsWith('.md'))
  for (const f of chapters) cpSync(join(guideDir, f), join(ROOT, 'vendor/guide-docs', f))
  console.log(`  guide     ← appliance docs/guide (${chapters.length} chapters)`)
} else {
  console.warn('  guide     !! the appliance has no docs/guide — /guide/ will be empty.')
}

/*
 * The Worlds API, rendered by /api/. Into public/ rather than vendor/ because Redoc
 * FETCHES it at runtime — it needs a URL, not a module.
 *
 * ABSENCE IS TOLERATED, LOUDLY. Until embabel/me holds the App credentials its
 * publish job skips, and this file does not exist. Failing the build over that would
 * take the whole site down over one page; saying nothing would let the reference
 * silently never appear. So: warn here, and let /api/ say plainly that it has not
 * been published yet.
 */
const openapi = join(kit, 'spec/worlds-openapi.json')
if (existsSync(openapi)) {
  cpSync(openapi, join(ROOT, 'public/openapi.json'))
  const meta = join(kit, 'spec/worlds-openapi.meta.json')
  /* Provenance, so the page can date itself. Written by the publish job beside the
     document; the document itself stays exactly what the server served. */
  if (existsSync(meta)) cpSync(meta, join(ROOT, 'public/openapi.meta.json'))
  else rmSync(join(ROOT, 'public/openapi.meta.json'), { force: true })
  console.log(`  openapi   ← appliance-kit spec/worlds-openapi.json`)
} else {
  rmSync(join(ROOT, 'public/openapi.json'), { force: true })
  rmSync(join(ROOT, 'public/openapi.meta.json'), { force: true })
  console.warn('  openapi   !! appliance-kit has no spec/worlds-openapi.json — /api/ will say so.')
}

console.log('  done\n')
