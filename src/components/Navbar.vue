<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <nav>
    <RouterLink to="/">Home</RouterLink>
    <RouterLink to="/multi-text">MultiText</RouterLink>
    <RouterLink to="/other-language">Other Language</RouterLink>
    <RouterLink to="/about">About</RouterLink>
  </nav>
</template>

<style scoped>
nav {
  display: flex;
  align-items: center;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}
</style>
