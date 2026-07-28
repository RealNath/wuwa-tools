<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { Input } from '@/components/ui/input'
import DataWorker from '../workers/dataWorker?worker'

const searchQuery = ref<string>('')

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
    version: "latest",
    lang: 'en',
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
  <div class="generate-dialogue">
    <h1 class="text-3xl font-bold">Generate Dialogue View</h1>
    <Input
      id="generate-dialogue-search"
      :disabled="isLoading"
      v-model="searchQuery"
      @keydown.enter="handleSearch"
      type="text"
      placeholder="QuestId (e.g '119000000')."
    >
    </Input>

    <div v-if="isLoading">Loading data...</div>
    <div v-else-if="errorMessage">Error: {{ errorMessage }}</div>
    <div v-else v-for="item in items">{{ item }}</div>
  </div>
</template>

<style scoped>
.generate-dialogue {
  padding: 2rem;
}
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
