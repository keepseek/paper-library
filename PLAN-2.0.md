# Meng's Blog 2.0 计划书

> 更新：2026-11-19
> 当前状态：M1.5（两级结构 + 电子墨水前端）已完成，渲染问题已修复
> 一句话定位：把「粘贴一段输入/输出描述 → 找到对应论文」做成一个可检索、可积累、可分享的**论文阅读记录库**。

---

## 一、渲染问题诊断与修复（已完成）

### 1.1 现象

25 条定理中，11 条的输出（外加 1 条备注）里的 `$$` 块级公式不渲染：

- 原始 LaTeX 直接显示；
- 公式被 markdown 破坏：`\|` → `|`、`\,` → `,`、成对的 `_` → `<em>`（斜体）；
- `$` 配对错位，中文文字被误当成公式渲染（KaTeX strict 模式告警 “Unicode text character 只 used in math mode”）。

受影响条目：id 30、31、32、33、34、35、36、47、48、49、51（11 / 25）。

### 1.2 根因

渲染管线为 `marked.parse` + `marked-katex-extension` + `DOMPurify.sanitize`。

`marked-katex-extension` 的**块级规则**要求 `$$` 位于块首（前面是空行或文本开头）。但笔记里 `$$` 常常**紧跟在文字行后面**（中间没有空行），于是：

1. CommonMark 的 lazy continuation 把整段并入上一个段落；
2. 块级规则不触发（`$$` 不在块首）；
3. 行内规则又**禁止公式内换行**，同样不触发；
4. 结果：公式不被识别，还被 markdown 二次破坏。

> 已排除的“假警报”：DOMPurify 默认**允许** MathML，`<math>` 不会被剥掉；#49 里多出的 `f_i` 是 KaTeX 标准的 `<annotation encoding="application/x-tex">` 元素，属正常输出。

### 1.3 修复

在 `web/src/md.js` 增加预处理 `normalizeDisplayMath`：在**行首 `$$` 前补一个空行**，让块级规则能匹配。

```js
function normalizeDisplayMath(text) {
  return text.replace(/([^\n])\n(?=[ \t]*\$\$)/g, '$1\n\n')
}
```

修复后 25 条记录（输入 + 输出 + 备注）全部正常渲染，`render-test.mjs` 报告 **0 处问题**。

### 1.4 支持的语法（什么能渲染出来）

| 语法 | 示例 | 状态 |
| --- | --- | --- |
| 行内公式（单行） | `$u\in L^p$` | ✅ 正常 |
| 块级公式 | `$$` 独占一行 + 公式 + `$$` 独占一行 | ✅ 正常（修复后紧跟文字行也可） |
| KaTeX 命令 | `\frac \int \sum \| \, \mathbb \partial \infty \le \ge \dfrac \left \right \sqrt \Gamma \omega \lambda \xi \in \to \cap \setminus \overline \mathrm \text` | ✅ 正常 |
| Markdown（notes 字段） | 标题、列表、加粗、斜体、链接、代码块 | ✅ 正常 |

**注意事项**

- 行内公式 `$...$` 必须**单行**；不支持跨行的行内公式。
- 块级公式的 `$$` 必须**独占一行**（开、闭各占一行）。
- 公式内不要混用 markdown 语法（如 `_` 在公式里是下标，但公式没被正确定界时会被 markdown 当斜体）。
- 中文不要放进 `$...$` 里（KaTeX strict 模式会告警）。

---

## 二、后续发展路线图

### M2：混合检索（BM25 + 向量）

**目标**：让搜索具备**语义**能力。例如搜“最佳常数”，即使原文没有这个确切短语，也能找到讲最优常数的定理。

**现状**：FTS5 trigram 分词 + BM25。擅长精确 / 部分字符串匹配，语义弱。

**方案**

1. 在 Oracle 免费机（24GB RAM，$0）上部署**本地 embedding 模型**：
   - 候选：`BAAI/bge-small-zh-v1.5`（中文，小快）或 `paraphrase-multilingual-MiniLM-L12-v2`（多语言）。
2. 对每篇论文 / 每条定理（title + one_liner + input + output + notes）生成向量。
3. 向量存储：数据量小（几十到几百条），用 **SQLite BLOB + numpy 暴力余弦**即可，无需向量数据库。
4. 混合检索：BM25（现有）+ 向量检索，用 **Reciprocal Rank Fusion（RRF）** 融合，`score(d) = Σ 1/(k + rank_i(d))`，k 取 60。

**收益**：语义搜索、同义词召回、更好的 recall。
**工作量**：中。

### M3：PDF / RAG / PWA

- **PDF 上传与解析**（可选）：当前明确“不做 PDF 解析”，这是后续方向。可用 `pdf-parse` 抽文本，数学公式识别需更重的方案。
- **RAG**：基于论文内容的问答。依赖 M2 的 embedding + 检索增强生成（本地 LLM 或 API）。
- **PWA**：离线访问、可安装到主屏。Vite 用 `vite-plugin-pwa`（manifest + service worker）。

### 其他想法（按价值排序）

1. **相关定理 / 推荐**：基于内容相似度，在论文详情页推荐相关定理。
2. **标签体系完善**：更结构化的标签（如按算子类型、不等式类型），支持标签组合筛选。
3. **导出**：单条 / 整篇导出为 Markdown 或 PDF。
4. **定理引用关系图**：可视化哪些定理引用 / 依赖哪些定理。
5. **阅读进度**：记录已读 / 未读，支持“继续上次”。
6. **协作**：多成员评论、批注、共同维护。
7. **移动端优化**：更小的卡片、更好的触摸体验。

---

## 三、部署现状与待办

### 现状

- 本地开发完成（M1.5 + 渲染修复），代码已推 GitHub（`keepseek/paper-library`，私有）。
- Oracle Cloud Always Free **注册待办**（用户暂时无法注册）。

### 部署计划（Oracle 注册后）

1. 注册 Oracle Cloud Always Free，创建 **ARM A1** 实例（4 OCPU / 24GB，Ubuntu 24.04，区域：日本（东京））。
2. 部署应用（Node.js + SQLite，`node:sqlite` 零原生依赖）。
3. Cloudflare：CNAME → A 记录。
4. 下线旧站。

> 详细步骤见 `PROGRESS.md`（SSH key `~/.ssh/mengs-blog`，端口 22/80/443）。

### ⚠️ 安全提醒

旧文档 `E:\网站\.inspect\blog-doc.txt` 里有**明文密码**：

- `cute_panda:123Mengjiao`
- `Admin@2026Secure!`

**部署新站前务必轮换这两个密码。**

### 其他待办

- GitHub token **30 天后过期**，届时需换新 token。
- 测试产物 `web/render-test.mjs` 可保留为开发工具，或加入 `.gitignore`。
- `jsdom` 是 `--no-save` 装的（不在 package.json），仅测试用。
