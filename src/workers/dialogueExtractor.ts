export function formatDialogue(characterName: string, dialogue: string, prefix = "_", multitextDict: Record<string, string>): string {
  let line = ''
  if (prefix === "dicon") {
    line = `{{DIcon}} ${dialogue}`
  } else {
    line = `'''${characterName}:''' ${dialogue}`
    line = line.replace(/\{PlayerName\}/g, "{{Rover}}")
  }

  line = line.replace(/<b>(.*?)<\/b>/g, "'''$1'''")
  line = line.replace(/\{Male=(.*?);Female=(.*?)\}/g, "{{MC|m=$1|f=$2}}")
  line = line.replace(/<ano=(.*?)>(.*?)<\/ano>/g, "{{Rubi|$2|$1}}")

  line = line.replace(/<te href=(\d+)>(.*?)<\/te>/g, (match, termId, text) => {
    const title = multitextDict[`Term${termId}_Title`] || ""
    const desc = multitextDict[`Term${termId}_Desc`] || ""
    return `{{Extra Effect|${text}|${title}|${desc}}}`
  })

  return line
}

export function getTalkFlowLines(parsedData: any[], multitextDict: Record<string, string>): string[] {
  const showTalks = parsedData.filter((item: any) => item.Name === "ShowTalk")
  if (showTalks.length === 0) return []

  const outputLines: string[] = []

  for (const showTalk of showTalks) {
    const params = showTalk.Params || {}
    const talkItemsList = params.TalkItems || []
    const talkItems: Record<number, any> = {}
    for (const item of talkItemsList) {
      talkItems[item.Id] = item
    }

    let talkSequence: number[][] = params.TalkSequence || []
    if (talkSequence.length === 0 && talkItemsList.length > 0) {
      talkSequence = [talkItemsList.map((item: any) => item.Id)]
    }

    const seqTransitions = params.SequenceTransitions || {}

    const talkIdToSeqIdx: Record<number, number> = {}
    for (let sIdx = 0; sIdx < talkSequence.length; sIdx++) {
      const currentSeq = talkSequence[sIdx]
      if (!currentSeq) continue
      for (const tId of currentSeq) {
        talkIdToSeqIdx[tId] = sIdx
      }
    }

    const visited = new Set<number>()

    function getNextSeqFromBranch(bSeqIdx: number | null): number | null {
      if (bSeqIdx === null || bSeqIdx >= talkSequence.length) return null
      const bSeq = talkSequence[bSeqIdx]
      const bTransList = seqTransitions[bSeqIdx.toString()] || []

      for (const trans of bTransList) {
        if (!trans.OptionTextKey) {
          return trans.NextSequenceIndex !== undefined ? trans.NextSequenceIndex : null
        }
      }

      if (bSeq && bSeq.length > 0) {
        const lastId = bSeq[bSeq.length - 1]
        const lastItem = lastId !== undefined ? talkItems[lastId] : undefined
        if (lastItem && lastItem.Actions) {
          for (const action of lastItem.Actions) {
            if (action.Name === "JumpTalk") {
              const targetTalkId = action.Params?.TalkId
              return talkIdToSeqIdx[targetTalkId] !== undefined ? talkIdToSeqIdx[targetTalkId] : null
            }
          }
        }
      }
      return bSeqIdx + 1
    }

    function traverse(seqIdx: number, indentLevel: number, stopSeqs: Set<number>) {
      if (visited.has(seqIdx) || seqIdx >= talkSequence.length || stopSeqs.has(seqIdx)) return
      visited.add(seqIdx)

      const seq = talkSequence[seqIdx]
      if (!seq) return
      const indent = ":".repeat(indentLevel)

      const transitions = seqTransitions[seqIdx.toString()] || []

      let hasBranchingOptions = false
      let optionsToBranch: {opt: any, branchSeqIdx: number | null}[] = []

      for (const talkId of seq) {
        const item = talkItems[talkId]
        if (!item) continue

        const tidTalk = item.TidTalk
        const whoId = item.WhoId
        if (tidTalk) {
          const characterName = multitextDict[`Speaker_${whoId}_Name`] || whoId?.toString() || ""
          const dialogue = multitextDict[tidTalk] || tidTalk

          const formattedDialogue = formatDialogue(characterName, dialogue, "_", multitextDict)
          outputLines.push(`${indent}${formattedDialogue}`)
        }

        if (item.Options && item.Options.length > 0) {
          const options = item.Options
          const branchTargets: (number | null)[] = []

          for (const opt of options) {
            const optTid = opt.TidTalkOption
            let branchSeqIdx: number | null = null

            for (const trans of transitions) {
              if (trans.OptionTextKey === opt.PlotLineKey || trans.OptionTextKey === optTid) {
                branchSeqIdx = trans.NextSequenceIndex !== undefined ? trans.NextSequenceIndex : null
                break
              }
            }

            if (branchSeqIdx === null) {
              if (opt.Actions) {
                for (const action of opt.Actions) {
                  if (action.Name === "JumpTalk") {
                    const tId = action.Params?.TalkId
                    branchSeqIdx = talkIdToSeqIdx[tId] !== undefined ? talkIdToSeqIdx[tId] : null
                    break
                  }
                }
              }
            }
            branchTargets.push(branchSeqIdx)
          }

          if (branchTargets.some((bt: any) => bt !== null)) {
            hasBranchingOptions = true
            optionsToBranch = options.map((opt: any, i: number) => ({ opt, branchSeqIdx: branchTargets[i] }))
            break
          } else {
            for (const opt of options) {
              const optTid = opt.TidTalkOption
              if (optTid) {
                const translatedOpt = multitextDict[optTid] || optTid
                const dialogueLine = formatDialogue("_", translatedOpt, "dicon", multitextDict)
                outputLines.push(`${indent}${dialogueLine}`)
              }
            }
          }
        }
      }

      if (hasBranchingOptions) {
        const nextSeqs = new Set<number>()

        for (const {opt, branchSeqIdx} of optionsToBranch) {
          const optTid = opt.TidTalkOption
          if (optTid) {
            const translatedOpt = multitextDict[optTid] || optTid
            const dialogueLine = formatDialogue("_", translatedOpt, "dicon", multitextDict)
            outputLines.push(`${indent}${dialogueLine}`)
          }

          if (branchSeqIdx !== null) {
            const nSeq = getNextSeqFromBranch(branchSeqIdx)
            if (nSeq !== null) nextSeqs.add(nSeq)

            const newStopSeqs = new Set(stopSeqs)
            for (const s of nextSeqs) newStopSeqs.add(s)
            traverse(branchSeqIdx, indentLevel + 1, newStopSeqs)
          }
        }

        if (nextSeqs.size === 1) {
          const singleSeq = Array.from(nextSeqs)[0]
          if (singleSeq !== undefined) {
            traverse(singleSeq, indentLevel, stopSeqs)
          }
        } else if (nextSeqs.size > 1) {
          const sortedNextSeqs = Array.from(nextSeqs).sort((a, b) => a - b)
          for (const nSeq of sortedNextSeqs) {
            traverse(nSeq, indentLevel, stopSeqs)
          }
        }
      } else {
        if (transitions && transitions.length > 0) {
          for (const trans of transitions) {
            const nSeq = trans.NextSequenceIndex
            if (nSeq !== undefined && nSeq !== null) {
              traverse(nSeq, indentLevel, stopSeqs)
            }
          }
        } else {
          traverse(seqIdx + 1, indentLevel, stopSeqs)
        }
      }
    }

    traverse(0, 1, new Set())
  }

  return outputLines
}

