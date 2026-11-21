// 搜索逻辑回归测试：直接跑 src/data.js 的 search()，数据来自 public/data.json
import { readFileSync } from 'node:fs'
import { store, search } from './src/data.js'

const data = JSON.parse(readFileSync(new URL('./public/data.json', import.meta.url)))
store.papers = data.papers
store.loaded = true

let fail = 0
function check(name, cond, extra = '') {
  const ok = !!cond
  if (!ok) fail++
  console.log(`${ok ? '✓' : '✗'} ${name}${extra ? '  ' + extra : ''}`)
}

function top(q, n = 3) {
  return search(q).slice(0, n).map((h) => `${h.kind}:${h.paper.id}${h.result ? '/' + h.result.id : ''}(${h.score.toFixed(2)})`)
}

// 1. 拉丁关键词
const carleman = search('Carleman')
check('关键词 Carleman 有命中', carleman.length > 0, top('Carleman'))
check('Carleman 命中 dou-zhu-2022-6', carleman.some((h) => h.result?.id === 'dou-zhu-2022-6'))

// 2. 中文关键词
const eq = search('等周')
check('关键词 等周 命中 dou-zhu 论文', eq.some((h) => h.kind === 'paper' && h.paper.id === 'dou-zhu-2022'), top('等周'))

// 3. 作者名
const hang = search('Wang')
check('关键词 Wang 命中 hang-wang-yan-2008', hang.some((h) => h.paper.id === 'hang-wang-yan-2008'), top('Wang'))

// 4. 反查：粘贴"输入/输出"描述（含标签词 输入/输出，应被停用）
const paste = search('输入 边界函数 u ∈ L¹(∂B₁)，输出 极值函数的完整分类')
check('反查描述有命中', paste.length > 0, top(paste.length ? '输入 边界函数 u ∈ L¹(∂B₁)，输出 极值函数的完整分类' : '', 5))
check('反查描述首选 dou-zhu-2022', paste[0]?.paper.id === 'dou-zhu-2022')

// 5. 反查：Poisson 延拓描述
const paste2 = search('输入 f 属于 L^p 边界，输出 Poisson 延拓算子的最佳常数不等式')
check('反查 Poisson 描述有命中', paste2.length > 0, top('输入 f 属于 L^p 边界，输出 Poisson 延拓算子的最佳常数不等式', 5))

// 6. 无命中
check('乱码查询无命中', search('zzzqqqxxx').length === 0)
check('纯停用词无命中', search('输入 输出 备注').length === 0)
check('空查询无命中', search('').length === 0)

// 7. 大小写不敏感
check('大小写不敏感', search('carleman').length === carleman.length)

// 8. 得分排序：更相关的排前面
const s = search('Poisson 延拓 最佳不等式')
check('Poisson 查询有命中', s.length > 0, top('Poisson 延拓 最佳不等式', 5))

console.log(fail ? `\n${fail} 项失败` : '\n全部通过')
process.exit(fail ? 1 : 0)
