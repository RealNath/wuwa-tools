<script setup lang="ts">
</script>

<template>
  <main>
    <p class="intro">
      Welcome to RealNath's Wuthering Waves Tools (because saccharose.wiki's data is outdated lol).<br>
      This is made especially to help Wuthering Waves Fandom Wiki editing.<br>
      This website is frontend only (I don't have budget for backend hosting, and it's not a serious project. I made it in free time).<br>
      The data will be downloaded and cached to your device.<br>
      <br>
      Tools:
    </p>
    <ul style="margin-top: 10px;">
      <li><RouterLink to="/other-language">Other Languages</RouterLink></li>
      <li><RouterLink to="/dialogue-generator">Generate Dialogue</RouterLink></li>
      <li><RouterLink to="/multi-text">Multi Text (Work in Progress)</RouterLink></li>
      <li>More to come!</li>
    </ul>
  </main>
</template>

<style scoped>
.intro {
  font-size: 1.2rem;
}
</style>
