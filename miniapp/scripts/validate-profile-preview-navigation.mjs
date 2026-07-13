import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const profileEdit = fs.readFileSync(path.join(rootDir, 'src/pages/profile/edit.tsx'), 'utf8')

assert.doesNotMatch(
  profileEdit,
  /Taro\.navigateTo\(\{\s*url:\s*['"]\/pages\/profile\/index\?variant=preview['"]/,
  '主页预览禁止通过 navigateTo 打开底部 Tab 页面'
)
assert.match(
  profileEdit,
  /import ProfilePreviewPage from ['"]\.\/components\/ProfilePreviewPage['"]/,
  '编辑资料页必须复用主页预览组件'
)
assert.match(
  profileEdit,
  /showPreview\s*\?\s*\(/,
  '编辑资料和主页预览必须在当前页面内切换'
)

console.log('编辑资料主页预览导航门禁通过')
