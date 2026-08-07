import { get, set } from 'idb-keyval'

let currentDataVersion: string | null = null

export async function getDataVersion(): Promise<string> {
  if (currentDataVersion) return currentDataVersion

  const isLocal = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1'
  const baseUrl = !isLocal
    ? 'https://raw.githubusercontent.com/realnath/wuwa-tools/refs/heads/data'
    : '/data'

  try {
    const response = await fetch(`${baseUrl}/version.json?v=${Date.now()}`)
    if (response.ok) {
      const data = await response.json()
      currentDataVersion = data.version
      return currentDataVersion!
    }
  } catch (e) {
    console.warn('Could not fetch version.json', e)
  }

  currentDataVersion = 'unknown'
  return currentDataVersion
}

export async function fetchData(
  type: 'multitext' | 'plothandbook' | 'questdata' | 'questnodedata',
  lang?: string,
) {
  const version = await getDataVersion()
  const isLocal = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1'
  const baseUrl = !isLocal
    ? 'https://raw.githubusercontent.com/realnath/wuwa-tools/refs/heads/data'
    : '/data'

  let url = ''
  let cacheKey = `${type}-${version}`

  if (type === 'multitext') {
    url = `${baseUrl}/multitext/multitext_${lang || 'en'}.json`
    cacheKey = `multitext-${lang || 'en'}-${version}`
  } else if (type === 'plothandbook') {
    url = `${baseUrl}/plothandbook.json`
  } else if (type === 'questdata') {
    url = `${baseUrl}/questdata.json`
  } else if (type === 'questnodedata') {
    url = `${baseUrl}/questnodedata.json`
  } else {
    throw new Error(`Unsupported type: ${type}`)
  }

  // find and load from persistent storage
  try {
    const cached = await get(cacheKey)
    if (cached) {
      console.log(`[Cache Hit] Loaded ${cacheKey} from Persistent Storage instantly!`)
      return cached
    }
  } catch (e) {
    console.warn(`Could not read from IndexedDB for ${cacheKey}`, e)
  }

  const response = await fetch(`${url}?v=${Date.now()}`) // bypass HTTP cache since we use IDB
  if (!response.ok) {
    throw new Error(`Failed to load ${url}`)
  }

  const data = await response.json()
  
  // save to persistent storage
  try {
    await set(cacheKey, data)
  } catch (e) {
    console.warn(`Could not save to IndexedDB for ${cacheKey}`, e)
  }

  return data
}

// in-memory cache for the MultiText dictionary so it's only parsed once per session
export const memoryCache: Record<string, Record<string, string>> = {}

export async function fetchMultiTextDict(lang: string): Promise<Record<string, string>> {
  if (memoryCache[lang]) {
    return memoryCache[lang]
  }

  try {
    const dict = await fetchData('multitext', lang)
    memoryCache[lang] = dict
    return dict
  } catch (e) {
    console.warn(`Could not load multitext for ${lang}`, e)
    return {}
  }
}

export function getChunkId(chunk_count: number, id: string): string {
  let hash = 5381
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) + hash + id.charCodeAt(i)
  }
  return Math.abs(hash % chunk_count)
    .toString(16)
    .padStart(2, '0')
}

export const chunkCache: Record<string, any> = {}

export async function getChunkData(type: 'multitext' | 'flowstate', chunkId: string) {
  const version = await getDataVersion()
  const cacheKey = `chunk-${type}-${chunkId}-${version}`

  if (chunkCache[cacheKey]) return chunkCache[cacheKey]

  try {
    const cached = await get(cacheKey)
    if (cached) {
      chunkCache[cacheKey] = cached
      return cached
    }
  } catch (e) {
    console.log(e)
  }

  try {
    const isLocal = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1'
    const baseUrl = !isLocal
      ? 'https://raw.githubusercontent.com/realnath/wuwa-tools/refs/heads/data'
      : '/data'

    const url = `${baseUrl}/${type}/${type}_chunks/chunk_${chunkId}.json`

    const response = await fetch(`${url}?v=${Date.now()}`) // bypass HTTP cache since we use IDB
    if (!response.ok) throw new Error(`Failed to load chunk ${chunkId}`)
    const data = await response.json()

    chunkCache[cacheKey] = data
    try {
      await set(cacheKey, data)
    } catch (e) {
      console.log(e)
    }
    return data
  } catch (e) {
    console.warn(e)
    return {}
  }
}

export async function fetchFlowstateData(flowListNames: Iterable<string>): Promise<Record<string, any>> {
  const flowstateData: Record<string, any> = {}
  for (const flowListName of flowListNames) {
    const chunkId = getChunkId(64, flowListName)
    const fetchedChunk = await getChunkData('flowstate', chunkId)
    Object.assign(flowstateData, fetchedChunk)
  }
  return flowstateData
}
