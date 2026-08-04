import { fetchData, fetchMultiTextDict, fetchFlowstateData } from '@/workers/dataFetcher'
import { getQuestStateKeys } from '@/workers/dialogue/questProcessor'
import { printDialogues } from '@/workers/dialogue/dialoguePrinter'

export async function handleExtractDialogue(eventData: any) {
  const { questId, lang } = eventData

  // fetch PlotHandbook
  const plothbData = await fetchData('plothandbook')

  const { stateKeys, stateKeyTips, flowListNames } = await getQuestStateKeys(questId, plothbData)

  if (stateKeys.length === 0) {
    throw new Error(`No valid state keys found for QuestId ${questId}.`)
  }

  // fetch the chunk files for each flowListName
  const flowstateData = await fetchFlowstateData(flowListNames)

  // fetch Multitext Dict
  const multitextDict = await fetchMultiTextDict(lang || 'en')

  const finalOutput = printDialogues(stateKeys, stateKeyTips, flowstateData, multitextDict)

  self.postMessage({
    status: 'success',
    data: finalOutput,
  })
}