export function getNodeSequence(questId: number, questNodeData: Record<string, any>): { stateKeys: string[], stateKeyTips: Record<string, string> } {
  const nodes: Record<number, any> = {}

  for (const [key, nodeData] of Object.entries(questNodeData)) {
    if (key.startsWith(`${questId}_`)) {
      const nodeId = nodeData.Id
      if (nodeId !== undefined && nodeId !== null) {
        nodes[nodeId] = nodeData
      }
    }
  }

  if (Object.keys(nodes).length === 0) {
    return { stateKeys: [], stateKeyTips: {} }
  }

  let rootNodes = Object.values(nodes).filter((n: any) => n.ParentNodeId === 0)
  if (rootNodes.length === 0) {
    // Fallback: find nodes whose parent doesn't exist in this quest's nodes
    rootNodes = Object.values(nodes).filter((n: any) => !(n.ParentNodeId in nodes))
  }

  const childrenMap: Record<number, number[]> = {}
  for (const [nodeIdStr, node] of Object.entries(nodes)) {
    const nodeId = Number(nodeIdStr)
    const parentId = node.ParentNodeId
    if (parentId !== undefined && parentId !== null) {
      if (!childrenMap[parentId]) {
        childrenMap[parentId] = []
      }
      childrenMap[parentId].push(nodeId)
    }
  }

  const stateKeys: string[] = []
  const stateKeyTips: Record<string, string> = {}
  const visited = new Set<number>()

  function extractPlayFlowStates(obj: any, currentTip: string) {
    if (obj !== null && typeof obj === 'object' && !Array.isArray(obj)) {
      const flowList = obj.FlowListName
      const flowId = obj.FlowId
      const stateId = obj.StateId

      if (flowList && flowId !== undefined && flowId !== null && stateId !== undefined && stateId !== null) {
        const stateKey = `${flowList}_${flowId}_${stateId}`
        if (!stateKeys.includes(stateKey)) {
          stateKeys.push(stateKey)
          stateKeyTips[stateKey] = currentTip
        }
      }

      for (const value of Object.values(obj)) {
        extractPlayFlowStates(value, currentTip)
      }
    } else if (Array.isArray(obj)) {
      for (const item of obj) {
        extractPlayFlowStates(item, currentTip)
      }
    }
  }

  function traverse(nodeId: number, currentTip: string) {
    if (visited.has(nodeId)) return
    visited.add(nodeId)

    const node = nodes[nodeId]
    if (!node) return

    const tidTip = node.TidTip || ''
    if (tidTip) {
      currentTip = tidTip
    }

    extractPlayFlowStates(node, currentTip)

    const children = childrenMap[nodeId] || []
    for (const childId of children) {
      traverse(childId, currentTip)
    }
  }

  for (const root of rootNodes) {
    traverse(root.Id, '')
  }

  return { stateKeys, stateKeyTips }
}
