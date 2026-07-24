import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)

if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then(granted => {
    if (granted) {
      console.log("Persistent Storage granted.");
    } else {
      console.log("Persistent Storage denied.");
    }
  });
}

app.mount('#app')
