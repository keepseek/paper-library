import { Router } from 'express'
import crypto from 'node:crypto'
import { db } from '../db.js'
import { authRequired } from '../auth.js'

const router = Router()

function ownerOnly(req, res, next) {
  if (req.user.role !== 'owner') return res.status(403).json({ error: '仅所有者可操作' })
  next()
}

// 成员列表
router.get('/', authRequired, ownerOnly, (req, res) => {
  const users = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, u.created_at,
        (SELECT COUNT(*) FROM papers p WHERE p.owner_id = u.id) AS paper_count
       FROM users u ORDER BY u.id`
    )
    .all()
  res.json(users)
})

// 生成邀请码（7 天有效）
router.post('/invite', authRequired, ownerOnly, (req, res) => {
  const { email } = req.body || {}
  const code = crypto.randomBytes(8).toString('hex')
  const expires = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19)
  db.prepare('INSERT INTO invites (code, email, created_by, expires_at) VALUES (?, ?, ?, ?)').run(
    code,
    email ? String(email).toLowerCase().trim() : null,
    req.user.id,
    expires
  )
  res.json({ code, expires_at: expires })
})

// 删除成员（连同其论文一起删除）
router.delete('/:id', authRequired, ownerOnly, (req, res) => {
  const id = Number(req.params.id)
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  if (!u) return res.status(404).json({ error: '用户不存在' })
  if (u.role === 'owner') return res.status(400).json({ error: '不能删除所有者' })
  db.prepare('DELETE FROM papers WHERE owner_id = ?').run(id)
  db.prepare('DELETE FROM users WHERE id = ?').run(id)
  res.json({ ok: true })
})

export default router
