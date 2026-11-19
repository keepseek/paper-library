import { Router } from 'express'
import { db } from '../db.js'
import { signToken, authRequired, hashPassword, verifyPassword } from '../auth.js'

const router = Router()

router.post('/register', (req, res) => {
  const { email, password, name, inviteCode } = req.body || {}
  if (!email || !password || !name) return res.status(400).json({ error: '邮箱、密码、昵称都必填' })
  if (String(password).length < 6) return res.status(400).json({ error: '密码至少 6 位' })

  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c
  if (count > 0) {
    const inv = inviteCode
      ? db.prepare("SELECT * FROM invites WHERE code = ? AND used_by IS NULL AND expires_at > datetime('now')").get(String(inviteCode).trim())
      : null
    if (!inv) return res.status(403).json({ error: '需要有效的邀请码' })
  }

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(String(email).toLowerCase().trim())
  if (exists) return res.status(409).json({ error: '该邮箱已注册' })

  const role = count === 0 ? 'owner' : 'member'
  const info = db
    .prepare('INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(String(email).toLowerCase().trim(), String(name).trim(), hashPassword(String(password)), role)
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(info.lastInsertRowid))
  if (inviteCode) db.prepare('UPDATE invites SET used_by = ? WHERE code = ?').run(user.id, String(inviteCode).trim())

  res.json({ token: signToken(user), user: { id: user.id, email: user.email, name: user.name, role: user.role } })
})

router.post('/login', (req, res) => {
  const { email, password } = req.body || {}
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').toLowerCase().trim())
  if (!user || !verifyPassword(String(password || ''), user.password_hash)) {
    return res.status(401).json({ error: '邮箱或密码错误' })
  }
  res.json({ token: signToken(user), user: { id: user.id, email: user.email, name: user.name, role: user.role } })
})

router.get('/me', authRequired, (req, res) => {
  const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(401).json({ error: '用户不存在' })
  res.json({ user })
})

export default router
