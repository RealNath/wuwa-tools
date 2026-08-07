import { fetchData, fetchMultiTextDict } from '@/workers/dataFetcher'

export async function handleFetchData(eventData: any) {
  const { dataType, lang, limit } = eventData

  if (dataType === 'multitext') {
    const dict = await fetchMultiTextDict(lang || 'en')
    const items = Object.entries(dict).map(([id, content]) => ({ Id: id, Content: content }))
    self.postMessage({
      status: 'success',
      data: limit ? items.slice(0, limit) : items,
    })
  } else if (dataType === 'questdata') {
    const data = await fetchData(dataType, lang)
    const mt = await fetchMultiTextDict(lang || 'en')

    // filter out a bunch of blank quest names
    const items = data.reduce((acc: any[], item: any) => {
      const tidName = item.Data?.TidName
      const questName = mt[tidName]

      if (questName && questName.trim() !== '') {
        acc.push({
          QuestId: item.QuestId,
          QuestName: questName,
        })
      }
      return acc
    }, [])
    self.postMessage({
      status: 'success',
      data: limit ? items.slice(0, limit) : items,
    })
  } else {
    const data = await fetchData(dataType, lang)
    // convert to array if it's an object so the view doesn't crash
    const items = Array.isArray(data)
      ? data
      : Object.entries(data).map(([k, v]) => ({ Id: k, Content: JSON.stringify(v) }))
    self.postMessage({
      status: 'success',
      data: limit ? items.slice(0, limit) : items,
    })
  }
}
