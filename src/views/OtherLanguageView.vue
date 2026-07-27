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
  worker?.postMessage({
    command: 'get_other_language',
    input: searchQuery.value,
    version: "latest",
  })
}

onMounted(() => {
  worker = new DataWorker()

  worker.onmessage = (event) => {
    const result = event.data

    if (result.status === 'success') {
      items.value = result.data
    } else {
      errorMessage.value = result.message
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
    <Input
      id="other-language-search"
      :disabled="isLoading"
      v-model="searchQuery"
      @keydown.enter="handleSearch"
      type="text"
      placeholder="Search for the exact full string here.">
    </Input>

    <div v-if="isLoading">Loading data...</div>
    <div v-else-if="errorMessage">Error: {{ errorMessage }}</div>
    <ul v-else>
      <li v-for="item in items" :key="item.id">
        <details>
          <summary>ID: {{ item.id }}</summary>
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
