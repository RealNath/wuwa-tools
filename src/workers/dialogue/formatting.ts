export function formatDialogue(
  characterName: string,
  dialogue: string,
  prefix = '_',
  multitextDict: Record<string, string>,
): string {
  let line = ''
  if (prefix === 'dicon') {
    line = `{{DIcon}} ${dialogue}`
  } else {
    line = `'''${characterName}:''' ${dialogue}`
    line = line.replace(/\{PlayerName\}/g, '{{Rover}}')
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
