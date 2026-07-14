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
assert.match(profileEdit, /prd01Api\.getHomeDetail/, '编辑资料页必须读取主页统一详情接口')
assert.match(profileEdit, /prd01Api\.getBasicProfile/, '编辑资料页必须读取基础资料接口')
assert.doesNotMatch(profileEdit, /getDemoPageData/, '编辑资料页禁止继续读取蓝湖演示数据')

console.log('编辑资料主页预览导航门禁通过')
