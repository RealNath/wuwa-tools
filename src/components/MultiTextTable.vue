<script setup lang="ts">
import { ref, shallowRef, computed, triggerRef, onMounted, onUnmounted, watch } from 'vue'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import DataWorker from '@/workers/dataWorker?worker'
import { Button } from '@/components/ui/button'

type MultiTextItem = {
  Id: string
  Content: string
}

const languages = ref<string[]>([
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
])

const searchQuery = ref<string>('')
const position = ref<string>('en')

const allItems = shallowRef<MultiTextItem[]>([])
const sortedItems = shallowRef<MultiTextItem[]>([])
const appliedSearchQuery = ref<string>('')
const isLoading = ref<boolean>(true)
let worker: Worker | null = null

const currentPage = ref(1)
const pageSize = ref(10)
const sortProp = ref<string>('')
const sortOrder = ref<string | null>(null)

function handleSearch() {
  appliedSearchQuery.value = searchQuery.value.trim().toLowerCase()
  currentPage.value = 1 // reset to first page
}

const handleSortChange = ({ prop, order }: { prop: string; order: string | null }) => {
  sortProp.value = prop
  sortOrder.value = order
}

const filteredItems = computed(() => {
  let result = allItems.value

  // filter based on searchQuery
  if (appliedSearchQuery.value) {
    result = result.filter(
      (item) =>
        item.Id.toLowerCase().includes(appliedSearchQuery.value) ||
        item.Content.toLowerCase().includes(appliedSearchQuery.value),
    )
  }

  return result
})

watch(
  [filteredItems, sortProp, sortOrder],
  ([newFilteredItems, newSortProp, newSortOrder]) => {
    isLoading.value = true
    worker?.postMessage({
      command: 'sort_data',
      data: newFilteredItems,
      prop: newSortProp,
      order: newSortOrder,
    })
  },
  { immediate: true },
)

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return sortedItems.value.slice(start, end)
})

const handleSizeChange = (val: number) => {
  pageSize.value = val
}
const handleCurrentChange = (val: number) => {
  currentPage.value = val
}

onMounted(() => {
  worker = new DataWorker()

  worker.onmessage = (event) => {
    const result = event.data

    if (result.command === 'sort_data_result') {
      if (result.status === 'success') {
        sortedItems.value = result.data
      } else {
        console.error(result.message)
      }
    } else if (result.status === 'success') {
      allItems.value = result.data
    } else {
      console.error(result.message)
    }

    isLoading.value = false
  }

  worker.postMessage({
    command: 'fetch_data',
    dataType: 'multitext',
    version: 'latest',
    lang: position.value,
  })
})

watch(position, (newLang) => {
  isLoading.value = true
  worker?.postMessage({
    command: 'fetch_data',
    dataType: 'multitext',
    version: 'latest',
    lang: newLang,
  })
})

onUnmounted(() => {
  if (worker) worker.terminate()
})
</script>

<template>
  <h1 class="text-3xl font-bold pb-4">MultiText Viewer</h1>
  <div class="border rounded-md bg-card text-card-foreground shadow-sm p-4 space-y-4">
    <div class="flex items-center pb-4 gap-2">
      <Input
        id="other-language-search"
        :disabled="isLoading"
        v-model="searchQuery"
        @keydown.enter="handleSearch"
        type="text"
        placeholder="Search Id or Content here."
      >
      </Input>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="outline" class="px-5">{{ position }}</Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Select a Language</DropdownMenuLabel>

            <DropdownMenuRadioGroup v-model="position">
              <DropdownMenuRadioItem v-for="lang in languages" :key="lang" :value="lang">
                {{ lang }}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    <el-table
      :data="paginatedItems"
      v-loading="isLoading"
      style="width: 100%"
      @sort-change="handleSortChange"
    >
      <el-table-column prop="Id" label="Id" sortable="custom" width="250" />
      <el-table-column prop="Content" label="Content" sortable="custom" />
      <template #empty>
        <div v-if="!isLoading">No results found.</div>
        <div v-else>Loading text data...</div>
      </template>
    </el-table>

    <div class="flex justify-center pt-2">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 25, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="filteredItems.length"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>
