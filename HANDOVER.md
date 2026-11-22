# Meng's Blog 交接文档

> 写给接手这个项目的 AI / 开发者。读完这一份 + `PLAN-2.0.md`（设计）+ `PROGRESS.md`（历史）即可上手。
> 最后更新：2026-11-22

## 一句话定位

**论文阅读记录库**：用户粘贴一段"输入/输出"描述 → 网站反查出对应论文和定理条目。
纯静态站点，**无后端、无认证、无数据库**。数据唯一来源是 Agentero vault。

## 当前状态（2026-11-22）

| 项 | 值 |
| --- | --- |
| 线上地址 | `https://www.meng-s-blog.top/`（GitHub Pages，已上线） |
| 数据 | 3 篇论文 / 25 条定理 |
| 仓库 | `keepseek/paper-library`（**公开**），main + gh-pages 分支 |
| 本地仓库 | `E:\网站\paper-library` |
| 数据源 vault | `E:\agentero`（Agentero 桌面端管理） |

## 架构与数据流

```
Agentero vault (E:\agentero)
  papers/<id>/
    ├── metadata.json   ← Agentero 导入时自动生成（标题/作者/年份/摘要/arXiv/DOI/PDF 链接）
    └── NOTES.md        ← 用户笔记（frontmatter + ## 定理块）
         │
         │  node sync-vault.mjs   （零依赖，直接读文件，不依赖 Agentero 是否开着）
         ▼
  web/public/data.json
         │  vite build
         ▼
  web/dist/  →  deploy-pages.cjs 推到 gh-pages 分支  →  GitHub Pages 自动发布
```

- 前端（Vue 3 + Vite 5 + Tailwind 3.4，电子墨水风）启动时 fetch 一次 `data.json`，
  搜索/筛选/渲染全部在客户端完成。
- 路由是 **hash 路由**（`createWebHashHistory`），静态托管免服务端重写；`vite.config.js` 里 `base: './'`。
- 渲染管线（`web/src/md.js`）：`marked.parse` + `markedKatex({throwOnError:false, nonStandard:true})`
  + `DOMPurify.sanitize`，前置 `normalizeDisplayMath`（行首 `$$` 前补空行，修复块级公式不渲染）。
  支持的语法见 `PLAN-2.0.md` 附录。

## 目录结构

### 仓库 `E:\网站\paper-library`

| 文件 | 作用 |
| --- | --- |
| `sync-vault.mjs` | **核心同步脚本**。读 vault 每个 `papers/<id>/` 的 `metadata.json` + `NOTES.md`，双格式合并，写 `web/public/data.json`。用法：`node sync-vault.mjs [vaultPath]`（默认 `E:/agentero`） |
| `update-site.bat` | **一键更新**：同步 → 构建 → 部署（用户双击，约 1 分钟） |
| `deploy-pages.cjs` | 部署脚本：把 `web/dist` + CNAME 推到 gh-pages 分支，确保 Pages 开启、cname 设置。**gitignore，含 token** |
| `push-api.cjs` | 用 GitHub Git Data API 推 main 分支（沙箱里 git push 不可用）。**gitignore，含 token**。用法：`node push-api.cjs "<commit message>"`（推全量快照 commit） |
| `web/` | 前端。`src/data.js`（数据加载 + 客户端搜索）、`src/views/Home.vue`（首页反查）、`src/views/PaperDetail.vue`（论文详情，只读）、`src/components/PaperCard.vue`、`src/md.js`（渲染） |
| `web/search-test.mjs` | 搜索测试 12 项（关键词/反查/停用词/大小写/排序） |
| `web/render-test.mjs` | 渲染测试：全部定理记录 0 问题 |
| `web/smoke-test.mjs` | 静态服务器冒烟测试（相对路径、无 /api 残留、data.json 可访问） |
| `server/` | **遗留 Express 后端，已退役**。gitignore，仅本地保留，不要使用、不要参考其 API |
| `start.bat` | 遗留后端启动器（仍在 git 跟踪中，可删） |
| `migrate-dump.cjs` / `migrate-to-agentero.cjs` / `reimport.cjs` | 一次性迁移脚本（旧库 → vault），已完成使命，留档 |
| `PLAN-2.0.md` | 设计文档（架构、格式、部署、渲染语法附录） |
| `PROGRESS.md` | 进度记录（含沙箱构建经验） |
| `账号密码.md` | **gitignore**。旧站账号明文密码，退役旧站前必须轮换 |

### Vault `E:\agentero`

| 路径 | 作用 |
| --- | --- |
| `papers/<id>/` | 论文文件夹。当前 3 篇：`2611.24942`（用户自己的，原生格式，0 条定理）、`dou-zhu-2022`（12 条）、`hang-wang-yan-2008`（13 条） |
| `.agents/skills/update-blog/SKILL.md` | vault skill：在 Agentero 里说"更新网站"即触发同步+构建+部署 |
| `AGENTS.md` | vault 的 agent 地图，已含"Blog site"段 |

## 数据格式

### 论文（两种来源，sync 自动合并）

1. **Agentero 原生导入**：`metadata.json` 提供 title/authors/year/abstract/arxiv_id/doi/pdf_url 等。
   这类论文**自动**出现在网站上（无需任何额外操作）。
