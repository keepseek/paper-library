# Meng's Blog · 论文库

多用户论文阅读记录库。域名：`meng-s-blog.top`

## 功能

- 账号体系：所有者 + 成员（邀请码注册），成员可管理自己的论文
- 论文结构化记录：标题/作者/arXiv/DOI/PDF 链接 + **输入 / 输出**（一等公民字段）+ 主要结果/方法/笔记（Markdown + LaTeX）
- md 文件导入：同门按模板写好 md 上传即入库（网站不解析 PDF）
- 全文搜索：SQLite FTS5 trigram，中文子串匹配，字段加权（输入/输出权重最高）
- 可见性：仅自己 / 同门可见 / 公开

## 目录

```
server/   Express + node:sqlite（零原生依赖）
web/      Vue 3 + Vite + TailwindCSS + KaTeX
```

## 本地开发

```bash
# 后端（:3000）
cd server && npm install && npm run dev

# 前端（:5173，/api 代理到 :3000）
cd web && npm install && npm run dev
```

## 生产部署

```bash
cd web && npm run build        # 产物在 web/dist
cd server && npm start         # Express 同时托管 API 和 web/dist
```

环境变量：

| 变量 | 说明 |
|---|---|
| `PORT` | 监听端口，默认 3000 |
| `JWT_SECRET` | 生产环境必须设置（长随机字符串） |
| `DATA_DIR` | SQLite 数据目录，默认 `server/data` |

备份：定期复制 `server/data/blog.db*` 即可（WAL 模式，建议用 `sqlite3 blog.db ".backup ..."` 或停服复制）。

## 首个用户

第一个注册的用户自动成为所有者（owner），之后注册需要邀请码（成员管理页生成，7 天有效）。
