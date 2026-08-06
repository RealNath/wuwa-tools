export function formatDialogue(
  characterName: string,
  dialogue: string,
  prefix = '_',
  multitextDict: Record<string, string>,
  isPhone = false,
): string {
  let line = ''
  
  // Remove internal game tags from speaker names
  characterName = characterName.replace('{message} ', '')
  characterName = characterName.replace('{message}', '')

  if (prefix === 'dicon') {
    const dicon = isPhone ? '{Choice}' : '{{DIcon}}'
    line = `${dicon} ${dialogue}`
  } else if (prefix === 'center') {
    line = `'''${dialogue}'''`
    line = line.replace(/\{PlayerName\}/g, "{{Rover}}")
  } else {
    if (isPhone) {
      const speaker = characterName.replace(/\{PlayerName\}/g, '(Rover)')
      const replacedDialogue = dialogue.replace(/\{PlayerName\}/g, '{{Rover}}')
      if (!speaker) {
        line = `:${replacedDialogue}`
      } else {
        line = `'''${speaker}:''' ${replacedDialogue}`
      }
    } else {
      line = `'''${characterName}:''' ${dialogue}`
      line = line.replace(/\{PlayerName\}/g, '{{Rover}}')
    }
  }

  line = line.replace(/<b>(.*?)<\/b>/g, "'''$1'''")
  line = line.replace(/\{Male=(.*?);Female=(.*?)\}/g, '{{MC|m=$1|f=$2}}')
  line = line.replace(/<ano=(.*?)>(.*?)<\/ano>/g, '{{Rubi|$2|$1}}')

  line = line.replace(/<te href=(\d+)>(.*?)<\/te>/g, (match, termId, text) => {
    const title = multitextDict[`Term${termId}_Title`] || ''
    const desc = multitextDict[`Term${termId}_Desc`] || ''
    return `{{Extra Effect|${text}|${title}|${desc}}}`
  })

  return line
}
