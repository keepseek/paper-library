const fs = require('fs')
const p = 'src/routes/papers.js'
let s = fs.readFileSync(p, 'utf8')
const bad = "lines.join('" + String.fromCharCode(92, 92) + "n')"
const good = "lines.join('" + String.fromCharCode(92) + "n')"
if (!s.includes(bad)) { console.log('bad pattern not found'); process.exit(1) }
s = s.replace(bad, good)
fs.writeFileSync(p, s)
const i = s.indexOf('lines.join')
console.log('now:', JSON.stringify(s.slice(i, i + 30)))
