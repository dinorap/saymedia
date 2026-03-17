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

const vi = JSON.parse(fs.readFileSync(viPath, 'utf8'))
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'))
const viKeys = new Set(Object.keys(flatten(vi)))
const enKeys = new Set(Object.keys(flatten(en)))

const files = walk(appDir)
const re = /\$t\(\s*(['"])([^'"]+)\1\s*\)/g

const used = new Set()
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8')
  let m
  while ((m = re.exec(s))) used.add(m[2])
}

const usedArr = uniqSorted(Array.from(used))
const missingVi = usedArr.filter((k) => !viKeys.has(k))
const missingEn = usedArr.filter((k) => !enKeys.has(k))

console.log(`USED ${usedArr.length}`)
console.log(`MISSING_VI ${missingVi.length}`)
console.log(missingVi.join('\n'))
console.log('---')
console.log(`MISSING_EN ${missingEn.length}`)
console.log(missingEn.join('\n'))

