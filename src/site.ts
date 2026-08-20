/* Facts about the site that more than one page needs, in one place. */

/*
 * The install line.
 *
 * It points here rather than at raw.githubusercontent.com because this site
 * serves the installer itself — scripts/pull.mjs copies it in from the appliance
 * at the ref pinned there, which is also how new users stop getting whatever
 * landed on main this morning.
 *
 * `EMBABEL_MODE=worlds` because the installer defaults to the Me door and this
 * site sells the other one. The variable goes before `sh` rather than after the
 * pipe, which is the only placement that reaches the script's environment.
 */
export const INSTALL_COMMAND =
  'curl -fsSL https://worlds.embabel.com/install.sh | EMBABEL_MODE=worlds sh'

export const REPO = 'https://github.com/embabel-worlds/appliance'
export const SPEC_REPO = 'https://github.com/embabel-worlds/realm-spec'
