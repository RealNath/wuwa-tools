<script setup lang="ts">
import NavBar from './Navbar.vue'

defineProps<{
  msg: string
}>()
</script>

<template>
  <header>
    <div class="header">
      <h1 class="title">{{ msg }}</h1>
      <NavBar />
    </div>
    <!-- <h3>
      Because saccharose.wiki's data is out-of-date.
    </h3> -->
    
  </header>
</template>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
  margin-bottom: 2rem;
}

h1 {
  font-weight: 500;
  font-size: 2.2rem;
  text-align: center;
}

h3 {
  font-size: 1.2rem;
  margin-bottom: 1.5rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-bottom: 1rem;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
