import { fetchData } from '@/workers/dataFetcher'

interface QuestLinks {
  flowListDungeons: Record<string, number[]>
  realDungeons: Set<number>
  referencedFlowLists: Set<string>
  questDungeons: Map<string, Set<number>>
}

let cachedLinks: Promise<QuestLinks> | null = null

function collect(
  value: any,
  onDungeon: (dungeonId: number) => void,
  onFlowList: (flowListName: string) => void,
) {
  if (value === null || typeof value !== 'object') return

  if (value.DungeonId !== undefined && value.DungeonId !== null) {
    onDungeon(value.DungeonId)
  }
  if (value.FlowListName) {
    onFlowList(value.FlowListName)
  }

  for (const child of Object.values(value)) {
    collect(child, onDungeon, onFlowList)
  }
}

async function getLinks(plothbData: any): Promise<QuestLinks> {
  if (!cachedLinks) {
    cachedLinks = (async () => {
      const [flowListDungeons, dungeonPackInfo, questNodeData] = await Promise.all([
        fetchData('flow'),
        fetchData('dungeonpackinfo'),
        fetchData('questnodedata'),
      ])

      const realDungeons = new Set<number>(dungeonPackInfo)
      const referencedFlowLists = new Set<string>()
      const questDungeons = new Map<string, Set<number>>()

      // Flow lists referenced by any quest's dialogue
      for (const entries of Object.values(plothbData || {})) {
        for (const entry of entries as any[]) {
          const flowListName = entry.Flow?.FlowListName
          if (flowListName) referencedFlowLists.add(flowListName)
        }
      }

      // Dungeons used by each quest, plus the remaining referenced flow lists
      for (const [key, node] of Object.entries(questNodeData || {})) {
        const questId = key.split('_')[0]!
        let dungeons = questDungeons.get(questId)
        if (!dungeons) {
          dungeons = new Set<number>()
          questDungeons.set(questId, dungeons)
        }

        collect(
          node,
          (dungeonId) => dungeons.add(dungeonId),
          (flowListName) => referencedFlowLists.add(flowListName),
        )
      }

      return { flowListDungeons, realDungeons, referencedFlowLists, questDungeons }
    })()
  }

  return cachedLinks
}

// Flow lists that belong to one of the quest's dungeons but are not referenced by any quest
// (Dialogue that the quest data never points to)
export async function getMissingFlowLists(questId: number, plothbData: any): Promise<string[]> {
  const { flowListDungeons, realDungeons, referencedFlowLists, questDungeons } =
    await getLinks(plothbData)

  // Only real dungeon packs count; small ids like 0 or 8 are shared world maps
  const dungeons = new Set(
    [...(questDungeons.get(String(questId)) || [])].filter((dungeonId) =>
      realDungeons.has(dungeonId),
    ),
  )
  if (dungeons.size === 0) return []

  return Object.entries(flowListDungeons)
    .filter(
      ([flowListName, flowDungeons]) =>
        !referencedFlowLists.has(flowListName) &&
        flowDungeons.some((dungeonId) => dungeons.has(dungeonId)),
    )
    .map(([flowListName]) => flowListName)
    .sort()
}
