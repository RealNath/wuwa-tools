<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import DataWorker from '../workers/dataWorker?worker'

const items = ref<any[]>([])
const errorMessage = ref<string>('')
const isLoading = ref(true)
// const lang = ref<string[]>(["de", "en", "es", "fr", "id", "ja", "ko", "pt", "ru", "th", "vi", "zh-Hans", "zh-Hant"])
let worker: Worker | null = null

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

  worker.postMessage({
    command: 'fetch_data',
    dataType: 'multitext',
    version: 'latest',
    lang: 'en',
    limit: 10
  })
})

onUnmounted(() => {
  if (worker) worker.terminate()
})
</script>

<template>
  <div class="multi-text">
    <h1>MultiText (Work in Progress)</h1>
    <div v-if="isLoading">Loading data...</div>
    <div v-else-if="errorMessage">Error: {{ errorMessage }}</div>
    <ul v-else>
      <li v-for="item in items">
        <b>ID:</b> {{ item.Id }}<br>
        <b>Content:</b> {{ item.Content }}
      </li>
    </ul>
  </div>
</template>

<style>
.multi-text {
  padding: 2rem;
}
li {
  margin-bottom: 1em;
  background: #1e1e1e;
  padding: 1em;
  border-radius: 8px;
}
</style>
