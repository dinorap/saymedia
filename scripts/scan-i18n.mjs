import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('d:/FreeLand/taphoa-mmo')
const appDir = path.join(root, 'app')
const viPath = path.join(root, 'i18n/locales/vi.json')
const enPath = path.join(root, 'i18n/locales/en.json')

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const ent of entries) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (['node_modules', '.nuxt', '.output', '.git', 'dist', 'build'].includes(ent.name)) continue
      walk(p, out)
    } else if (/\.(vue|ts|js)$/.test(p)) {
      out.push(p)
    }
  }
  return out
}

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out)
    else out[key] = v
  }
  return out
}

function uniqSorted(arr) {
  return Array.from(new Set(arr)).sort()
}

function createLineLookup(text) {
  const starts = [0]
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') starts.push(i + 1)
  }
  return (index) => {
    let lo = 0
    let hi = starts.length - 1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (starts[mid] <= index) lo = mid + 1
      else hi = mid - 1
    }
    return hi + 1
  }
}

function looksLikeHumanText(s) {
  const t = String(s || '').trim()
  if (t.length < 4) return false
  if (/^(https?:|\/|#|--|[.$@]|var\(|rgb\(|[a-z]+:\/\/)/i.test(t)) return false
  if (/^\d+([.,:/-]\d+)*$/.test(t)) return false
  // likely code/expression fragments
  if (/[{}()[\]=><]|=>|::|\$\w+/.test(t)) return false
  if (/\b(import|from|const|let|return|function|class|async|await)\b/.test(t)) return false
  if (/\.vue\b|\.ts\b|\.js\b/.test(t)) return false
  // key/code-like token
  if (/^[a-z0-9_.:/-]+$/i.test(t)) return false
  // has handlebars/template expression
  if (t.includes('{{') || t.includes('}}') || t.includes('${')) return false

  const hasVi = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(t)
  const hasWords = /[A-Za-zÀ-ỹđ][A-Za-zÀ-ỹđ0-9]*/.test(t) && /\s+[A-Za-zÀ-ỹđ]/.test(t)
  return hasVi || hasWords
}

function scanHardcodedCandidates(filePath, content) {
  const rel = path.relative(root, filePath).replace(/\\/g, '/')
  const toLine = createLineLookup(content)
  const out = []

  // 1) Quoted strings in script/style/template attributes
  const quotedRe = /(['"`])((?:\\.|(?!\1).)*)\1/g
  let m
  while ((m = quotedRe.exec(content))) {
    const full = m[0]
    const body = m[2]
    if (!looksLikeHumanText(body)) continue
    if (!/[A-Za-zÀ-ỹđ]\s+[A-Za-zÀ-ỹđ]/.test(body) && !/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(body)) continue
    // Skip direct i18n keys and common refs
    if (/^[a-z0-9_.-]+$/i.test(body)) continue
    if (/\$t\(\s*['"`]/.test(content.slice(Math.max(0, m.index - 8), m.index + full.length + 4))) continue
    out.push({
      file: rel,
      line: toLine(m.index),
      sample: body.slice(0, 120),
    })
  }

  // 2) Raw template text nodes between tags (Vue)
  if (filePath.endsWith('.vue')) {
    const textNodeRe = />\s*([^<\n][^<]*)\s*</g
    let t
    while ((t = textNodeRe.exec(content))) {
      const nodeText = String(t[1] || '').trim()
      if (!looksLikeHumanText(nodeText)) continue
      out.push({
        file: rel,
        line: toLine(t.index),
        sample: nodeText.slice(0, 120),
      })
    }
  }

  return out
}

const vi = JSON.parse(fs.readFileSync(viPath, 'utf8'))
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'))
const viKeys = new Set(Object.keys(flatten(vi)))
const enKeys = new Set(Object.keys(flatten(en)))

const files = walk(appDir)
const re = /\$t\(\s*(['"])([^'"]+)\1\s*\)/g

const used = new Set()
const hardcoded = []
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8')
  let m
  while ((m = re.exec(s))) used.add(m[2])
  hardcoded.push(...scanHardcodedCandidates(f, s))
}

const usedArr = uniqSorted(Array.from(used))
const missingVi = usedArr.filter((k) => !viKeys.has(k))
const missingEn = usedArr.filter((k) => !enKeys.has(k))
const hardcodedUniq = uniqSorted(
  hardcoded.map((h) => `${h.file}:${h.line}  ${h.sample}`),
)

console.log(`USED ${usedArr.length}`)
console.log(`MISSING_VI ${missingVi.length}`)
console.log(missingVi.join('\n'))
console.log('---')
console.log(`MISSING_EN ${missingEn.length}`)
console.log(missingEn.join('\n'))
console.log('---')
console.log(`HARD_CODED_CANDIDATES ${hardcodedUniq.length}`)
console.log(hardcodedUniq.join('\n'))

