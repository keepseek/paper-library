# 进度记录（Meng's Blog 重建 → 论文阅读记录库）

## 当前状态：M1.5 两级结构 + 电子墨水风 + $$ 渲染修复 ✅（2026-11-19）

### 渲染修复 + 2.0 计划书（2026-11-19）
- **$$ 块级公式渲染修复**：笔记里 `$$` 常紧跟文字行（无空行），marked-katex-extension 块级规则不触发 → 公式不渲染且被 markdown 破坏（`\|`→`|`、`\,`→`,`、`_`→`<em>`、`$` 配对错位把中文当公式）。
  - 修复：`web/src/md.js` 加预处理 `normalizeDisplayMath`——行首 `$$` 前补空行。
  - 修复后 25 条记录（输入+输出+备注）全部正常渲染，`render-test.mjs` 报告 0 处问题。
  - 支持语法详见 `PLAN-2.0.md`（行内单行 `$...$`、块级 `$$` 独占行、KaTeX 命令、Markdown）。
- **2.0 计划书**：`PLAN-2.0.md`（渲染诊断 + M2 混合检索 / M3 PDF·RAG·PWA 路线图 + 部署待办 + 安全提醒）。
- `push-api.cjs` 支持传 commit message 参数（之前硬编码 M1 消息）。

### 本次新增（M1.5）
- **两级结构**：论文 = 文件夹，定理 = 条目（单表 `papers` + `parent_id`/`section`/`sort_order`）
  - `GET /` 只列论文（`parent_id IS NULL`），带 `result_count`
  - `GET /search` 命中论文或定理，带 `kind`（paper/result）+ `parent_id`/`parent_title`
  - `POST /import-md` 定理模式按来源论文（作者+期刊）自动分组 → 父论文 + 子条目
  - 定理条目 CRUD：`POST /:id/results`、`PUT /results/:rid`、`DELETE /results/:rid`
  - 可见性：子条目继承父论文；父论文改可见性时同步子条目；删论文级联删子条目
- **数据**：用户的《延拓算子相关结论整理.md》重新导入 → 2 篇论文
  - Dou–Zhu（Adv. Math. 404 (2022) 108383）12 条定理
  - Hang–Wang–Yan（CPAM 61 (2008) 54–95）13 条定理
- **前端**：guizang 电子墨水风（暖纸底 #faf8f2 / 墨色 / 朱砂强调 #c05f2a / 衬线标题）
  - 首页卡片显示「N 条定理」；搜索结果区分 论文/定理 徽章，定理条目链回父论文
  - 论文详情 = 论文头 + 定理条目列表（每条输入/输出高亮框 + 编辑/删除）
  - 新增 `ResultEdit.vue`（`/paper/:id/results/new`、`/result/:id/edit`）
- **测试**：`server/test-api.cjs` 重写为 30 项，全部通过
  （列表 result_count、详情 results 数组、搜索 kind/parent、条目 CRUD、可见性传播、级联删除）
- 生产构建通过：`web/dist`（JS 474KB / gzip 155KB，含 KaTeX 字体）

### 已完成（M1）
- **后端**（Express 4 + node:sqlite，零原生依赖）
  - 账号：注册/登录/JWT(7d)/bcrypt；首个注册用户 = owner，之后需邀请码（7 天有效）
  - 论文 CRUD + 可见性 private/lab/public（owner 全见；member 见 lab/public+自己 private；guest 仅 public）
  - md 导入：① 模板格式（frontmatter + `##` 中英文章节别名）② 定理整理格式（`**输入**：/ **输出**：` 自动拆分，来源论文自动识别）
  - FTS5 trigram 搜索：中文子串匹配 + bm25 加权（title 10 / one_liner 5 / input 8 / output 8 / main_results 4）
  - BibTeX 导出、成员管理（邀请码/删成员连带删论文）
- **前端**（Vue 3 + Vite 5 + Tailwind 3 + marked + KaTeX + DOMPurify）
  - 首页大搜索框（反向查找：贴"输入/输出"描述找论文）+ 标签/状态筛选
  - 论文详情（输入/输出高亮框、BibTeX 复制、编辑/删除）
  - md 导入页（模板下载）、登录/注册（邀请码）、成员管理页

### 本次修复的 bug
1. 搜索 0 命中：公开 GET 路由没解析 JWT → 登录用户被当 guest 过滤。
   修复：`auth.js` 新增 `authOptional`，挂到 list/search/detail/bibtex 四个 GET 路由。
2. 服务器启动时 dist 不存在则永不注册静态中间件 → 改为动态判断。

### 沙箱构建经验（重要）
- 沙箱**禁止 node 进程内任何 child_process.spawn**（连 node 自身都不行）
- Vite 构建必须：`sandbox_permissions: danger-full-access`（用户批准）+ `TMP/TEMP` 指向工作区内目录（系统 Temp 不可写）
- 命令模板：
  ```
  mkdir -p "E:/网站/paper-library/.tmp"
  cd web && TMP="E:/网站/paper-library/.tmp" TEMP="E:/网站/paper-library/.tmp" npm run build
  ```
- npm install 模板：`npm install <pkg> --no-audit --no-fund --ignore-scripts --cache "E:/网站/paper-library/.npm-cache"`
- 外部 HTTP 用 `node https`（curl schannel 坏）；web_search/Hindsight/MinerU 本环境不可用

### 测试数据（server/data/blog.db）
- owner: meng@test.com / test123456
- member: mate@test.com / test123456
- 2 篇论文 + 25 条定理条目（来自用户的延拓算子笔记）
- 测试服务器：端口 3210（后台 job，代码改动后需重启）

## 等用户（阻塞部署）
1. ~~GitHub~~ ✅ 已完成（2026-11-19）：`keepseek/paper-library`（私有）已推送，main 分支
   - token 存在本地 `.git/config` 的 remote URL 里（30 天有效，到期需换新）
   - **git push 在沙箱里不可用**（schannel TLS 坏）→ 用 `push-api.cjs`（GitHub Git Data API，node https）推送
   - 推送前改完代码直接 `node push-api.cjs` 即可（每次推一个全量 commit）
2. **Oracle Cloud Always Free**：用户自己注册，开 ARM 实例（24GB 内存，跑 M2 本地 embedding）
3. ~~UI 风格参考样例~~ ✅ 已定：guizang 电子墨水风（暖纸底 + 衬线 + 朱砂强调），2026-11-19 完成

## 部署步骤（拿到 token + 实例后）
1. `git init` + push 到 keepseek/paper-library
2. Oracle 实例：clone → `npm install`（server+web）→ `npm run build`（web）→ systemd 跑 server（PORT=3000, JWT_SECRET, DATA_DIR）
3. Cloudflare：meng-s-blog.top 的 CNAME→Vercel 改为 A 记录→Oracle 公网 IP
4. 退役旧站：Vercel 项目 + 旧 Railway + MongoDB Atlas（⚠️ 旧文档里有明文密码 cute_panda:123Mengjiao 和 Admin@2026Secure!，提醒用户轮换/删库）

## M2 计划（部署后）
- 本地 embedding 模型（Oracle 24GB 内存，$0）+ 混合检索 BM25+向量 RRF 融合
- 反向查找框升级：贴"输入/输出"描述 → 语义匹配
- BibTeX 完善

## M3 计划
- PDF 处理/RAG（存链接不解析，直接处理 PDF 放 M3）、PWA
