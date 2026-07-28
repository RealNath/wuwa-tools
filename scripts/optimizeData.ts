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

async function optimizeMultiText(version: string, outDir: string) {
  for (const lang of LANGUAGES) {
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

    const outFile = path.join(outDir, `multitext_${lang}.json`)
    fs.writeFileSync(outFile, JSON.stringify(dict))
    console.log(`Saved ${outFile} (Keys: ${Object.keys(dict).length})`)
  }
}

async function optimizeFlowState(version: string, outDir: string) {
  const url = `${RAW_URL}/${version}/BinData/flowState/flowstate.json`
  try {
    const data = await fetchJson(url)
    const outFile = path.join(outDir, 'flowstate.json')
    fs.writeFileSync(outFile, JSON.stringify(data))
    console.log(`Saved ${outFile}`)
  } catch (e) {
    console.warn(`Failed to process FlowState:`, e)
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
      } catch {
        // Ignored
      }

      return {
        QuestId: item.QuestId,
        Data: parsedData, // Now a real object, not a stringified JSON!
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

  await optimizePlotHandbook(version, outDir)
  await optimizeFlowState(version, outDir)
  await optimizeMultiText(version, outDir)

  console.log('All data optimized successfully!')
}

main().catch(console.error)
