import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distRoot = path.resolve(__dirname, process.argv[2] || '../dist')
const appJsonPath = path.join(distRoot, 'app.json')

assert.ok(fs.existsSync(appJsonPath), `构建产物不存在：${appJsonPath}`)
const appConfig = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'))
const routes = [
  ...(appConfig.pages || []),
  ...(appConfig.subPackages || []).flatMap(pkg =>
    (pkg.pages || []).map(page => `${pkg.root}/${page}`)
  ),
]
assert.equal(routes.length, 67, `dist/app.json 页面数应为 67，实际为 ${routes.length}`)

function countRegistrations(source, expression) {
  return [...source.matchAll(expression)].length
}

const pageFiles = new Set(routes.map(route => path.normalize(path.join(distRoot, `${route}.js`))))
for (const pageFile of pageFiles) {
  assert.ok(fs.existsSync(pageFile), `页面构建产物缺失：${path.relative(distRoot, pageFile)}`)
  const source = fs.readFileSync(pageFile, 'utf8')
  assert.equal(
    countRegistrations(source, /\bPage\s*\(/g),
    1,
    `${path.relative(distRoot, pageFile)} 必须且只能注册一次 Page`
  )
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(fullPath) : [fullPath]
  })
}

const javascriptFiles = walk(distRoot).filter(file => file.endsWith('.js'))
for (const file of javascriptFiles) {
  if (pageFiles.has(path.normalize(file))) continue
  const source = fs.readFileSync(file, 'utf8')
  assert.equal(
    countRegistrations(source, /\bPage\s*\(/g),
    0,
    `共享构建产物禁止注册 Page：${path.relative(distRoot, file)}`
  )
}

const appFile = path.join(distRoot, 'app.js')
assert.ok(fs.existsSync(appFile), '构建产物缺少 app.js')
const appRegistrationCount = javascriptFiles.reduce(
  (count, file) => count + countRegistrations(fs.readFileSync(file, 'utf8'), /\bApp\s*\(/g),
  0
)
assert.equal(appRegistrationCount, 1, `全部构建产物必须且只能注册一次 App，实际为 ${appRegistrationCount}`)
assert.equal(
  countRegistrations(fs.readFileSync(appFile, 'utf8'), /\bApp\s*\(/g),
  1,
  'App 必须由 app.js 注册'
)

console.log(`构建注册门禁通过：${routes.length} 个页面均 Page=1，共享脚本 Page=0，App=1`)
