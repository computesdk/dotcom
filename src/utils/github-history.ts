// The benchmark history pages ([provider]/index.astro under sandboxes, storage,
// storage/snapshot-fork, browsers, and browsers/browser-throughput) are static
// routes generated once per provider. Every one of those pages independently
// listed the same GitHub directory and re-downloaded the same history files,
// which multiplies a handful of unique requests into dozens during a single build.
// Caching by URL for the lifetime of the build process dedupes those requests
// down to one per unique resource, since all static paths build in the same
// Node process.

export interface GithubFile {
  name: string
  download_url: string
}

const listingCache = new Map<string, Promise<GithubFile[]>>()
const fileCache = new Map<string, Promise<any>>()

export function fetchGithubDirectoryListing(
  url: string,
  headers: Record<string, string>
): Promise<GithubFile[]> {
  let cached = listingCache.get(url)
  if (!cached) {
    cached = fetch(url, { headers })
      .then((res) => (res.ok ? res.json() : []))
      .catch(() => [])
    listingCache.set(url, cached)
  }
  return cached
}

export function fetchGithubFile(url: string): Promise<any> {
  let cached = fileCache.get(url)
  if (!cached) {
    cached = fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
    fileCache.set(url, cached)
  }
  return cached
}
