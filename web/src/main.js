import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router.js'
import { loadAuth } from './auth.js'
import './style.css'

const app = createApp(App)
app.use(router)
loadAuth()
app.mount('#app')
