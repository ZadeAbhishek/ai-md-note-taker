export interface ParsedRepoInput {
  owner: string
  name: string
  /** Present only if the pasted input itself named a branch (e.g. a /tree/<branch> URL). */
  branch: string | null
}

/**
 * Parses a pasted GitHub repo reference into owner/name/branch. Accepts a full HTTPS URL
 * (with or without a /tree/<branch> or /blob/<branch>/... suffix), an SSH URL, or the bare
 * "owner/repo" shorthand.
 */
export function parseRepoInput(input: string): ParsedRepoInput | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const ssh = /^git@github\.com:([^/\s]+)\/([^/\s]+?)(?:\.git)?$/.exec(trimmed)
  if (ssh) {
    return { owner: ssh[1], name: ssh[2], branch: null }
  }

  const https =
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?(?:\/(?:tree|blob)\/([^/\s]+))?(?:\/.*)?\/?$/i.exec(
      trimmed,
    )
  if (https) {
    return { owner: https[1], name: https[2], branch: https[3] ?? null }
  }

  const shorthand = /^([\w.-]+)\/([\w.-]+?)(?:\.git)?$/.exec(trimmed)
  if (shorthand) {
    return { owner: shorthand[1], name: shorthand[2], branch: null }
  }

  return null
}
