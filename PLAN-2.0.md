# Meng's Blog 2.0 计划书

> 更新：2026-11-21
> 当前状态：**已上线** `https://www.meng-s-blog.top/`（GitHub Pages），Agentero 协同打通（一键更新 + vault skill）
> 一句话定位：把「粘贴一段输入/输出描述 → 找到对应论文」做成一个可检索、可积累的**论文阅读记录库**。

---

## 一、架构（2026-11-21 转向：不搞后端）

### 1.1 为什么

- 原方案 Express + SQLite + JWT（M1 已完成）不再需要：无认证、无多用户、无可见性控制。
- 数据源改为 **Agentero vault**（`E:\agentero`）：论文以 Markdown 笔记管理，用户可在 Agentero 桌面端继续录入。
- 站点纯静态：免费静态托管（GitHub Pages / Cloudflare Pages），公开、无认证。

### 1.2 数据流

```
Agentero vault (E:\agentero)
  papers/<id>/
    ├── metadata.json   ← Agentero 原生导入（标题/作者/年份/摘要/arXiv/DOI/PDF 链接）
    └── NOTES.md        ← 用户笔记（frontmatter venue/tags + ## 定理块）
        │
        │  node sync-vault.mjs   （本地、零依赖、直接读文件）
        ▼
  web/public/data.json      ← {papers:[{id,title,authors,year,venue,tags,
        │                        abstract,arxiv_id,doi,pdf_url,
        │                        results:[{id,title,input,output,notes,tags}]}]}
        │  vite build
        ▼
  web/dist/  →  GitHub Pages（gh-pages 分支，deploy-pages.cjs 推送）
```

- 前端启动时 fetch 一次 `data.json`，搜索/筛选全部在客户端完成。
- 无 API、无认证、无数据库、无服务器进程。
- **双格式兼容**：Agentero 导入的论文（带 `metadata.json`）自动进网站；
  定理条目只认 NOTES.md 里的 `## 定理` 块（用户手写）。

### 1.3 NOTES.md 格式（sync-vault.mjs 解析）

```markdown
---
title: 论文标题
authors: "作者1, 作者2"
year: 2022
venue: 期刊名
tags: ["标签1", "标签2"]
---

# 论文标题

> 作者1, 作者2，期刊名

## 定理 1 标题
- **输入**：...
- **输出**：...
- **备注**：...
```

- 定理 tags 继承论文 tags（简化；旧库中定理级标签与论文级几乎重复）。
- 同步脚本**直接读文件**而非 Agentero CLI catalog：手工建的文件夹不会自动进 catalog。
- 想让 Agentero 桌面端 Library 显示这些论文：在 `papers/` 上右键 → Rescan（不会覆盖 NOTES.md）。

### 1.4 客户端搜索

- 分词：中文按双字滑窗（≤4 字短词整词），拉丁/数字按整词，大小写不敏感。
- 反查：粘贴"输入/输出"描述 → 同一分词器，得分 = 命中项占比，按得分排序。
- "输入/输出/备注"等标签词为停用词，不参与匹配。
- 测试：`web/search-test.mjs`（12 项）、`web/render-test.mjs`（25 条 0 问题）、`web/smoke-test.mjs`（静态资源冒烟）。

### 1.5 渲染管线（不变）

`marked.parse` + `markedKatex({throwOnError:false, nonStandard:true})` + `DOMPurify.sanitize`，
前置 `normalizeDisplayMath`（行首 `$$` 前补空行）。详见附录。

---

## 二、部署

### 现状（2026-11-21）

- **已上线**：`https://www.meng-s-blog.top/`（GitHub Pages，gh-pages 分支，build_type: legacy）
- DNS：Cloudflare CNAME `www` → `keepseek.github.io`（DNS only/灰云），已切换
- 自定义域名证书由 GitHub 自动签发（几分钟到 24h）
- 部署脚本：`deploy-pages.cjs`（gitignore，含 token，幂等可重复运行）

### 更新流程（日常）

**一键**：双击 `update-site.bat`（同步 + 构建 + 部署，约 1 分钟）。
或在 Agentero 里说"更新网站"（vault 的 `update-blog` skill 会执行同样流程）。

