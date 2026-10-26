import { Octokit } from '@octokit/rest'
import type { FileNode, RepoRef } from '../types'

function client(token: string): Octokit {
  return new Octokit({ auth: token })
}

/**
 * Every param not consumed by a GET endpoint's URL template is appended as a query string
 * param (see @octokit/endpoint's `parse.js`), so a plain `{owner, repo, tree_sha: branch}`
 * request hits the exact same URL on every call. That makes it a prime target for any GET
 * cache in the chain (the browser's HTTP cache in particular) to serve a stale snapshot
 * instead of hitting the network — which is what was making sync (and anything that reads
 * the tree first, like rename/move/delete) intermittently show stale data. Spreading this
 * into a request guarantees a unique URL every time, so nothing can cache-hit it.
 */
function noCache() {
  return { _: Date.now() }
}

/** Fetches the full recursive tree and returns only .md files, nested into a folder tree. */
export async function listMarkdownFiles(
  token: string,
  repo: RepoRef,
): Promise<FileNode[]> {
  const octokit = client(token)
  const { data: tree } = await octokit.git.getTree({
    owner: repo.owner,
    repo: repo.name,
    tree_sha: repo.branch,
    recursive: 'true',
    ...noCache(),
  })

  const mdPaths = (tree.tree ?? [])
    .filter((entry) => entry.type === 'blob' && entry.path?.endsWith('.md'))
    .map((entry) => entry.path as string)
    .sort()

  return buildFileTree(mdPaths)
}

export function buildFileTree(paths: string[]): FileNode[] {
  const root: FileNode[] = []

  for (const path of paths) {
    const segments = path.split('/')
    let level = root
    let accumulated = ''

    segments.forEach((segment, index) => {
      accumulated = accumulated ? `${accumulated}/${segment}` : segment
      const isFile = index === segments.length - 1

      let node = level.find((n) => n.name === segment)
      if (!node) {
        node = {
          path: accumulated,
          name: segment,
          type: isFile ? 'file' : 'dir',
          children: isFile ? undefined : [],
        }
        level.push(node)
      }
      if (!isFile) level = node.children as FileNode[]
    })
  }

  return root
}

export async function getFileContent(
  token: string,
  repo: RepoRef,
  path: string,
): Promise<{ content: string; sha: string }> {
  const octokit = client(token)
  const { data } = await octokit.repos.getContent({
    owner: repo.owner,
    repo: repo.name,
    path,
    ref: repo.branch,
    ...noCache(),
  })

  if (Array.isArray(data) || data.type !== 'file' || !data.content) {
    throw new Error(`"${path}" is not a readable file`)
  }

  const content = decodeURIComponent(
    escape(atob(data.content.replace(/\n/g, ''))),
  )
  return { content, sha: data.sha }
}

export async function commitFile(
  token: string,
  repo: RepoRef,
  path: string,
  content: string,
  previousSha: string,
  message: string,
): Promise<{ sha: string }> {
  const octokit = client(token)
  const encoded = btoa(unescape(encodeURIComponent(content)))

  // Let GitHub's own atomic sha check on the write be the source of truth, rather than a
  // separate pre-flight read-then-compare: that has a race window, and the Contents API can
  // briefly lag right after a write (e.g. a file just created and opened seconds earlier),
  // which was causing false "changed on GitHub" positives on a file nobody else touched.
  try {
    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner: repo.owner,
      repo: repo.name,
      path,
      message,
      content: encoded,
      sha: previousSha,
      branch: repo.branch,
    })
    return { sha: data.content?.sha ?? previousSha }
  } catch (err) {
    if (err instanceof Error && 'status' in err && (err.status === 409 || err.status === 422)) {
      throw new Error(
        `"${path}" changed on GitHub since it was loaded. Reload the file before saving.`,
      )
    }
    throw err
  }
}

export async function createFile(
  token: string,
  repo: RepoRef,
  path: string,
  content: string,
  message: string,
): Promise<{ sha: string }> {
  const octokit = client(token)
  const encoded = btoa(unescape(encodeURIComponent(content)))

  try {
    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner: repo.owner,
      repo: repo.name,
      path,
      message,
      content: encoded,
      branch: repo.branch,
    })
    return { sha: data.content?.sha ?? '' }
  } catch (err) {
    if (err instanceof Error && 'status' in err && err.status === 422) {
      throw new Error(`"${path}" already exists`)
    }
    throw err
  }
}

type TreeMode = '100644' | '100755' | '040000' | '160000' | '120000'
type TreeEntry = { path: string; mode: TreeMode; type: 'blob'; sha: string | null }
type MatchedBlob = { path: string; sha: string; mode: string; type: string }

