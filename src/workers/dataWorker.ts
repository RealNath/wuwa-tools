import { handleFetchData } from '@/workers/commands/fetchDataCommand'
import { handleGetOtherLanguage, handleGetOtherLanguageById } from '@/workers/commands/getOtherLanguageCommand'
import { handleExtractDialogue } from '@/workers/commands/extractDialogueCommand'

self.onmessage = async (event) => {
  const command = event.data.command

  try {
    if (command === 'fetch_data') {
      await handleFetchData(event.data)
    } else if (command === 'get_other_language') {
      await handleGetOtherLanguage(event.data)
    } else if (command === 'get_other_language_by_id') {
      await handleGetOtherLanguageById(event.data)
    } else if (command === 'extract_dialogue') {
      await handleExtractDialogue(event.data)
    } else {
      console.warn(`Unknown command: ${command}`)
    }
  } catch (e) {
    self.postMessage({
      status: 'error',
      message: String(e),
    })
  }
}
