import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const drawer = fs.readFileSync(path.join(root, 'src/components/ui/drawer.tsx'), 'utf8')

assert.match(drawer, /onCloseRef\s*=\s*React\.useRef/, 'Drawer 必须用 ref 保存最新关闭回调')
assert.match(drawer, /onCloseRef\.current\s*=\s*onClose/, 'Drawer 必须同步最新关闭回调')
assert.match(drawer, /onCloseRef\.current\(\)/, 'Escape 必须调用最新关闭回调')
assert.doesNotMatch(drawer, /\},\s*\[onClose,\s*open\]\)/, '焦点副作用不得依赖不稳定 onClose')
assert.match(drawer, /\},\s*\[open\]\)/, '焦点与滚动锁副作用必须只随 open 改变')

console.log('管理后台抽屉输入焦点闭环门禁通过')
