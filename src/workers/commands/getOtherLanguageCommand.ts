import { fetchMultiTextDict, getChunkId, getChunkData } from '@/workers/dataFetcher'

export async function handleGetOtherLanguage(eventData: any) {
  const { input, lang } = eventData
  const multiText = await fetchMultiTextDict(lang || 'en')

  const questIds: string[] = []
  for (const [questId, content] of Object.entries(multiText)) {
    if (content.toLowerCase() === input.toLowerCase()) {
      questIds.push(questId)
    }
  }
  console.log(`Found ${questIds.length} matching IDs`)

  const wikiTexts = []
  for (const questId of questIds) {
    wikiTexts.push({
      questId: questId,
      wikiText: 'Loading data...',
    })
  }

  // Sort by ID
  wikiTexts.sort((a, b) => a.questId.localeCompare(b.questId))

  self.postMessage({
    status: 'success',
    data: wikiTexts,
  })
}

export async function handleGetOtherLanguageById(eventData: any) {
  const { questId } = eventData

  const chunkId = getChunkId(questId)
  const fetchedChunk = await getChunkData(chunkId)
  const itemData = fetchedChunk[questId] || {}

  const dict = {
    en: itemData['en'] || '',
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

  self.postMessage({
    status: 'success',
    command: 'get_other_language_by_id',
    questId: questId,
    data: `{{Other Languages\n|en   = ${dict['en']}\n|zhs  = ${dict['zh-Hans']}\n|zht  = ${dict['zh-Hant']}\n|ja   = ${dict['ja']}\n|ko   = ${dict['ko']}\n|fr   = ${dict['fr']}\n|de   = ${dict['de']}\n|es   = ${dict['es']}\n|th   = ${dict['th']}\n|pt   = ${dict['pt']}\n}}`,
  })
}
