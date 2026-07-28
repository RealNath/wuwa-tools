import { fetchData, fetchMultiTextDict } from '@/workers/dataFetcher'

export async function handleFetchData(eventData: any) {
  const { dataType, lang, limit } = eventData

  if (dataType === 'multitext') {
    const dict = await fetchMultiTextDict(lang || 'en')
    const items = Object.entries(dict).map(([id, content]) => ({ Id: id, Content: content }))
    self.postMessage({
      status: 'success',
      data: items.slice(0, limit),
    })
  } else {
    const data = await fetchData(dataType, lang)
    // convert to array if it's an object so the view doesn't crash
    const items = Array.isArray(data)
      ? data
      : Object.entries(data).map(([k, v]) => ({ Id: k, Content: JSON.stringify(v) }))
    self.postMessage({
      status: 'success',
      data: items.slice(0, limit),
    })
  }
}
