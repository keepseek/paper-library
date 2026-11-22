# Meng's Blog · 论文阅读记录库

粘贴一段"输入/输出"描述 → 反查对应论文和定理条目。
**纯静态站点，无后端、无认证**。数据源：Agentero vault。

- 线上：`https://www.meng-s-blog.top/`（GitHub Pages）
- 接手开发请先读 **`HANDOVER.md`**（架构/格式/部署/环境坑），设计细节见 `PLAN-2.0.md`，历史见 `PROGRESS.md`。

## 数据流

```
Agentero vault (E:\agentero)  →  sync-vault.mjs  →  web/public/data.json  →  vite build  →  GitHub Pages
```

## 日常更新

1. 在 Agentero 里导入论文、在 `NOTES.md` 写定理条目（`## 标题` + `- **输入**：/ - **输出**：/ - **备注**：`）
2. 双击 `update-site.bat`（同步 + 构建 + 部署，约 1 分钟）

## 目录

```
sync-vault.mjs    同步脚本（vault → data.json，零依赖）
update-site.bat   一键更新
deploy-pages.cjs  部署到 GitHub Pages（gitignore，含 token）
push-api.cjs      推 main 分支（gitignore，含 token）
web/              Vue 3 + Vite 5 + Tailwind 前端（hash 路由，客户端搜索）
server/           遗留后端，已退役（gitignore，勿用）
```

## 测试

```bash
cd web
node search-test.mjs && node render-test.mjs && node smoke-test.mjs
```
