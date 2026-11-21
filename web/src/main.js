import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router.js'
import { loadData } from './data.js'
import './style.css'

const app = createApp(App)
app.use(router)
loadData()
app.mount('#app')
