<script setup lang="ts">
import { ref, shallowRef, computed, triggerRef, onMounted, onUnmounted } from 'vue'
import DataWorker from '@/workers/dataWorker?worker'

type MultiTextItem = {
  Id: string
  Content: string
}

const items = shallowRef<MultiTextItem[]>([])
const isLoading = ref<boolean>(true)
let worker: Worker | null = null

const currentPage = ref(1)
const pageSize = ref(10)

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return items.value.slice(start, end)
})

const handleSortChange = ({ prop, order }: { prop: string; order: string | null }) => {
  if (!order) return // default order or unsorted

  // Sort in place
  items.value.sort((a, b) => {
    const valA = a[prop as keyof MultiTextItem]
    const valB = b[prop as keyof MultiTextItem]

    if (valA < valB) return order === 'ascending' ? -1 : 1
    if (valA > valB) return order === 'ascending' ? 1 : -1
    return 0
  })
  triggerRef(items)
}

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

    if (result.status === 'success') {
      items.value = result.data
    } else {
      console.error(result.message)
    }

    isLoading.value = false
  }

  worker.postMessage({
    command: 'fetch_data',
    dataType: 'multitext',
    version: 'latest',
    lang: 'en',
  })
})

onUnmounted(() => {
  if (worker) worker.terminate()
})
</script>

<template>
  <div class="border rounded-md bg-card text-card-foreground shadow-sm p-4 space-y-4">
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
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="items.length"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>
