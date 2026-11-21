import { createRouter, createWebHashHistory } from 'vue-router'
import Home from './views/Home.vue'
import PaperDetail from './views/PaperDetail.vue'

// 静态托管（GitHub Pages / Cloudflare Pages）用 hash 路由，无需服务端重写
const routes = [
  { path: '/', component: Home },
  { path: '/paper/:id', component: PaperDetail }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})
