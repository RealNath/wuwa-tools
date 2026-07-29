import { get, set } from 'idb-keyval'

export async function fetchData(
  type: 'multitext' | 'flowstate' | 'plothandbook',
  lang?: string,
  version: string = Date.now().toString(),
) {
  const isLocal = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1'
  const baseUrl = !isLocal
    ? 'https://raw.githubusercontent.com/realnath/wuwa-tools/refs/heads/data'
    : '/data'

  let url = ''

  if (type === 'multitext') {
    url = `${baseUrl}/multitext_${lang || 'en'}.json`
  } else if (type === 'flowstate') {
    url = `${baseUrl}/flowstate.json`
  } else if (type === 'plothandbook') {
    url = `${baseUrl}/plothandbook.json`
  } else {
    throw new Error(`Unsupported type: ${type}`)
  }

  const response = await fetch(!isLocal ? url : `${url}?v=${version}`)
  if (!response.ok) {
    throw new Error(`Failed to load ${url}`)
  }

  return await response.json()
}

// in-memory cache for the MultiText dictionary so it's only parsed once per session
export const memoryCache: Record<string, Record<string, string>> = {}

export async function fetchMultiTextDict(lang: string): Promise<Record<string, string>> {
  if (memoryCache[lang]) {
    return memoryCache[lang]
  }

  const cacheKey = `multitext-${lang}`

  // find and load from persistent storage
  try {
    const cachedDict = await get(cacheKey)
    if (cachedDict) {
      console.log(`[Cache Hit] Loaded ${cacheKey} from Persistent Storage instantly!`)
      memoryCache[lang] = cachedDict
      return cachedDict
    }
  } catch (e) {
    console.warn(`Could not read from IndexedDB for ${lang}`, e)
  }

  try {
    const dict = await fetchData('multitext', lang)
    memoryCache[lang] = dict

    // save to persistent storage
    try {
      await set(cacheKey, dict)
    } catch (e) {
      console.warn(`Could not save to IndexedDB for ${lang}`, e)
    }

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
  const cacheKey = `chunk-${type}-${chunkId}`

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

    const url = `${baseUrl}/${type}_chunks/chunk_${chunkId}.json`

    const response = await fetch(!isLocal ? url : `${url}?v=${Date.now()}`)
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
