import { fetchMultiTextDict, getChunkId, getChunkData } from '@/workers/dataFetcher'

export async function handleGetOtherLanguage(eventData: any) {
  const { input, lang } = eventData
  const multiText = await fetchMultiTextDict(lang || 'en')

  const ids: string[] = []
  for (const [id, content] of Object.entries(multiText)) {
    if (content.toLowerCase() === input.toLowerCase()) {
      ids.push(id)
    }
  }
  console.log(`Found ${ids.length} matching IDs`)

  const wikiTexts = []
  for (const id of ids) {
    wikiTexts.push({
      id: id,
      wikiText: 'Loading data...',
    })
  }

  // Sort by ID
  wikiTexts.sort((a, b) => a.id.localeCompare(b.id))

  self.postMessage({
    status: 'success',
    data: wikiTexts,
  })
}

export async function handleGetOtherLanguageById(eventData: any) {
  const { id } = eventData

  const chunkId = getChunkId(id)
  const fetchedChunk = await getChunkData(chunkId)
  const itemData = fetchedChunk[id] || {}

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
    id: id,
    data: `{{Other Languages\n|en   = ${dict['en']}\n|zhs  = ${dict['zh-Hans']}\n|zht  = ${dict['zh-Hant']}\n|ja   = ${dict['ja']}\n|ko   = ${dict['ko']}\n|fr   = ${dict['fr']}\n|de   = ${dict['de']}\n|es   = ${dict['es']}\n|th   = ${dict['th']}\n|pt   = ${dict['pt']}\n}}`,
  })
}
