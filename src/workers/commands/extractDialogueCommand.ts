import { fetchData, fetchMultiTextDict, fetchFlowstateData } from '@/workers/dataFetcher'
import { getTalkFlowLines, getNodeSequence } from '@/workers/dialogueExtractor'

export async function handleExtractDialogue(eventData: any) {
  const { questId, lang } = eventData

  // fetch PlotHandbook
  const plothbData = await fetchData('plothandbook')

  let parsedData = plothbData[questId]
  let stateKeys: string[] = []
  const flowListNames = new Set<string>()
  let stateKeyTips: Record<string, string> = {}

  if (parsedData) {
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
  } else {
    console.log(`QuestId ${questId} not found in plothandbookconfig.json. Falling back to questnodedata.json...`)
    const questNodeData = await fetchData('questnodedata')
    const sequence = getNodeSequence(questId, questNodeData)
    stateKeys = sequence.stateKeys
    stateKeyTips = sequence.stateKeyTips

    for (const key of stateKeys) {
      const parts = key.split('_')
      const flowListName = parts.slice(0, -2).join('_')
      if (flowListName) {
        flowListNames.add(flowListName)
      }
    }
  }

  if (stateKeys.length === 0) {
    throw new Error(`No valid state keys found for QuestId ${questId}.`)
  }

  // fetch the chunk files for each flowListName
  const flowstateData = await fetchFlowstateData(flowListNames)

  // fetch Multitext Dict
  const multitextDict = await fetchMultiTextDict(lang || 'en')

  let firstPrint = true
  let lastPrintedTip = ''
  const finalOutput: string[] = []

  for (const stateKey of stateKeys) {
    const actionString = flowstateData[stateKey]?.Actions
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
