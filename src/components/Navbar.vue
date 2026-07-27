<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Menu, X } from '@lucide/vue'
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

const isMenuOpen = ref<boolean>(false)

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
}
</script>

<template>
  <Button variant="outline" class="hamburger-btn" @click="toggleMenu">
    <div v-if="!isMenuOpen"><Menu /></div>
    <div v-else><X /></div>
  </Button>
  <nav :class="{ 'is-open': isMenuOpen }">
    <RouterLink to="/">Home</RouterLink>
    <RouterLink to="/other-language">Other Language</RouterLink>
    <RouterLink to="/dialogue-generator">Generate Dialogue</RouterLink>
    <RouterLink to="/multi-text">MultiText</RouterLink>
    <RouterLink to="/about">About</RouterLink>
  </nav>
</template>

<style scoped>
.hamburger-btn {
  display: none;
}

nav {
  display: flex;
  align-items: center;
  text-align: center;
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

@media (max-width: 900px) {
  .hamburger-btn {
    display: block;
    padding-left: 10px;
    padding-right: 10px;
  }

  /* hidden by default */
  nav {
    display: none;
  }

  nav.is-open {
    display: flex;
    flex-direction: column;
    text-align: center;
  }

  nav.is-open a {
    border: none;
    padding: 0.5rem 0;
  }
}
</style>
