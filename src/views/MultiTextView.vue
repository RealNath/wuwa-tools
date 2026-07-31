<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import DataWorker from '../workers/dataWorker?worker'
import MultiTextTable from '@/components/MultiTextTable.vue'

const items = ref<any[]>([])
const errorMessage = ref<string>('')
const isLoading = ref(true)
// const lang = ref<string[]>(["de", "en", "es", "fr", "id", "ja", "ko", "pt", "ru", "th", "vi", "zh-Hans", "zh-Hant"])
// let worker: Worker | null = null

// onMounted(() => {
//   worker = new DataWorker()

//   worker.onmessage = (event) => {
//     const result = event.data

//     if (result.status === 'success') {
//       items.value = result.data
//     } else {
//       errorMessage.value = result.message
//     }

//     isLoading.value = false
//   }

//   worker.postMessage({
//     command: 'fetch_data',
//     dataType: 'multitext',
//     version: 'latest',
//     lang: 'en',
//     limit: 10
//   })
// })

// onUnmounted(() => {
//   if (worker) worker.terminate()
// })
</script>

<template>
  <MultiTextTable />
</template>

<style scoped>
.multi-text {
  padding: 2rem;
}
</style>
