export interface ParsedRepoInput {
  owner: string
  name: string
  /** Present only if the pasted input itself named a branch (e.g. a /tree/<branch> URL). */
  branch: string | null
}

// GitHub owner/repo names are only ever letters, digits, dots, underscores and hyphens.
// Using this instead of a permissive "any non-slash" class is what makes the parser reject
// malformed input (e.g. a URL accidentally pasted twice back-to-back) rather than silently
// absorbing the garbage into the name — a bare [^/\s]+ group has nothing to stop it from
// swallowing a literal "https://..." that follows with no separating slash.
const SEGMENT = '[\\w.-]+'

/**
 * Parses a pasted GitHub repo reference into owner/name/branch. Accepts a full HTTPS URL
 * (optionally with a /tree/<branch>/... or /blob/<branch>/... suffix), an SSH URL, or the
 * bare "owner/repo" shorthand. Returns null for anything that doesn't cleanly match one of
 * those shapes, rather than guessing.
 */
export function parseRepoInput(input: string): ParsedRepoInput | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const ssh = new RegExp(`^git@github\\.com:(${SEGMENT})\\/(${SEGMENT}?)(?:\\.git)?$`).exec(trimmed)
  if (ssh) {
    return { owner: ssh[1], name: ssh[2], branch: null }
  }

  const https = new RegExp(
    `^(?:https?:\\/\\/)?(?:www\\.)?github\\.com\\/(${SEGMENT})\\/(${SEGMENT}?)` +
      `(?:\\.git)?(?:\\/(?:tree|blob)\\/(${SEGMENT})(?:\\/.*)?)?\\/?$`,
    'i',
  ).exec(trimmed)
  if (https) {
    return { owner: https[1], name: https[2], branch: https[3] ?? null }
  }

  const shorthand = new RegExp(`^(${SEGMENT})\\/(${SEGMENT}?)(?:\\.git)?$`).exec(trimmed)
  if (shorthand) {
    return { owner: shorthand[1], name: shorthand[2], branch: null }
  }

  return null
}
