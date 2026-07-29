import { fetchData, fetchMultiTextDict, getChunkId, getChunkData } from '@/workers/dataFetcher'
import { getActionsForStateKeys, getTalkFlowLines } from '@/workers/dialogueExtractor'

export async function handleExtractDialogue(eventData: any) {
  const { questId, lang } = eventData

  // fetch PlotHandbook
  const plothbData = await fetchData('plothandbook')

  let parsedData = null
  for (const item of plothbData) {
    if (item.QuestId === questId) {
      parsedData = item.Data
      break
    }
  }

  if (!parsedData) {
    throw new Error(`QuestId ${questId} not found in plothandbookconfig.json`)
  }

  const stateKeys: string[] = []
  const flowListNames = new Set<string>()
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
    flowListNames.add(flowListName)
    stateKeyTips[stateKey] = currentTip
  }

  if (stateKeys.length === 0) {
    throw new Error(`No valid state keys found for QuestId ${questId}.`)
  }

  // fetch the chunk file of each flowListName
  const flowstateData: Record<string, any> = {}
  for (const flowListName of flowListNames) {
    const chunkId = getChunkId(64, flowListName)
    const fetchedChunk = await getChunkData('flowstate', chunkId)
    // merge the chunk data to a dict
    Object.assign(flowstateData, fetchedChunk)
  }

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
}
