# 进度记录（Meng's Blog 重建 → 论文阅读记录库）

## 当前状态：M1 功能完成 ✅（2026-11-19）

### 已完成
- **后端**（Express 4 + node:sqlite，零原生依赖）
  - 账号：注册/登录/JWT(7d)/bcrypt；首个注册用户 = owner，之后需邀请码（7 天有效）
  - 论文 CRUD + 可见性 private/lab/public（owner 全见；member 见 lab/public+自己 private；guest 仅 public）
  - md 导入：frontmatter + `##` 中英文章节别名（输入/输出/一句话总结/问题/主要结果/方法/笔记）
  - FTS5 trigram 搜索：中文子串匹配 + bm25 加权（title 10 / one_liner 5 / input 8 / output 8 / main_results 4）
  - BibTeX 导出、成员管理（邀请码/删成员连带删论文）
- **前端**（Vue 3 + Vite 5 + Tailwind 3 + marked + KaTeX + DOMPurify）
  - 首页大搜索框（反向查找：贴"输入/输出"描述找论文）+ 标签/状态筛选
  - 论文详情（输入/输出高亮框、BibTeX 复制、编辑/删除）
  - md 导入页（模板下载）、登录/注册（邀请码）、成员管理页
  - 生产构建通过：`web/dist`（JS 467KB / gzip 153KB，含 KaTeX 字体）
- **测试**：`server/test-api.cjs` 回归套件 13/13 通过
  （登录×2、搜索×4 含 guest 隔离、列表×3、详情、403 隔离、bibtex、短查询保护）

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
- 2 篇论文（含"边界函数 u ∈ L¹(∂B₁)"输入样例）
- 测试服务器：端口 3210（后台 job bash-193f36ade3b64958）

## 等用户（阻塞部署）
1. **GitHub**：建空仓库 `keepseek/paper-library` + fine-grained token（30 天，仅该仓库，Contents: Read and write）
2. **Oracle Cloud Always Free**：用户自己注册，开 ARM 实例（24GB 内存，跑 M2 本地 embedding）
3. **UI 风格参考样例**：用户说后续给

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
