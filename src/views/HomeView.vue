<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { ref } from 'vue'
import { clear } from 'idb-keyval'

const isCacheGranted = ref<boolean>(false)
// update isCacheGranted
if (navigator.storage && navigator.storage.persisted) {
  navigator.storage.persisted().then((granted) => {
    isCacheGranted.value = granted
  })
}

async function enableCache() {
  if (!('Notification' in window)) {
    console.log('Notification not supported for this browser.')
    return
  }
  const notificationPermission = await Notification.requestPermission()
  if (notificationPermission == 'granted') {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then((granted) => {
        if (granted) {
          isCacheGranted.value = true
          console.log('Persistent Storage granted.')
        } else {
          isCacheGranted.value = false
          console.log('Persistent Storage denied.')
        }
      })
    }
  }
}

async function disableCache() {
  try {
    await clear()
    console.log('Cache successfully deleted.')

    isCacheGranted.value = false
    alert('Cache deleted!')
  } catch (e) {
    console.error('Failed to delete cache:', e)
  }
}
</script>

<template>
  <main>
    <div class="intro text-lg">
      Welcome to RealNath's Wuthering Waves Tools (because saccharose.wiki's data is outdated
      lol).<br />
      This is made especially to help Wuthering Waves Fandom Wiki editing.<br />
      This website is frontend only (I don't have budget for backend hosting, and it's not a serious
      project. I made it in free time).<br /><br />
      The data will be downloaded and cached to your device. This should take a few seconds for new
      users, since the data is divided into smaller chunks (files). The app knows which file to
      fetch.<br />
      You can also enable Persistent Storage, just in case, for better and longer data caching (<a
        href="https://web.dev/articles/persistent-storage#chrome_and_other_chromium-based_browsers"
        target="_blank"
        >some browsers need Notification</a
      >
      to prevent silent auto-deny). But this is not needed anymore since I've optimized it.

      <div class="toggle-cache-btn">
        <Button v-if="!isCacheGranted" variant="outline" @click="enableCache" class="cache-btn">
          Enable Cache (Persistent Storage)
        </Button>
        <Button v-else variant="outline" @click="disableCache" class="cache-btn">
          Clear Cache
        </Button>
      </div>

      Tools:
    </div>
    <ul class="mt-2.5">
      <li><RouterLink to="/other-language">Other Languages</RouterLink></li>
      <li><RouterLink to="/dialogue-generator">Generate Dialogue</RouterLink></li>
      <li><RouterLink to="/multi-text">Multi Text (Work in Progress)</RouterLink></li>
      <li>More to come!</li>
    </ul>
  </main>
</template>

<style scoped>
.toggle-cache-btn {
  display: flex;
  justify-content: center;
  margin: 1rem 0;
}
.cache-btn {
  padding: 1.5rem;
}
</style>
