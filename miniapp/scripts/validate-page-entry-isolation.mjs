import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sourceRoot = path.resolve(__dirname, '../src')
const appConfigPath = path.join(sourceRoot, 'app.config.ts')

function readAppConfig() {
  const source = fs.readFileSync(appConfigPath, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: appConfigPath,
  }).outputText
  const module = { exports: {} }
  const evaluate = new Function('exports', 'module', 'process', compiled)
  evaluate(module.exports, module, { env: { ...process.env, MINIAPP_DEV_FIXED_LOGIN: 'false' } })
  return module.exports.default
}

function configuredRoutes(config) {
  const main = Array.isArray(config.pages) ? config.pages : []
  const sub = (config.subPackages || []).flatMap(pkg =>
    (pkg.pages || []).map(page => `${pkg.root}/${page}`)
  )
  return [...main, ...sub]
}

function resolveSource(specifier, importer) {
  let base
  if (specifier.startsWith('@/')) base = path.join(sourceRoot, specifier.slice(2))
  else if (specifier.startsWith('.')) base = path.resolve(path.dirname(importer), specifier)
  else return undefined

  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
    path.join(base, 'index.js'),
    path.join(base, 'index.jsx'),
  ]
  return candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile())
}

function readImports(file) {
  const source = fs.readFileSync(file, 'utf8')
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const imports = []
  const visitNode = node => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      && node.moduleSpecifier
      && ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.push(node.moduleSpecifier.text)
    } else if (
      ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments.length === 1
      && ts.isStringLiteral(node.arguments[0])
    ) {
      imports.push(node.arguments[0].text)
    }
    ts.forEachChild(node, visitNode)
  }
  visitNode(sourceFile)
  return imports
}

const routes = configuredRoutes(readAppConfig())
assert.equal(new Set(routes).size, routes.length, 'app.config.ts 存在重复页面路由')
assert.equal(routes.length, 84, `app.config.ts 页面数应为 84，实际为 ${routes.length}`)

const entries = routes.map(route => {
  const file = resolveSource(`@/${route}`, appConfigPath)
  assert.ok(file, `app.config.ts 页面入口不存在：${route}`)
  return path.normalize(file)
})
const entrySet = new Set(entries)
const violations = []

for (const entry of entries) {
  const visited = new Set()
  const visit = file => {
    if (visited.has(file)) return
    visited.add(file)
    for (const specifier of readImports(file)) {
      const dependency = resolveSource(specifier, file)
      if (!dependency) continue
      const normalized = path.normalize(dependency)
      if (normalized !== entry && entrySet.has(normalized)) {
        violations.push(
          `${path.relative(sourceRoot, entry)} -> ${path.relative(sourceRoot, normalized)}`
        )
        continue
      }
      visit(normalized)
    }
  }
  visit(entry)
}

assert.deepEqual(
  [...new Set(violations)],
  [],
  `页面入口及其递归依赖禁止导入或转出另一个页面入口，否则 Taro 可能重复注册 Page：\n${[...new Set(violations)].join('\n')}`
)

console.log(`页面入口隔离门禁通过：已按 app.config.ts 递归检查 ${entries.length} 个页面`)
