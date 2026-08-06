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

  const options = eventData.options

  let finalOutput: any[] = printDialogues(
    stateKeys,
    stateKeyTips,
    flowstateData,
    multitextDict,
    options,
  )

  if (options.showMissingDialogue) {
    const missingKeys: string[] = []
    const stateKeysSet = new Set(stateKeys)

    for (const stateKey in flowstateData) {
      if (!stateKeysSet.has(stateKey)) {
        for (const fln of flowListNames) {
          if (stateKey.startsWith(`${fln}_`)) {
            missingKeys.push(stateKey)
            break
          }
        }
      }
    }

    if (missingKeys.length > 0) {
      finalOutput.push('')
      finalOutput.push('')
      finalOutput.push({
        type: 'missing-dialogue',
        content: '==================================================',
      })
      finalOutput.push({ type: 'missing-dialogue', content: 'MISSING FROM EXTRACTED DATA' })
      finalOutput.push({
        type: 'missing-dialogue',
        content: '==================================================',
      })
      finalOutput.push('')

      const missingOutput = printDialogues(missingKeys, {}, flowstateData, multitextDict, options)
      finalOutput = finalOutput.concat(missingOutput)
    }
  }

  self.postMessage({
    status: 'success',
    data: finalOutput,
  })
}
