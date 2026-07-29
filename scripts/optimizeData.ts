import fs from 'fs'
import path from 'path'

const REPO_URL = 'https://api.github.com/repos/Arikatsu/WutheringWaves_Data'
const RAW_URL = 'https://raw.githubusercontent.com/Arikatsu/WutheringWaves_Data/refs/heads'

const LANGUAGES = ['de', 'en', 'es', 'fr', 'ja', 'ko', 'pt', 'th', 'zh-Hans', 'zh-Hant']

async function fetchJson(url: string) {
  console.log(`Fetching ${url}...`)
  const headers: Record<string, string> = { 'User-Agent': 'Node.js' }
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`
  }
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`)
  return res.json()
}

async function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function getChunkId(chunk_count: number, id: string): string {
  let hash = 5381
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) + hash + id.charCodeAt(i)
  }
  return Math.abs(hash % chunk_count)
    .toString(16)
    .padStart(2, '0')
}

async function optimizeMultiText(version: string, outDir: string) {
  const allDicts: Record<string, Record<string, string>> = {}

  await Promise.all(
    LANGUAGES.map(async (lang) => {
      const dict: Record<string, string> = {}
      const chunks = ['multi_text', 'multi_text_1sthalf', 'multi_text_2ndhalf']

      for (const chunk of chunks) {
        const url = `${RAW_URL}/${version}/Textmaps/${lang}/${chunk}/MultiText.json`
        try {
          const data = await fetchJson(url)
          for (const item of data) {
            if (!item.Id) continue
            if (chunk === 'multi_text' && item.RedirectDbIndex === 1) continue

            dict[item.Id] = item.Content
          }
        } catch (e) {
          console.warn(`Skipping ${chunk} for ${lang}:`, e)
        }
      }

      allDicts[lang] = dict
      const outFile = path.join(outDir, `multitext_${lang}.json`)
      fs.writeFileSync(outFile, JSON.stringify(dict))
      console.log(`Saved ${outFile} (Keys: ${Object.keys(dict).length})`)
    }),
  )

  // chunks based on id
  console.log('Generating chunked translation files...')
  const chunkDir = path.join(outDir, 'multitext_chunks')
  await ensureDir(chunkDir)

  const allIds = new Set<string>()
  for (const lang of LANGUAGES) {
    for (const id of Object.keys(allDicts[lang])) {
      allIds.add(id)
    }
  }

  const chunksData: Record<string, Record<string, Record<string, string>>> = {}

  for (const id of allIds) {
    const chunkId = getChunkId(64, id)
    if (!chunksData[chunkId]) {
      chunksData[chunkId] = {}
    }

    const translationGroup: Record<string, string> = {}
    for (const lang of LANGUAGES) {
      if (allDicts[lang][id] !== undefined) {
        translationGroup[lang] = allDicts[lang][id]
      }
    }
    chunksData[chunkId][id] = translationGroup
  }

  for (const [chunkId, data] of Object.entries(chunksData)) {
    const chunkFile = path.join(chunkDir, `chunk_${chunkId}.json`)
    fs.writeFileSync(chunkFile, JSON.stringify(data))
  }
  console.log(`Saved ${Object.keys(chunksData).length} chunk files to multitext_chunks/`)
}

async function optimizeFlowState(version: string, outDir: string) {
  const url = `${RAW_URL}/${version}/BinData/flowState/flowstate.json`

  // convert list of dict to dict (key: StateKey, value: the remaining key-value pairs)
  try {
    const data = await fetchJson(url)
    const optimized = data.reduce((acc: any, currentItem: any) => {
      const { StateKey, ...theRest } = currentItem
      acc[StateKey] = theRest
      return acc
    }, {})

    // chunks based on FlowListName
    console.log('Generating chunked flowstate files...')
    const chunkDir = path.join(outDir, 'flowstate_chunks')
    await ensureDir(chunkDir)

    const chunksData: Record<string, Record<string, any>> = {}

    for (const [stateKey, stateData] of Object.entries(optimized)) {
      // get FlowListName
      const stateKeyParts = stateKey.split('_')
      const flowListName = stateKeyParts.length >= 3 ? stateKeyParts.slice(0, -2).join('_') : stateKey

      const chunkId = getChunkId(64, flowListName)
      if (!chunksData[chunkId]) {
        chunksData[chunkId] = {}
      }

      chunksData[chunkId][stateKey] = stateData
    }

    for (const [chunkId, chunkContent] of Object.entries(chunksData)) {
      const chunkFile = path.join(chunkDir, `chunk_${chunkId}.json`)
      fs.writeFileSync(chunkFile, JSON.stringify(chunkContent))
    }
    console.log(`Saved ${Object.keys(chunksData).length} chunk files to flowstate_chunks/`)
  } catch (e) {
    console.log(e)
  }
}

async function optimizePlotHandbook(version: string, outDir: string) {
  const url = `${RAW_URL}/${version}/BinData/PlotHandBook/plothandbookconfig.json`
  try {
    const data = await fetchJson(url)

    // strip down plothandbook
    const optimized = data.map((item: any) => {
      let parsedData = []
      try {
        if (item.Data) {
          const raw = JSON.parse(item.Data)
          parsedData = raw.map((r: any) => ({
            TidTip: r.TidTip,
            Flow: {
              FlowListName: r.Flow?.FlowListName,
              FlowId: r.Flow?.FlowId,
              StateId: r.Flow?.StateId,
            },
          }))
        }
      } catch (e) {
        console.log(e)
      }

      return {
        QuestId: item.QuestId,
        Data: parsedData,
      }
    })

    const outFile = path.join(outDir, 'plothandbook.json')
    fs.writeFileSync(outFile, JSON.stringify(optimized))
    console.log(`Saved ${outFile}`)
  } catch (e) {
    console.warn(`Failed to process PlotHandbook:`, e)
  }
}

async function main() {
  console.log('Fetching latest version...')
  const versionRes = await fetch(REPO_URL)
  const versionData = await versionRes.json()
  const version = versionData.default_branch
  console.log(`Latest version: ${version}`)

  const outDir = path.join(process.cwd(), 'public', 'data')
  await ensureDir(outDir)
  fs.writeFileSync(path.join(outDir, '.gitignore'), '!*\n')

  await Promise.all([
    optimizePlotHandbook(version, outDir),
    optimizeFlowState(version, outDir),
    optimizeMultiText(version, outDir),
  ])

  console.log('All data optimized successfully!')
}

main().catch(console.error)
