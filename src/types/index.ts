export interface RepoRef {
  owner: string
  name: string
  branch: string
}

export interface AppSettings {
  githubToken: string
  repo: RepoRef | null
}

export interface EncryptedBlob {
  salt: string
  iv: string
  ciphertext: string
}

export interface FileNode {
  path: string
  name: string
  type: 'file' | 'dir'
  children?: FileNode[]
}

export interface OpenFile {
  path: string
  content: string
  sha: string
  dirty: boolean
}
