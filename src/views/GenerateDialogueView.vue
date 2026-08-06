<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import DataWorker from '../workers/dataWorker?worker'

const searchQuery = ref<string>('')
const showStateKeys = ref<boolean>(false)
const showMissingDialogue = ref<boolean>(true)

const items = ref<any[]>([])
const errorMessage = ref<string>('')
const isLoading = ref(false)

let worker: Worker | null = null

function handleSearch() {
  if (!searchQuery.value) return
  isLoading.value = true
  errorMessage.value = ''
  worker?.postMessage({
    command: 'extract_dialogue',
    questId: Number(searchQuery.value),
    version: 'latest',
    lang: 'en',
    options: {
      showStateKeys: showStateKeys.value,
      showMissingDialogue: showMissingDialogue.value,
    },
  })
}

onMounted(() => {
  worker = new DataWorker()

  worker.onmessage = (event) => {
    const result = event.data

    if (result.status === 'success') {
      items.value = result.data
      console.log('Dialogue extracted!', result.data)
    } else {
      errorMessage.value = result.message
      console.log(result.message)
    }

    isLoading.value = false
  }
})

onUnmounted(() => {
  if (worker) worker.terminate()
})
</script>

<template>
  <div class="md:p-8">
    <h1 class="text-3xl font-bold">Generate Dialogue View</h1>
    <div class="flex items-center gap-2">
      <Input
        id="generate-dialogue-search"
        :disabled="isLoading"
        v-model="searchQuery"
        @keydown.enter="handleSearch"
        type="text"
        placeholder="QuestId (e.g '119000000')."
      >
      </Input>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="outline" class="px-4">Options</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-full">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Options</DropdownMenuLabel>
            <DropdownMenuCheckboxItem v-model="showStateKeys" @select.prevent>
              Show StateKeys
            </DropdownMenuCheckboxItem>

            <DropdownMenuCheckboxItem v-model="showMissingDialogue" @select.prevent>
              Show Missing Dialogue
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <div v-if="isLoading">Loading data...</div>
    <div v-else-if="errorMessage">Error: {{ errorMessage }}</div>
    <div v-else-if="items.length === 0" class="text-muted-foreground mt-4">
      Input a QuestId and press Enter to generate the dialogue.<br />
      <br />
      Do note that Show Missing Dialogue is enabled by default and may not be 100% accurate. Manual
      adjustments needed later.
    </div>
    <template v-else>
      <div
        v-for="(item, index) in items"
        :key="index"
        :class="[
          'min-h-6 whitespace-pre-wrap',
          item?.type === 'missing-dialogue' ? 'notice font-bold' : '',
        ]"
      >
        {{ item?.type ? item.content : item }}
      </div>
    </template>
  </div>
</template>

<style scoped>
#generate-dialogue-search {
  margin-top: 1rem;
  margin-bottom: 1rem;
}
ul {
  padding-left: 0;
}
li {
  margin-bottom: 0em;
  background: none;
  padding: 0em;
  border-radius: 8px;
  list-style: none;
}
</style>
