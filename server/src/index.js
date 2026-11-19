import express from 'express'
import cors from 'cors'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import authRoutes from './routes/auth.js'
import paperRoutes from './routes/papers.js'
import memberRoutes from './routes/members.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (req, res) => res.json({ ok: true, name: "Meng's Blog" }))
app.use('/api/auth', authRoutes)
app.use('/api/papers', paperRoutes)
app.use('/api/members', memberRoutes)

// 生产环境：托管前端构建产物（动态判断，dist 后生成也能生效）
const dist = path.join(__dirname, '..', '..', 'web', 'dist')
app.use(express.static(dist))
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next()
  if (!fs.existsSync(path.join(dist, 'index.html'))) return res.status(404).send('前端尚未构建')
  res.sendFile(path.join(dist, 'index.html'))
})

const PORT = Number(process.env.PORT || 3000)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Meng's Blog server running on http://0.0.0.0:${PORT}`)
})
