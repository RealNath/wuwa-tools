import { fetchData, fetchFlowstateData, fetchMultiTextDict } from '@/workers/dataFetcher'
import { printDialogues } from '@/workers/dialogue/dialoguePrinter'

type SolarSchoolFlowMap = Record<string, [number, number][]>

export function getSolarSchoolListLabel(flowListName: string): string {
  return flowListName.replace(/^剧情_3\.8[^_]*_/, '')
}

export async function handleExtractSolarSchoolDialogue(eventData: any) {
  const { flowListNames, lang } = eventData
  const options = eventData.options || {}

  const flowMap: SolarSchoolFlowMap = await fetchData('solarschoolflow')
  const allLists = Object.keys(flowMap)

  const selectedLists =
    Array.isArray(flowListNames) && flowListNames.length > 0
      ? allLists.filter((flowListName) => flowListNames.includes(flowListName))
      : allLists

  if (selectedLists.length === 0) {
    throw new Error('No SolarSchool flow lists selected.')
  }

  const flowstateData = await fetchFlowstateData(selectedLists)

  const [multitextDict, plotAudioDict] = await Promise.all([
    fetchMultiTextDict(lang || 'en'),
    fetchData('plotaudio'),
  ])

  const finalOutput: string[] = []

  for (const flowListName of selectedLists) {
    // rows are already in flow order (FlowId, StateId) in the optimized map
    const stateKeys = (flowMap[flowListName] || []).map(
      ([flowId, stateId]) => `${flowListName}_${flowId}_${stateId}`,
    )
    if (stateKeys.length === 0) continue

    const lines = printDialogues(
      stateKeys,
      {},
      flowstateData,
      multitextDict,
      plotAudioDict,
      options,
    )
    if (lines.length === 0) continue

    if (finalOutput.length > 0) {
      finalOutput.push('')
      finalOutput.push('')
    }

    if (options.showListHeaders !== false) {
      const label = getSolarSchoolListLabel(flowListName)
      finalOutput.push(`;=== ${label} (${stateKeys.length} states) ===`)
      finalOutput.push('')
    }

    finalOutput.push(...lines)
  }

  if (finalOutput.length === 0) {
    throw new Error('No dialogue found for the selected SolarSchool flow lists.')
  }

  self.postMessage({
    status: 'success',
    kind: 'dialogue',
    data: finalOutput,
  })
}
