# worlds-site

The adoption surface for **Embabel Worlds**, at worlds.embabel.com. What a World
is and why the product exists, the one command that stands one up, the realm
specification and the Virtual Cypher cheat sheet, rendered nicely and kept
current.

**Worlds only.** Me is a different product with a different buyer, and it gets its
own landing page and its own install when there is one. Nothing here mentions it:
selling two products to a visitor who came for one is how a landing page stops
working.

The claim on the front page is the pitch deck's, near enough word for word — the
site and the deck disagreeing about what the product is would be worse than either
being wrong on its own.

```bash
npm install
npm run dev        # http://localhost:4321
```

`dev` and `build` both run `npm run pull` first, so what you see locally is what
deploys.

## It does not own the documents it publishes

The realm spec lives in [realm-spec](https://github.com/embabel-worlds/realm-spec).
The installer lives in [appliance](https://github.com/embabel-worlds/appliance).
Neither is copied into this repo. `scripts/pull.mjs` clones both at the ref pinned
at the top of that file and drops them in `vendor/`, which is gitignored — a copy
here would be a second version of each, free to disagree with the first and
impossible to notice when it did.

Two consequences worth knowing:

- **The spec's links are repo links.** `plugins/rewrite-doc-links.mjs` repoints
  them on the way through: a document this site publishes becomes a site link,
  anything else becomes a link into the spec repo. Editing the spec to suit the
  site is not on the table.
- **The cheat sheet is served verbatim** at `/cheatsheet.html`. It is already a
  finished, printable page; re-rendering it would mean maintaining its layout
  twice, and the copy people print should be the copy the spec repo tests. It
  wears its own palette rather than the site's, which is a deliberate loose end —
  see below.

To edit a doc and the site together, point a source at a working copy:

```bash
SOURCE_REALM_SPEC=../realm-spec npm run dev
```

## It does not own its own look either

The whole visual language is one import — `@embabel/appliance-kit/css`, the same
package the Me app and the Worlds console build against — and the drifting graph
behind every page is the kit's `startBackdrop`, not a copy of it. `src/styles/site.css`
adds only what a marketing page needs and an app has no use for: a hero, a nav bar,
a feature grid. Nothing in it names a colour.

That is the point. A marketing site that *resembles* the product drifts from it by
the second release; one that *imports* the product's stylesheet cannot.

## Deployment

Firebase Hosting, project `embabel-me-prod`, target `worlds` — pushed by
`.github/workflows/deploy.yml` on every push to `main`, and again daily so the
documents this site quotes stay current without anyone remembering to.

Firebase rather than GitHub Pages for one reason: the project already serves
me.embabel.com, and Pages allows one custom domain per repository. Keeping both
hostnames reachable from one build is the whole reason to consolidate here.

**Before the first deploy**, three things do not exist yet:

1. The Firebase site `embabel-worlds-prod` named in `.firebaserc` — create it in
   the project (`firebase hosting:sites:create`), or correct the name to whatever
   you call it.
2. The `FIREBASE_SERVICE_ACCOUNT` repository secret.
3. DNS for `worlds.embabel.com`, added as a custom domain on that site.

## Open ends

- **`me.embabel.com` is a separate page in a separate repo** — the pitch, with an
  email capture, hand-deployed from `assistant/docs/website/`. When Me gets a real
  landing and install, this repo is where they should live: a second Firebase
  target on the same project, built from the same source, so the two surfaces
  cannot drift.
- **The installer names its directory after the Me door.** `EMBABEL_HOME` defaults
  to `~/embabel-me` whatever mode you ask for, so a Worlds install lands somewhere
  called Me. The page works around it by not naming the directory. The fix belongs
  in `install.sh`.
- **The console screenshot has no upstream.** `public/images/worlds-console.webp`
  is committed here rather than pulled, because nothing public owns it: it came
  from `2026/gwc-overview/assets/embabel-worlds-console.png` in the *private*
  presentations repo. That means it is the one thing on the site that can go
  stale without anyone noticing. Re-shoot it from Query Studio when the console
  changes shape, and re-encode with `cwebp -q 82`.
- **The cheat sheet's palette** is the spec repo's own — teal on paper, not indigo
  on black. Fixing that means changing it upstream, which is the right place and
  a separate change.
- **The refs in `scripts/pull.mjs` are `main`.** They should be release tags, for
  the same reason `install.sh` says so about itself: a new user should not get
  whatever landed this morning.
- **No deck yet.** `/deck` is meant to be a static export from the presentations
  repo, linked from the landing page.
