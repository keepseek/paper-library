# 进度记录（Meng's Blog 重建 → 论文阅读记录库）

## 当前状态：已部署 GitHub Pages，等 DNS 切换 ✅（2026-11-21）

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

1. **用户**：Cloudflare DNS 加 CNAME `www` → `keepseek.github.io`（DNS only/灰云）
2. 旧站退役前轮换旧文档里的明文密码（见 PLAN-2.0.md 安全提醒）
3. GitHub token 到期换新（当前 token 2026-11-21 换发，有效期看用户设置）

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
