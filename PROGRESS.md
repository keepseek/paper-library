# 进度记录（Meng's Blog 重建 → 论文阅读记录库）

## 当前状态：已上线 + Agentero 协同 + PDF 库/快速赢 + 摘要公式修复 ✅（2026-11-22）

### 摘要公式渲染修复（2026-11-22）

**问题**：用户反馈论文详情页摘要里的 LaTeX（`$H,K$`、`$f:H\to K$` 等）显示为原始文本乱码。
**根因**：摘要用 `{{ paper.abstract }}` 纯文本插值，没走 KaTeX 渲染管线（定理的 input/output 都走了，唯独摘要漏了）。
**修复**：`PaperDetail.vue` 摘要改为 `<div class="prose-md" v-html="renderMarkdown(paper.abstract)"></div>`，与定理同管线（marked + markedKatex + DOMPurify）。
**验证**：新增 `web/abstract-test.mjs`——把 data.json 里每篇摘要过一遍渲染管线，检查 `katex-error` 和残留裸 `$`；2611.24942 摘要（大量行内公式）渲染为 KaTeX HTML，0 问题。
**部署**：重新构建（bundle `index-BECPuRIJ.js`）+ 推 gh-pages（commit `7145e07`）+ 推 main（commit `5f1cc3b`）。线上 `www.meng-s-blog.top` 已验证服务新 bundle，摘要区改为 `innerHTML + renderMarkdown` 渲染（含 katex/marked/DOMPurify）。

### PDF 库 + 第一梯队功能（2026-11-22）

**目标**：加一个「PDF 库」页面（目录式，先不托管本地 PDF），并上第一梯队快速赢。用户拍板：本地 PDF 先只建目录、托管以后再说。

- **数据层（sync-vault.mjs）**
  - 扫每个 `papers/<id>/` 顶层 `*.pdf`（不含 `source/`），记录 `file`/`size` → 论文 `local_pdfs`
  - 带出 metadata.json 里原来被丢掉的字段：`is_read` / `html_url` / `added_at`
  - 顶层新增 `pdfCount` / `pdfTotalSize` / `readCount`
- **PDF 库页面（`/pdfs`，`views/PdfLibrary.vue`）**
  - 统计条：本地 PDF 数 / 本地总大小 / 有外链 / 缺 PDF
  - 搜索（标题/作者/标签）+ 筛选（来源/年份/标签）+ 排序（年份/大小/标题）
  - 卡片：本地 PDF（文件名+大小，标「未托管」）、arXiv/DOI 外链（可点）、无 PDF 提示
  - 本地 PDF 暂只登记、不托管到网站（托管功能后续开放）
- **第一梯队快速赢**
  - 已读/未读徽章（PaperCard + PaperDetail，读 `is_read`）
  - 标签云浏览（Home：点标签过滤、再点取消，带论文数）
  - 统计概览（Home 顶部：论文 / 定理 / 本地 PDF / 已读）
  - 导出 Markdown（PaperDetail：整篇下载/复制 + 单条定理下载；新增 `src/export.js`）
  - arXiv HTML 版链接（PaperDetail meta 行 + 本地 PDF 区）
- **导航**：App.vue 加「PDF 库」入口（`router-link-active` 高亮）
- **测试**：search 12/12、render 25/0、smoke 10/10 全过；生产构建 JS 464KB / gzip 152KB
- **已部署**（2026-11-22）：`node deploy-pages.cjs` 推 gh-pages（commit `ccb0083`）+ `node push-api.cjs` 推 main（commit `0c820ce`）。线上 `www.meng-s-blog.top` 已验证为新代码（data.json `pdfCount:1`、bundle 含 PDF 库/已读/导出/标签云）。
  - 部署时 `api.github.com` 网络抖动（脚本 5 次重试扛过）；`cname` PATCH 返回 404（非致命，自定义域名早已配置，站点正常服务）。
  - 自定义域名证书仍由 GitHub 签发中（浏览器若提示"不安全"等几分钟到 24h，见 HANDOVER 待办 3）。

