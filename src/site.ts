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
 * pipe on Unix — the only placement that reaches the script's environment. On
 * PowerShell it goes as `$env:EMBABEL_MODE = 'worlds'` in the same statement
 * before the pipeline — same effect, PowerShell syntax.
 */
export const INSTALL_COMMAND_UNIX =
  'curl -fsSL https://worlds.embabel.com/install.sh | EMBABEL_MODE=worlds sh'

export const INSTALL_COMMAND_WINDOWS =
  "$env:EMBABEL_MODE = 'worlds'; irm https://worlds.embabel.com/install.ps1 | iex"

// Back-compat for any older imports that expect a single constant.
export const INSTALL_COMMAND = INSTALL_COMMAND_UNIX

export const REPO = 'https://github.com/embabel-worlds/appliance'
export const SPEC_REPO = 'https://github.com/embabel-worlds/realm-spec'
