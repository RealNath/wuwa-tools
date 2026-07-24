<script setup lang="ts">
import { RouterView } from 'vue-router'
import Header from './components/Header.vue'
</script>

<template>
  <Header msg="Wuthering Waves Tools" />
  <RouterView />
</template>

<style scoped>
.logo {
  display: block;
  margin: 0 auto 2rem;
}
</style>
