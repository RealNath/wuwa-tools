<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import LanguageRadioGroup from '@/components/LanguageRadioGroup.vue'
import DataWorker from '../workers/dataWorker?worker'

const audioLangs = ['None', 'en', 'ja', 'ko', 'zh']

const flowListNames = ref<string[]>([])
const listCounts = ref<Record<string, number>>({})
const selectedLists = ref<string[]>([])

const audioLangPosition = ref<string>('en')
const langPosition = ref<string>('en')
const showStateKeys = ref<boolean>(false)
const showListHeaders = ref<boolean>(true)

const items = ref<string[]>([])
const errorMessage = ref<string>('')
const isLoading = ref<boolean>(false)
const isLoadingLists = ref<boolean>(true)

let worker: Worker | null = null

const allSelected = computed(
  () => flowListNames.value.length > 0 && selectedLists.value.length === flowListNames.value.length,
)

function toggleAll() {
  selectedLists.value = allSelected.value ? [] : [...flowListNames.value]
}

function handleGenerate() {
  if (selectedLists.value.length === 0 || isLoading.value) return

  isLoading.value = true
  errorMessage.value = ''
  items.value = []

  worker?.postMessage({
    command: 'extract_solarschool_dialogue',
    flowListNames: [...selectedLists.value],
    version: 'latest',
    lang: langPosition.value,
    options: {
      showStateKeys: showStateKeys.value,
      showListHeaders: showListHeaders.value,
      audioLang: audioLangPosition.value,
    },
  })
}

// regenerate when an option changes, if there is already output
watch([showStateKeys, showListHeaders, audioLangPosition, langPosition], () => {
  if (items.value.length > 0) handleGenerate()
})

onMounted(() => {
  worker = new DataWorker()

  worker.onmessage = (event) => {
    const result = event.data

    if (result.kind === 'lists') {
      if (result.status === 'success') {
        const flowMap: Record<string, [number, number][]> = result.data || {}
        listCounts.value = Object.fromEntries(
          Object.entries(flowMap).map(([name, rows]) => [name, rows.length]),
        )
        flowListNames.value = Object.keys(flowMap)
      } else {
        errorMessage.value = result.message
      }

      isLoadingLists.value = false
      return
    }

    if (result.status === 'success') {
      items.value = result.data
      console.log('SolarSchool dialogue extracted!', result.data.length, 'lines')
    } else {
      errorMessage.value = result.message
    }

    isLoadingLists.value = false
    isLoading.value = false
  }

  worker.postMessage({
    command: 'fetch_data',
    dataType: 'solarschoolflow',
    version: 'latest',
  })
})

onUnmounted(() => {
  if (worker) worker.terminate()
})
</script>

<template>
  <div>
    <div class="input-group flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        class="px-4"
        :disabled="isLoadingLists || isLoading"
        @click="toggleAll"
      >
        {{ allSelected ? 'Clear All' : 'Select All' }}
      </Button>

      <Button
        variant="outline"
        class="px-4"
        :disabled="isLoading || selectedLists.length === 0"
        @click="handleGenerate"
      >
        Generate ({{ selectedLists.length }})
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="outline" class="px-4" :disabled="isLoading">Options</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-full">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Options</DropdownMenuLabel>
            <DropdownMenuCheckboxItem v-model="showListHeaders" @select.prevent>
              Show List Headers
            </DropdownMenuCheckboxItem>

            <DropdownMenuCheckboxItem v-model="showStateKeys" @select.prevent>
              Show StateKeys
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuLabel>Audio Language</DropdownMenuLabel>
            <DropdownMenuRadioGroup v-model="audioLangPosition">
              <DropdownMenuRadioItem
                v-for="audioLang in audioLangs"
                :key="audioLang"
                :value="audioLang"
              >
                {{ audioLang }}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuLabel>Dialogue Language</DropdownMenuLabel>
            <LanguageRadioGroup v-model="langPosition" />
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <div v-if="isLoadingLists" class="text-muted-foreground">Loading flow lists...</div>
    <div v-else class="input-group max-h-64 overflow-y-auto rounded-md border px-2 py-1">
      <label
        v-for="flowListName in flowListNames"
        :key="flowListName"
        class="flex cursor-pointer items-center gap-2 py-0.5 text-sm"
      >
        <input type="checkbox" v-model="selectedLists" :value="flowListName" />
        <span class="flex-1">{{ flowListName }}</span>
        <span class="text-muted-foreground">{{ listCounts[flowListName] }}</span>
      </label>
    </div>

    <div v-if="isLoading">Loading data...</div>
    <div v-else-if="errorMessage">Error: {{ errorMessage }}</div>
    <div v-else-if="items.length === 0" class="text-muted-foreground mt-4">
      Check the SolarSchool flow lists you want, then press Generate.<br />
      Each list is one scene
    </div>
    <template v-else>
      <div class="input-group max-h-100 overflow-y-auto rounded-md border px-2 py-1">
        <div v-for="(line, index) in items" :key="index" class="min-h-6 whitespace-pre-wrap">
          {{ line }}
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.input-group {
  margin-bottom: 1rem;
}
</style>
