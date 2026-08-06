import { getTalkFlowLines } from '@/workers/dialogue/flowParser'

export function printDialogues(
  stateKeys: string[],
  stateKeyTips: Record<string, string>,
  flowstateData: Record<string, any>,
  multitextDict: Record<string, string>,
  options: { showStateKeys: boolean, showMissingDialogue: boolean }
): string[] {
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

        if (options.showStateKeys) {
          finalOutput.push(`;StateKey: ${stateKey}`)
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

  return finalOutput
}
