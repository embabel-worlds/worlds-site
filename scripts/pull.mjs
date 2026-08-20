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
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/* TODO: move these to release TAGS once the repos cut them. `main` means the
   site can publish whatever landed this morning, which is the same complaint
   install.sh already makes about itself. */
const SOURCES = {
  'realm-spec': { repo: 'https://github.com/embabel-worlds/realm-spec.git', ref: 'main' },
  'appliance': { repo: 'https://github.com/embabel-worlds/appliance.git', ref: 'main' },
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

console.log('  done\n')
