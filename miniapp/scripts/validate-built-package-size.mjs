import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptRoot = path.dirname(fileURLToPath(import.meta.url))
const distRoot = path.resolve(scriptRoot, process.argv[2] || '../dist')
const appJsonPath = path.join(distRoot, 'app.json')
const MIB = 1024 * 1024
const MAIN_TARGET = 1.5 * MIB
const SUBPACKAGE_LIMIT = 2 * MIB
const QIANXUN_TARGET = 700 * 1024

assert.ok(fs.existsSync(appJsonPath), `构建产物不存在：${appJsonPath}`)
const appConfig = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'))
const subPackages = appConfig.subPackages || []

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(fullPath) : [fullPath]
  })
}

const ignoredProjectFiles = new Set(['project.config.json', 'project.private.config.json'])
const files = walk(distRoot).filter(file => !ignoredProjectFiles.has(path.relative(distRoot, file).replaceAll('\\', '/')))
const relative = file => path.relative(distRoot, file).replaceAll('\\', '/')
const packageBytes = prefix => files
  .filter(file => relative(file) === prefix || relative(file).startsWith(`${prefix}/`))
  .reduce((total, file) => total + fs.statSync(file).size, 0)

const subpackagePrefixes = subPackages.map(item => String(item.root).replace(/^\/+|\/+$/g, ''))
const mainFiles = files.filter(file => !subpackagePrefixes.some(prefix => relative(file).startsWith(`${prefix}/`)))
const mainBytes = mainFiles.reduce((total, file) => total + fs.statSync(file).size, 0)
const totalBytes = files.reduce((total, file) => total + fs.statSync(file).size, 0)

assert.ok(mainBytes <= MAIN_TARGET, `小程序主包 ${(mainBytes / MIB).toFixed(2)} MiB，超过 1.50 MiB 项目门槛`)
for (const prefix of subpackagePrefixes) {
  const bytes = packageBytes(prefix)
  assert.ok(bytes <= SUBPACKAGE_LIMIT, `分包 ${prefix} ${(bytes / MIB).toFixed(2)} MiB，超过微信 2 MiB 限制`)
}

const qianxunBytes = packageBytes('pages/qianxun')
assert.ok(qianxunBytes <= QIANXUN_TARGET, `千寻分包 ${(qianxunBytes / 1024).toFixed(1)} KiB，超过 700 KiB 项目门槛`)
assert.ok(!files.some(file => /qianxun-center\.png$/i.test(relative(file))), '526KiB 千寻中心插画不得进入构建包')

console.log(`包体门禁通过：主包 ${(mainBytes / MIB).toFixed(2)} MiB，千寻分包 ${(qianxunBytes / 1024).toFixed(1)} KiB，总包 ${(totalBytes / MIB).toFixed(2)} MiB`)
