import { createRouter, createWebHistory } from 'vue-router'
import { auth } from './auth.js'
import Home from './views/Home.vue'
import PaperDetail from './views/PaperDetail.vue'
import PaperEdit from './views/PaperEdit.vue'
import ResultEdit from './views/ResultEdit.vue'
import Import from './views/Import.vue'
import Login from './views/Login.vue'
import Members from './views/Members.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/paper/:id', component: PaperDetail },
  { path: '/paper/new', component: PaperEdit, meta: { auth: true } },
  { path: '/paper/:id/edit', component: PaperEdit, meta: { auth: true } },
  { path: '/paper/:id/results/new', component: ResultEdit, meta: { auth: true } },
  { path: '/result/:id/edit', component: ResultEdit, meta: { auth: true } },
  { path: '/import', component: Import, meta: { auth: true } },
  { path: '/members', component: Members, meta: { auth: true, owner: true } },
  { path: '/login', component: Login }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  if (to.meta.auth && !auth.user) return '/login'
  if (to.meta.owner && auth.user?.role !== 'owner') return '/'
})