手动三步：
1. 在 Agentero vault 里新增/修改论文（导入的论文自动生成 `metadata.json`；定理条目写在 `NOTES.md`）。
2. `node sync-vault.mjs` → 重新生成 `web/public/data.json`。
3. `cd web && npm run build` → `node deploy-pages.cjs`。

### 自定义域名

- `www.meng-s-blog.top`：仓库 CNAME 文件 + GitHub Pages cname 设置 + Cloudflare DNS CNAME（灰云）。

---

## 三、后续方向（静态版）

### 已完成（2026-11-22）

- **PDF 库**（`/pdfs`）：目录式列出所有论文的 PDF 情况——本地 PDF（文件名+大小）、arXiv/DOI 外链、缺 PDF 提示；带统计/搜索/筛选/排序。本地 PDF 暂只登记、不托管（托管后续开放）。
- **已读/未读徽章**：读 `metadata.json` 的 `is_read`，Agentero 里标已读 → 网站自动显示。
- **标签云浏览**：Home 点标签过滤、再点取消。
- **统计概览**：Home 顶部论文 / 定理 / 本地 PDF / 已读。
- **导出 Markdown**：单条定理 / 整篇，下载 + 复制（`src/export.js`）。
- **arXiv HTML 版链接**：详情页 meta 行 + 本地 PDF 区。

### 待做

1. **本地 PDF 托管**：把 `papers/<id>/*.pdf` 拷到 `web/public/pdfs/` 并在 PDF 库可点（注意仓库公开 + 体积，建议 `web/public/pdfs/` 进 .gitignore）。
2. **PWA**：离线访问、可安装到主屏（vite-plugin-pwa）。
3. **相关定理推荐**：客户端内容相似度（数据量小，可行）。
4. **定理引用关系图**：可视化定理间依赖。
5. **语义搜索**：客户端 embedding 太重；如需要，走 Cloudflare Workers + 向量索引的 serverless 路线。
6. **移动端优化**。
7. **深色模式**：Tailwind `dark:` 变体，一键切换。
8. **更新提示**：localStorage 记上次 `generatedAt`，高亮新增论文。

---

## 四、安全提醒

- 旧文档 `E:\网站\.inspect\blog-doc.txt` 里有**明文密码**（旧 Vercel/Railway/Atlas 账号），**退役旧站前务必轮换**。
- GitHub token 在本地 `.git/config` 与 `push-api.cjs`（均已 gitignore），30 天有效，到期换新。
- 遗留后端 `server/` 仅保留在本地（已 gitignore），不进仓库。

---

## 附录：渲染语法支持（2026-11-19 诊断，仍然有效）

### 现象与根因

25 条定理中 11 条的 `$$` 块级公式不渲染：原始 LaTeX 直接显示、`\\|`→`|`、`\\,`→`,`、`_`→斜体、`$` 配对错位把中文当公式。

根因：`marked-katex-extension` 块级规则要求 `$$` 位于块首（前面是空行或文本开头），但笔记里 `$$` 常紧跟文字行 → CommonMark lazy continuation 把整段并入上一段，块级/行内规则都不触发。

### 修复

`web/src/md.js` 增加预处理 `normalizeDisplayMath`：行首 `$$` 前补一个空行。修复后 25 条记录全部正常渲染。

### 支持的语法

| 语法 | 示例 | 状态 |
| --- | --- | --- |
| 行内公式（单行） | `$u\in L^p$` | ✅ |
| 块级公式 | `$$` 独占一行（修复后紧跟文字行也可） | ✅ |
| KaTeX 命令 | `\frac \int \sum \, \mathbb \partial \le \dfrac \left \right \sqrt \Gamma \omega \to \cap \setminus \overline \mathrm \text` 等 | ✅ |
| Markdown（notes） | 标题、列表、加粗、斜体、链接、代码块 | ✅ |

**注意**：行内公式必须单行；`$$` 必须独占一行；公式内不要混 markdown 语法；中文不要放进 `$...$`。
