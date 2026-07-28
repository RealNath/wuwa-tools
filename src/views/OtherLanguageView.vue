<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
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
import DataWorker from '../workers/dataWorker?worker'
import { Button } from '@/components/ui/button'

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

const items = ref<any[]>([])
const errorMessage = ref<string>('')
const isLoading = ref(false)

let worker: Worker | null = null

function handleSearch() {
  if (!searchQuery.value) return
  isLoading.value = true
  worker?.postMessage({
    command: 'get_other_language',
    input: searchQuery.value,
    lang: position.value,
    version: 'latest',
  })
}

function getOtherLanguageById(event: Event, item: any) {
  const detailsElement = event.target as HTMLDetailsElement
  if (detailsElement.open && item.wikiText === 'Loading data...') {
    worker?.postMessage({
      command: 'get_other_language_by_id',
      questId: item.questId,
    })
  }
}

onMounted(() => {
  worker = new DataWorker()

  worker.onmessage = (event) => {
    const result = event.data

    if (result.command === 'get_other_language_by_id') {
      if (result.status === 'success') {
        const foundItem = items.value.find((i) => i.questId === result.questId)
        if (foundItem) {
          foundItem.wikiText = result.data
        }
      }
    } else {
      if (result.status === 'success') {
        items.value = result.data
      } else {
        errorMessage.value = result.message
      }
    }

    isLoading.value = false
  }
})

onUnmounted(() => {
  if (worker) worker.terminate()
})
</script>

<template>
  <div class="other-language">
    <h1 class="text-3xl font-bold">Other Language</h1>
    <div class="flex items-center gap-2">
      <Input
        id="other-language-search"
        :disabled="isLoading"
        v-model="searchQuery"
        @keydown.enter="handleSearch"
        type="text"
        placeholder="Search for the exact full string here."
      >
      </Input>
      <DropdownMenu>

        <DropdownMenuTrigger as-child>
          <Button variant="outline">{{ position }}</Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent>

          <DropdownMenuGroup>
            <DropdownMenuLabel>Select a Language (WIP)</DropdownMenuLabel>

            <DropdownMenuRadioGroup v-model="position">
              <DropdownMenuRadioItem v-for="lang in languages" :key="lang" :value="lang">
                {{ lang }}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>

        </DropdownMenuContent>

      </DropdownMenu>
    </div>

    <div v-if="isLoading">Loading data...</div>
    <div v-else-if="errorMessage">Error: {{ errorMessage }}</div>
    <ul v-else>
      <li v-for="item in items" :key="item.questId">
        <details @toggle="getOtherLanguageById($event, item)">
          <summary>ID: {{ item.questId }}</summary>
          <pre>{{ item.wikiText }}</pre>
        </details>
      </li>
    </ul>
  </div>
</template>

<style>
.other-language {
  padding: 2rem;
}
#other-language-search {
  margin-top: 1rem;
  margin-bottom: 1rem;
}
ul {
  padding-left: 0;
}
li {
  margin-bottom: 1em;
  background: #1e1e1e;
  padding: 1em;
  border-radius: 8px;
  list-style: none;
}
</style>
