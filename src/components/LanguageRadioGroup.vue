<script setup lang="ts">
import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu'

const languages = ['de', 'en', 'es', 'fr', 'ja', 'ko', 'pt', 'th', 'zh-Hans', 'zh-Hant']

const langPosition = defineModel<string>({ default: 'en' })
</script>

<template>
  <DropdownMenuRadioGroup v-model="langPosition">
    <DropdownMenuRadioItem v-for="lang in languages" :key="lang" :value="lang">
      {{ lang }}
    </DropdownMenuRadioItem>
  </DropdownMenuRadioGroup>
</template>
