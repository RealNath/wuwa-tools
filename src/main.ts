import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'

const app = createApp(App)

app.use(router)

app.use(ElementPlus)

// if (navigator.storage && navigator.storage.persist) {
//   navigator.storage.persist().then(granted => {
//     if (granted) {
//       console.log("Persistent Storage granted.");
//     } else {
//       console.log("Persistent Storage denied.");
//     }
//   });
// }

app.mount('#app')