### Agentero 协同（2026-11-21）

**目标**：让"Agentero 里加论文 → 网站自动更新"成为真实工作流，而不只是初始迁移。

- **sync-vault.mjs v2**（双格式兼容）
  - 同时读 Agentero 原生导入的 `metadata.json`（标题/作者/年份/摘要/arXiv/DOI/PDF 链接）
    和种子格式的 NOTES.md frontmatter（venue/tags 覆盖补充）
  - 过滤 `@arxiv:` 自动标签；venue 回退链：frontmatter → extra → `arXiv:<id>`
  - 新字段：abstract / arxiv_id / doi / pdf_url / source_url；按年份倒序
  - 效果：用户自己 Agentero 导入的论文（如 `2611.24942`）现在会自动出现在网站上
- **前端**：PaperDetail 加摘要区 + PDF/arXiv/DOI 链接；搜索文本含摘要
- **一键更新**：`update-site.bat`（双击 = 同步 + 构建 + 部署，约 1 分钟）
- **vault skill**：`E:\agentero\.agents\skills\update-blog\SKILL.md`
  — 在 Agentero 里说"更新网站"即可触发同步部署；vault `AGENTS.md` 加了网站说明段
- **数据**：3 篇论文 / 25 条定理（含用户自己的 2611.24942，0 条定理——定理要写在 NOTES.md 里）
- 测试全过（search 12 项 / render 25 条 0 问题 / smoke 10 项），已重新部署 gh-pages

### 部署完成（2026-11-21）

- 仓库 `keepseek/paper-library` 已转**公开**（转公开前已确认无敏感信息：token/密码文件 gitignore，server/ 移出仓库，文档去密码）
- `web/dist` 已推到 **gh-pages** 分支（含 CNAME 文件）
- GitHub Pages 已开启（deploy branch 模式，status: built）
- 自定义域名 `www.meng-s-blog.top` 已在 GitHub 侧设置
- **等用户操作**：Cloudflare DNS 加 CNAME `www` → `keepseek.github.io`（Proxy 选 **DNS only/灰云**），之后 https://www.meng-s-blog.top/ 生效（GitHub 自动签证书，几分钟到几小时）
- 部署脚本：`deploy-pages.cjs`（gitignore，含 token；可重复运行，幂等）
- 旧站退役：DNS 切走后，Vercel 上的旧项目可删

### 静态化改造（2026-11-21）

**决定**：不搞后端了，只搞本地 + 前端。Agentero vault（`E:\agentero`）= 唯一数据源，静态站点免费托管（公开、无认证）。

- **数据迁移**：旧库 2 篇论文 + 25 条定理 → Agentero vault
  - `papers/dou-zhu-2022/NOTES.md`（12 条定理）
  - `papers/hang-wang-yan-2008/NOTES.md`（13 条定理）
  - 格式：YAML frontmatter（title/authors/year/venue/tags）+ `## 定理` 块（`- **输入**：/ - **输出**：/ - **备注**：`）
  - 一次性脚本：`migrate-dump.cjs`（DB→JSON）、`migrate-to-agentero.cjs`（JSON→NOTES.md）
- **同步工具**：`sync-vault.mjs`（零依赖，直接读 vault 文件，不依赖 Agentero CLI catalog）
  - 用法：`node sync-vault.mjs [vaultPath]`（默认 `E:/agentero`）→ 写 `web/public/data.json`
  - 生成结果：2 篇论文 / 25 条定理，LaTeX 完整（0 双反斜杠、0 未闭合 `$$`、0 空输入输出）