/**
 * Loads the branch tip commit sha + its full recursive blob listing, for building a new
 * tree from. The ref lookup and the tree fetch don't depend on each other, so they run in
 * parallel; both are cache-busted (see `noCache`) so this always reflects the true latest
 * state before rename/move/delete build a new tree from it.
 */
async function getBaseTree(
  octokit: Octokit,
  repo: RepoRef,
): Promise<{ latestCommitSha: string; baseTreeSha: string; entries: MatchedBlob[] }> {
  const [{ data: ref }, { data: tree }] = await Promise.all([
    octokit.git.getRef({
      owner: repo.owner,
      repo: repo.name,
      ref: `heads/${repo.branch}`,
      ...noCache(),
    }),
    octokit.git.getTree({
      owner: repo.owner,
      repo: repo.name,
      tree_sha: repo.branch,
      recursive: 'true',
      ...noCache(),
    }),
  ])

  const entries = (tree.tree ?? []).filter(
    (entry): entry is MatchedBlob =>
      entry.type === 'blob' &&
      typeof entry.path === 'string' &&
      typeof entry.sha === 'string',
  )

  return { latestCommitSha: ref.object.sha, baseTreeSha: tree.sha, entries }
}

function blobsUnder(entries: MatchedBlob[], targetPath: string): MatchedBlob[] {
  return entries.filter(
    (entry) => entry.path === targetPath || entry.path.startsWith(`${targetPath}/`),
  )
}

/** Builds one tree + commit from `treeUpdates` and fast-forwards the branch to it. */
async function commitTreeUpdate(
  octokit: Octokit,
  repo: RepoRef,
  baseTreeSha: string,
  latestCommitSha: string,
  treeUpdates: TreeEntry[],
  message: string,
): Promise<void> {
  const { data: newTree } = await octokit.git.createTree({
    owner: repo.owner,
    repo: repo.name,
    base_tree: baseTreeSha,
    tree: treeUpdates,
  })

  const { data: newCommit } = await octokit.git.createCommit({
    owner: repo.owner,
    repo: repo.name,
    message,
    tree: newTree.sha,
    parents: [latestCommitSha],
  })

  await octokit.git.updateRef({
    owner: repo.owner,
    repo: repo.name,
    ref: `heads/${repo.branch}`,
    sha: newCommit.sha,
  })
}

/**
 * Renames or moves a file or an entire folder (every blob under `oldPath/`) in a single
 * commit, using the Git Data API to move blobs by sha without re-uploading content. A
 * cross-folder "move" is just a rename to a path with a different parent.
 */
export async function renamePath(
  token: string,
  repo: RepoRef,
  oldPath: string,
  newPath: string,
): Promise<void> {
  const octokit = client(token)
  const { latestCommitSha, baseTreeSha, entries } = await getBaseTree(octokit, repo)
  const matches = blobsUnder(entries, oldPath)

  if (matches.length === 0) {
    throw new Error(`Nothing found at "${oldPath}"`)
  }

  const treeUpdates: TreeEntry[] = matches.flatMap((entry) => {
    const destination = `${newPath}${entry.path.slice(oldPath.length)}`
    const mode = (entry.mode as TreeMode) ?? '100644'
    return [
      { path: entry.path, mode, type: 'blob' as const, sha: null },
      { path: destination, mode, type: 'blob' as const, sha: entry.sha },
    ]
  })

  await commitTreeUpdate(
    octokit,
    repo,
    baseTreeSha,
    latestCommitSha,
    treeUpdates,
    `Rename ${oldPath} to ${newPath}`,
  )
}

/** Deletes a file or an entire folder (every blob under `path/`) in a single commit. */
export async function deletePath(
  token: string,
  repo: RepoRef,
  path: string,
): Promise<void> {
  const octokit = client(token)
  const { latestCommitSha, baseTreeSha, entries } = await getBaseTree(octokit, repo)
  const matches = blobsUnder(entries, path)

  if (matches.length === 0) {
    throw new Error(`Nothing found at "${path}"`)
  }

  const treeUpdates: TreeEntry[] = matches.map((entry) => ({
    path: entry.path,
    mode: (entry.mode as TreeMode) ?? '100644',
    type: 'blob' as const,
    sha: null,
  }))

  await commitTreeUpdate(
    octokit,
    repo,
    baseTreeSha,
    latestCommitSha,
    treeUpdates,
    `Delete ${path}`,
  )
}

export async function listBranches(
  token: string,
  owner: string,
  name: string,
): Promise<string[]> {
  const octokit = client(token)
  const { data } = await octokit.repos.listBranches({ owner, repo: name })
  return data.map((b) => b.name)
}
