<script setup lang="ts">
import { Button } from '@/components/ui/button'
import IconGitHub from '@/components/icons/IconGitHub.vue'
</script>

<template>
  <footer
    class="pt-2 border-t-2 border-solid border-t-border flex flex-col min-[600px]:flex-row min-[600px]:justify-between gap-4"
  >
    <div>
      <h1 class="text-xl font-semibold">Wuthering Waves Tools</h1>
      <p>Because saccharose.wiki's data is out-of-date.</p>
      <p>Not affiliated with Kuro Games.</p>
      <p>©2026 - {{ new Date().getFullYear() }}. All rights reserved.</p>
    </div>
    <div class="flex flex-col items-start text-left min-[600px]:items-end min-[600px]:text-right">
      <Button variant="outline" as-child>
        <a href="https://github.com/realnath/wuwa-tools"><IconGitHub />GitHub</a>
      </Button>
      <p>Made with ❤️ using Vue + TypeScript.</p>
    </div>
  </footer>
</template>

<style scoped>
/* hr {
  margin-bottom: 1rem;
} */
</style>