- **前端静态化**（`web/src/`）
  - 新增 `data.js`：启动 fetch 一次 `data.json` + 客户端搜索（中文双字滑窗 + 拉丁整词，反查 = 描述分词按命中占比打分）
  - 路由只剩 `/` 和 `/paper/:id`（hash 路由，静态托管免服务端重写）
  - 删除：`api.js`、`auth.js`、Login/Members/PaperEdit/ResultEdit/Import 五个视图
  - PaperDetail 只读化：BibTeX 改为客户端生成；PaperCard 去掉状态徽章
  - `vite.config.js`：`base: './'`（任意子路径可部署），去掉 API proxy
- **测试全过**
  - `web/search-test.mjs`：12 项（关键词/反查/停用词/大小写/排序）
  - `web/render-test.mjs`：25 条记录 0 问题
  - `web/smoke-test.mjs`：静态资源冒烟（相对路径、无 /api 残留、data.json 可访问）
  - 生产构建：JS 452KB / gzip 148KB（含 KaTeX 字体）
- **清理**
  - `server/`（遗留 Express 后端）gitignore，仅留本地
  - `start.bat`、根 `package-lock.json`（空）移除
  - PLAN-2.0.md / PROGRESS.md 重写，去掉明文密码

### 待办

1. GitHub 自动为自定义域名签证书（若浏览器仍提示"不安全"，等几分钟到 24h 再刷新）
2. DNS 已切走，Vercel 上的旧项目可删
3. 旧站退役前轮换旧文档里的明文密码（见 PLAN-2.0.md 安全提醒）
4. GitHub token 到期换新（当前 token 2026-11-21 换发，有效期看用户设置）

---

## 历史

### M1.5 两级结构 + 电子墨水风 + $$ 渲染修复（2026-11-19）

- **$$ 块级公式渲染修复**：`web/src/md.js` 加预处理 `normalizeDisplayMath`（行首 `$$` 前补空行）。修复后 25 条记录全部正常渲染。支持语法详见 `PLAN-2.0.md` 附录。
- **两级结构**（当时为后端方案）：论文 = 文件夹，定理 = 条目（单表 `papers` + `parent_id`/`section`/`sort_order`）；搜索命中论文或定理（kind + parent 信息）；md 导入定理模式自动分组；可见性继承/级联删除。
- **数据**：《延拓算子相关结论整理.md》导入 → Dou–Zhu（Adv. Math. 404 (2022) 108383）12 条 + Hang–Wang–Yan（CPAM 61 (2008) 54–95）13 条。
- **前端**：guizang 电子墨水风（暖纸底 #faf8f2 / 墨色 / 朱砂强调 #c05f2a / 衬线标题）；首页反查搜索框 + 标签/状态筛选；论文详情 = 论文头 + 定理条目（输入/输出高亮框）。
- **后端**（Express 4 + node:sqlite，现已退役）：注册/登录/JWT/bcrypt、论文 CRUD + 可见性、md 导入、FTS5 trigram 搜索、BibTeX 导出、成员管理。
- 测试：`server/test-api.cjs` 30 项全过（历史）。

### 沙箱构建经验（重要，仍然有效）

- 沙箱**禁止 node 进程内任何 child_process.spawn**（连 node 自身都不行）
- Vite 构建必须：`sandbox_permissions: danger-full-access`（用户批准）+ `TMP/TEMP` 指向工作区内目录
  ```
  cd web && TMP="E:/网站/paper-library/.tmp" TEMP="E:/网站/paper-library/.tmp" npm run build
  ```
- npm install 模板：`npm install <pkg> --no-audit --no-fund --ignore-scripts --cache "E:/网站/paper-library/.npm-cache"`
- 外部 HTTP 用 `node https`（curl schannel 坏）；web_search/Hindsight 本环境时好时坏
- **git push 在沙箱里不可用**（schannel TLS 坏）→ 用 `push-api.cjs`（GitHub Git Data API，node https）推送，每次推一个全量 commit：`node push-api.cjs "<message>"`

### 仓库

- `keepseek/paper-library`（当前私有，main 分支）
- token 在本地 `.git/config` remote URL + `push-api.cjs`（均 gitignore），30 天有效