2. **NOTES.md frontmatter**：`venue`、`tags` 覆盖/补充 metadata。
   venue 回退链：frontmatter → metadata.extra → `arXiv:<id>`。
   `@arxiv:` 开头的自动标签会被过滤。

### 定理条目（只认 NOTES.md 手写）

```markdown
## 定理标题
- **输入**：…（支持 KaTeX：$…$ 行内、$$…$$ 块级）
- **输出**：…
- **备注**：…
```

- 定理 tags 继承论文 tags。
- 行内公式必须单行；`$$` 必须独占一行；公式内不要混 markdown；中文不要放进 `$...$`。

### data.json 结构

```json
{
  "generatedAt": "...", "source": "agentero", "vault": "E:/agentero",
  "paperCount": 3, "resultCount": 25,
  "papers": [{
    "id": "dou-zhu-2022", "title": "...", "authors": ["..."], "year": 2022,
    "venue": "...", "tags": ["..."], "abstract": "...",
    "arxiv_id": "...", "doi": "...", "pdf_url": "...", "source_url": "...",
    "results": [{ "id": "dou-zhu-2022-1", "title": "...", "input": "...", "output": "...", "notes": "...", "tags": ["..."] }]
  }]
}
```

论文按年份倒序。

## 日常更新流程

1. 在 Agentero 里导入论文（或手工建 `papers/<id>/NOTES.md`）。
2. 在 `NOTES.md` 里写定理条目（格式见上）。
3. 双击 `E:\网站\paper-library\update-site.bat`
   （或在 Agentero 里说"更新网站"，`update-blog` skill 会执行同样流程）。
4. 等 1–2 分钟 GitHub Pages 构建完成，刷新网站。

## 部署细节

- **GitHub Pages**：deploy-branch 模式，源 = gh-pages 分支，`build_type: 'legacy'`。
- **自定义域名**：`www.meng-s-blog.top`。三处都要有：gh-pages 分支里的 CNAME 文件、
  GitHub Pages 的 cname 设置、Cloudflare DNS 的 CNAME `www` → `keepseek.github.io`（**DNS only/灰云**）。
  证书由 GitHub 自动签发（几分钟到 24h）。
- **GitHub token**（约 30 天有效，2026-11-21 换发）：在 `deploy-pages.cjs`、`push-api.cjs`、
  `.git/config` remote URL 三处（均 gitignore）。**部署/推送报 401 = token 过期**：
  向用户要新 token，替换这三处。
- 部署脚本的 `api()` 有 5 次网络重试（api.github.com 在本机网络下时好时坏）。

## 环境坑（重要，血泪经验）

本项目的开发环境是 **DSH 沙箱**（workspace = `E:\网站`），以下限制仍然有效：

1. **写 `E:\agentero` 需要 `danger-full-access`**（vault 在 workspace 外）。
2. **Vite 构建**需要 `danger-full-access` + TMP/TEMP 指向 workspace 内：
   ```
   cd web && TMP="E:/网站/paper-library/.tmp" TEMP="E:/网站/paper-library/.tmp" npm run build
   ```
   （用户自己终端里跑 `update-site.bat` 无此限制。）
3. **沙箱内 git push 不可用**（schannel TLS 坏）→ 推 main 用 `node push-api.cjs "<msg>"`。
   注意：push-api.cjs 推的是**全量快照 commit**（parent = 远端 HEAD），本地 git 历史会与远端分叉，
   属正常现象，不要试图用 git push 同步。
4. **外部 HTTP 只能用 `node https`**（curl 的 schannel TLS 坏）。
5. **沙箱禁止 node 进程内 child_process.spawn**。
6. `web_search` 工具在本环境 401（key 坏），别依赖。
7. npm install 模板：`npm install <pkg> --no-audit --no-fund --ignore-scripts --cache "E:/网站/paper-library/.npm-cache"`。
8. Agentero CLI：`C:/Users/lenovo/AppData/Local/Agentero/cli/agentero.exe`，
   从本 workspace 调用必须带 `--vault "E:/agentero"`；JSON 输出 `{"ok":true,"data":…}`。
   用法参考 vault 的 `agentero-cli` skill。

## 测试

```
cd web
node search-test.mjs    # 12 项
node render-test.mjs    # 全部定理记录
node smoke-test.mjs     # 静态冒烟（注意：断言 paperCount === 3，加论文后要改）
```

## 待办 / 已知问题

1. **轮换旧站明文密码**（`账号密码.md`：Vercel/Railway/Atlas 旧账号），然后删旧 Vercel 项目。
2. **GitHub token 到期换新**（三处，见上）。
3. 若用户浏览器仍提示"不安全"：GitHub 自定义域名证书签发中，等几分钟到 24h。
4. `start.bat`（遗留后端启动器）还在 git 跟踪里，可删。
5. 后续方向（`PLAN-2.0.md` 第三节）：PWA、相关定理推荐、导出、定理引用图、语义搜索、移动端。

## 安全

- 仓库是**公开**的：任何要进仓库的文件都不能含 token/密码（`deploy-pages.cjs`、`push-api.cjs`、
  `账号密码.md`、`server/` 均已 gitignore；push-api.cjs 的 `SKIP_FILES` 会兜底跳过前两者）。
- 网站无认证、无用户数据，攻击面 = 静态文件本身。
