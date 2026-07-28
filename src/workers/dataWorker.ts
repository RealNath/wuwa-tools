import { getActionsForStateKeys, getTalkFlowLines } from './dialogueExtractor'

async function fetchData(type: string, lang?: string, version: string = Date.now().toString()) {
  const isProd = import.meta.env.PROD
  const baseUrl = isProd
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

  const response = await fetch(isProd ? url : `${url}?v=${version}`)
  if (!response.ok) {
    throw new Error(`Failed to load ${url}`)
  }

  // With the new pre-processed files, they are extremely small,
  // so we can just parse and return the JS Object directly!
  return await response.json()
}

// In-Memory cache for the MultiText dictionary so it's only parsed once per session!
const memoryCache: Record<string, Record<string, string>> = {}

async function fetchMultiTextDict(lang: string): Promise<Record<string, string>> {
  if (memoryCache[lang]) {
    return memoryCache[lang]
  }

  try {
    // The optimized file is ALREADY a flat dictionary! No looping required.
    const dict = await fetchData('multitext', lang)
    memoryCache[lang] = dict
    return dict
  } catch (e) {
    console.warn(`Could not load multitext for ${lang}`, e)
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
    const languages: string[] = [
      'de',
      'en',
      'es',
      'fr',
      'ja',
      'ko',
      'pt',
      'th',
      'zh-Hans',
      'zh-Hant',
    ]
    try {
      const multiText = await fetchMultiTextDict('en')

      const ids: string[] = []
      for (const [id, content] of Object.entries(multiText)) {
        if (content.toLowerCase() === input.toLowerCase()) {
          ids.push(id)
        }
      }
      console.log(`Found ${ids.length} matching IDs`)

      const wikiTexts = []

      const allDicts: Record<string, Record<string, string>> = {}
      for (const lang of languages) {
        allDicts[lang] = await fetchMultiTextDict(lang)
      }

      for (const id of ids) {
        const dict = {
          en: multiText[id] || '',
          'zh-Hans': allDicts['zh-Hans']?.[id] || '',
          'zh-Hant': allDicts['zh-Hant']?.[id] || '',
          ja: allDicts['ja']?.[id] || '',
          ko: allDicts['ko']?.[id] || '',
          fr: allDicts['fr']?.[id] || '',
          de: allDicts['de']?.[id] || '',
          es: allDicts['es']?.[id] || '',
          th: allDicts['th']?.[id] || '',
          pt: allDicts['pt']?.[id] || '',
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
