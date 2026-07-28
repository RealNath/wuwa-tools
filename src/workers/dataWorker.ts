import { getActionsForStateKeys, getTalkFlowLines } from './dialogueExtractor'
import { get, set } from 'idb-keyval'

async function fetchData(type: string, lang?: string, version: string = Date.now().toString()) {
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

  // With the new pre-processed files, they are extremely small,
  // so we can just parse and return the JS Object directly!
  return await response.json()
}

// In-Memory cache for the MultiText dictionary so it's only parsed once per session
const memoryCache: Record<string, Record<string, string>> = {}

async function fetchMultiTextDict(lang: string): Promise<Record<string, string>> {
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

function getChunkId(id: string): string {
  let hash = 5381
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) + hash) + id.charCodeAt(i)
  }
  return Math.abs(hash % 64).toString(16).padStart(2, '0')
}

const chunkCache: Record<string, any> = {}
async function getChunkData(chunkId: string) {
  if (chunkCache[chunkId]) return chunkCache[chunkId]

  const cacheKey = `chunk-${chunkId}`
  try {
    const cached = await get(cacheKey)
    if (cached) {
      chunkCache[chunkId] = cached
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
    const url = `${baseUrl}/chunks/chunk_${chunkId}.json`
    const response = await fetch(!isLocal ? url : `${url}?v=${Date.now()}`)
    if (!response.ok) throw new Error(`Failed to load chunk ${chunkId}`)
    const data = await response.json()

    chunkCache[chunkId] = data
    try { await set(cacheKey, data) } catch (e) {
      console.log(e)
    }
    return data
  } catch (e) {
    console.warn(e)
    return {}
  }
}

self.onmessage = async (event) => {
  const command = event.data.command

  if (command == 'fetch_data') {
    const { dataType, lang, limit } = event.data

    try {
      if (dataType === 'multitext') {
        const dict = await fetchMultiTextDict(lang || 'en')
        const items = Object.entries(dict).map(([id, content]) => ({ Id: id, Content: content }))
        self.postMessage({
          status: 'success',
          data: items.slice(0, limit),
        })
      } else {
        const data = await fetchData(dataType, lang)
        // Convert to array if it's an object so the view doesn't crash
        const items = Array.isArray(data)
          ? data
          : Object.entries(data).map(([k, v]) => ({ Id: k, Content: JSON.stringify(v) }))
        self.postMessage({
          status: 'success',
          data: items.slice(0, limit),
        })
      }
    } catch (e) {
      self.postMessage({
        status: 'error',
        message: String(e),
      })
    }
  } else if (command == 'get_other_language') {
    const { input } = event.data
    try {
      const multiText = await fetchMultiTextDict('en')

      const ids: string[] = []
      for (const [id, content] of Object.entries(multiText)) {
        if (content.toLowerCase() === input.toLowerCase()) {
          ids.push(id)
        }
      }
      console.log(`Found ${ids.length} matching IDs`)

      const chunkIds = new Set<string>()
      for (const id of ids) {
        chunkIds.add(getChunkId(id))
      }

      const chunkData: Record<string, any> = {}
      await Promise.all(
        Array.from(chunkIds).map(async (chunkId) => {
          chunkData[chunkId] = await getChunkData(chunkId)
        })
      )

      const wikiTexts = []
      for (const id of ids) {
        const chunkId = getChunkId(id)
        const itemData = chunkData[chunkId]?.[id] || {}

        const dict = {
          en: itemData['en'] || multiText[id] || '',
          'zh-Hans': itemData['zh-Hans'] || '',
          'zh-Hant': itemData['zh-Hant'] || '',
          ja: itemData['ja'] || '',
          ko: itemData['ko'] || '',
          fr: itemData['fr'] || '',
          de: itemData['de'] || '',
          es: itemData['es'] || '',
          th: itemData['th'] || '',
          pt: itemData['pt'] || '',
        }

        wikiTexts.push({
          id,
          wikiText: `{{Other Languages\n|en   = ${dict['en']}\n|zhs  = ${dict['zh-Hans']}\n|zht  = ${dict['zh-Hant']}\n|ja   = ${dict['ja']}\n|ko   = ${dict['ko']}\n|fr   = ${dict['fr']}\n|de   = ${dict['de']}\n|es   = ${dict['es']}\n|th   = ${dict['th']}\n|pt   = ${dict['pt']}\n}}`,
        })
      }

      // Sort by ID
      wikiTexts.sort((a, b) => a.id.localeCompare(b.id))

      self.postMessage({
        status: 'success',
        data: wikiTexts,
      })
    } catch (e) {
      self.postMessage({
        status: 'error',
        message: String(e),
      })
    }
  } else if (command == 'extract_dialogue') {
    const { questId, lang } = event.data

    try {
      // fetch PlotHandbook
      const plothbData = await fetchData('plothandbook')

      let parsedData = null
      for (const item of plothbData) {
        if (item.QuestId === questId) {
          // The optimized script already parsed Data!
          parsedData = item.Data
          break
        }
      }

      if (!parsedData) {
        throw new Error(`QuestId ${questId} not found in plothandbookconfig.json`)
      }

      const stateKeys: string[] = []
      const stateKeyTips: Record<string, string> = {}
      let currentTip = ''

      for (const item of parsedData) {
        const tidTip = item.TidTip || ''
        if (tidTip) {
          currentTip = tidTip
        }

        const flow = item.Flow || {}
        const flowListName = flow.FlowListName || ''
        const flowId = flow.FlowId || 0
        const stateId = flow.StateId || 0

        if (!flowListName) continue

        const stateKey = `${flowListName}_${flowId}_${stateId}`
        stateKeys.push(stateKey)
        stateKeyTips[stateKey] = currentTip
      }

      if (stateKeys.length === 0) {
        throw new Error(`No valid state keys found for QuestId ${questId}.`)
      }

      // fetch FlowState
      const flowstateData = await fetchData('flowstate')
      const actionsDict = getActionsForStateKeys(flowstateData, stateKeys)

      // fetch Multitext Dict
      const multitextDict = await fetchMultiTextDict(lang || 'en')

      let firstPrint = true
      let lastPrintedTip = ''
      const finalOutput: string[] = []

      for (const stateKey of stateKeys) {
        const actionString = actionsDict[stateKey]
        if (actionString) {
          const parsedActions = JSON.parse(actionString)
          const lines = getTalkFlowLines(parsedActions, multitextDict)

          if (lines && lines.length > 0) {
            if (!firstPrint) {
              finalOutput.push('----')
            }

            const tipKey = stateKeyTips[stateKey] || ''
            if (tipKey && tipKey !== lastPrintedTip) {
              const translatedTip = multitextDict[tipKey] || tipKey
              if (translatedTip.trim()) {
                finalOutput.push(`;${translatedTip}`)
              }
              lastPrintedTip = tipKey
            }

            for (const line of lines) {
              finalOutput.push(line)
            }
            firstPrint = false
          }
        }
      }

      self.postMessage({
        status: 'success',
        data: finalOutput,
      })
    } catch (e) {
      self.postMessage({
        status: 'error',
        message: String(e),
      })
    }
  }
}
