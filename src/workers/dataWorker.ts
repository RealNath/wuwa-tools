import { get, set } from 'idb-keyval'

async function fetchData(type: string, version?: string, lang?: string) {
  let url: string
  if (type.toLowerCase() === 'multitext') {
    url = `https://raw.githubusercontent.com/Arikatsu/WutheringWaves_Data/refs/heads/${version}/Textmaps/${lang}/multi_text/MultiText.json`
  } else {
    throw new Error(`Unsupported type: ${type}`)
  }

  const cacheKey = `${type}-${version}-${lang}`

  // check if the data is already cached locally
  let cachedData = null
  try {
    cachedData = await get(cacheKey)
  } catch (e) {
    console.warn(`[Cache Warning] Could not read from IndexedDB:`, e)
  }

  if (cachedData) {
    console.log(`[Cache Hit] Loaded ${cacheKey} instantly!`)
    return cachedData
  }

  // if not, fetch it from GitHub
  console.log(`[Cache Miss] Downloading ${cacheKey}...`)
  const response = await fetch(url)
  const data = await response.text()

  // cache the downloaded text locally
  try {
    await set(cacheKey, data)
  } catch (e) {
    console.warn(`[Cache Warning] Could not save to IndexedDB:`, e)
  }

  return data
}

self.onmessage = async (event) => {
  const command = event.data.command

  if (command == 'fetch_data') {
    const { dataType, version, lang, limit } = event.data

    try {
      const jsonText = await fetchData(dataType, version, lang)
      const jsonData = JSON.parse(jsonText)

      self.postMessage({
        status: 'success',
        data: jsonData.slice(0, limit),
      })
    } catch (e) {
      self.postMessage({
        status: 'error',
        message: String(e),
      })
    }
  } else if (command == 'get_other_language') {
    const { input, version } = event.data
    const languages: string[] = [
      'de',
      'en',
      'es',
      'fr',
      'ja',
      'ko',
      'pt',
      'th',
      'zh-Hans',
      'zh-Hant',
    ]
    let data: any
    const jsonDataEn = await fetchData('multitext', version, 'en')

    type oLangDict = {
      [key: string]: string
    }
    const oLangList: oLangDict[] = []

    // 'g' to find all occurrences
    const idRegex = new RegExp(`"Id":\\s*"([^"]+)",\\s*"Content":\\s*"${input}"`, 'gi')

    // matchAll to get every single match
    const matches = [...jsonDataEn.matchAll(idRegex)]
    console.log(matches)

    // extract all the IDs into an array
    const ids = matches.map((m) => m[1])
    console.log(ids)

    // create empty dict for every ID
    ids.forEach(() => oLangList.push({}))

    for (const lang of languages) {
      try {
        data = await fetchData('multitext', version, lang)

        // loop through every ID, grab the language's string
        for (let i = 0; i < ids.length; i++) {
          const currentId = ids[i]
          const contentRegex = new RegExp(
            `"Id":\\s*"${currentId}",\\s*"Content":\\s*"((?:[^"\\\\]|\\\\.)*)"`,
          )
          const langMatch = data.match(contentRegex)

          if (langMatch) {
            oLangList[i]![lang] = langMatch[1]
          }
        }

        // wikiText for each Id
        const wikiTexts = oLangList
          .map((dict, index) => {
            return {
              id: ids[index],
              wikiText: `{{Other Languages
|en   = ${dict['en'] || ''}
|zhs  = ${dict['zh-Hans'] || ''}
|zht  = ${dict['zh-Hant'] || ''}
|ja   = ${dict['ja'] || ''}
|ko   = ${dict['ko'] || ''}
|fr   = ${dict['fr'] || ''}
|de   = ${dict['de'] || ''}
|es   = ${dict['es'] || ''}
|th   = ${dict['th'] || ''}
|pt   = ${dict['pt'] || ''}
}}`,
            }
          })
          .sort((a, b) => a.id.localeCompare(b.id))

        // send the array of objects back to the UI!
        self.postMessage({
          status: 'success',
          data: wikiTexts,
        })
      } catch (e) {
        self.postMessage({
          status: 'error',
          message: String(e),
        })
      }
    }
  }
}
