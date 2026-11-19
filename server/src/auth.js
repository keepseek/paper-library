import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-production'

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' })
}

export function authRequired(req, res, next) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : null
  if (!token) return res.status(401).json({ error: '未登录' })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: '登录已过期，请重新登录' })
  }
}

/** 可选认证：带 token 就解析（按登录用户过滤可见性），不带就按游客处理 */
export function authOptional(req, res, next) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : null
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET)
    } catch {
      // token 无效按游客处理
    }
  }
  next()
}

export function hashPassword(pw) {
  return bcrypt.hashSync(pw, 10)
}

export function verifyPassword(pw, hash) {
  return bcrypt.compareSync(pw, hash)
}
