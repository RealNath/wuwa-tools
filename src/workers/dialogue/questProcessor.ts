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

export function interleaveMissingKeys(stateKeys: string[], missingStateKeys: string[]): { stateKeysList: string[], unplacedKeys: string[] } {
  const stateKeysList = [...stateKeys]
  const unplacedKeys: string[] = []
  
  for (const mk of missingStateKeys) {
    const parts = mk.split('_')
    if (parts.length < 3) {
      unplacedKeys.push(mk)
      continue
    }
    
    const mStateId = parseInt(parts[parts.length - 1]!, 10)
    const mFlowId = parts[parts.length - 2]!
    const mFlowListName = parts.slice(0, -2).join('_')
    
    if (isNaN(mStateId)) {
      unplacedKeys.push(mk)
      continue
    }
    
    let bestIdx = stateKeysList.length
    let foundSpot = false
    
    for (let i = 0; i < stateKeysList.length; i++) {
      const sk = stateKeysList[i]!
      const sParts = sk.split('_')
      if (sParts.length < 3) continue
      
      const sStateId = parseInt(sParts[sParts.length - 1]!, 10)
      const sFlowId = sParts[sParts.length - 2]!
      const sFlowListName = sParts.slice(0, -2).join('_')
      
      if (isNaN(sStateId)) continue
      
      if (sFlowListName === mFlowListName && sFlowId === mFlowId) {
        foundSpot = true
        if (sStateId > mStateId) {
          bestIdx = i
          break
        } else {
          bestIdx = i + 1
        }
      }
    }
    
    if (foundSpot) {
      stateKeysList.splice(bestIdx, 0, mk)
    } else {
      unplacedKeys.push(mk)
    }
  }
  
  return { stateKeysList, unplacedKeys }
}
