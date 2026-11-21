import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 纯静态站点：相对 base，可部署在任意子路径（GitHub Pages / Cloudflare Pages）
export default defineConfig({
  base: './',
  plugins: [vue()]
})
