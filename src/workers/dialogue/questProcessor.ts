import { fetchData } from '@/workers/dataFetcher'
import { getNodeSequence } from '@/workers/dialogue/flowParser'

export async function getQuestStateKeys(questId: number, plothbData: any): Promise<{ stateKeys: string[], stateKeyTips: Record<string, string>, flowListNames: Set<string> }> {
  const parsedData = plothbData[questId]
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

  return { stateKeys, stateKeyTips, flowListNames }
}
