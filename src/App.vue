<script setup lang="ts">
import { RouterView } from 'vue-router'
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue';
</script>

<template>
  <Header msg="Wuthering Waves Tools" />
  <div class="flex-1">
    <RouterView />
  </div>
  <Footer />
</template>

<style scoped>
.logo {
  display: block;
  margin: 0 auto 2rem;
}
</style>
