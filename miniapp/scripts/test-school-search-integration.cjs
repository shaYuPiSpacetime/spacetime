const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

test('学校搜索 API 使用公开字典接口并固定请求10条', () => {
  const paths = read('src/constants/prd01ApiPaths.ts')
  const service = read('src/services/prd01.ts')
  assert.match(paths, /schools:\s*'\/miniapp\/dict\/schools'/)
  assert.match(service, /searchSchools:\s*\(keyword: string, limit = 10\)/)
})

test('基础资料和学历认证均接入学校联想搜索并提交 schoolCode', () => {
  const basic = read('src/pages/verification/components/BasicInfoCard.tsx')
  const education = read('src/pages/verification/components/EducationSubmitPage.tsx')
  const runtime = read('src/domain/prd01Runtime.ts')
  assert.match(basic, /<SchoolSearchInput/)
  assert.match(basic, /schoolCode:\s*code \|\| ''/)
  assert.match(education, /<SchoolSearchInput/)
  assert.match(education, /schoolCode,/)
  assert.match(runtime, /form\.schoolCode\?\.trim\(\)/)
})

test('手动修改学校名称会清空学校编码，兼容港澳台及海外学校', () => {
  const component = read('src/components/SchoolSearchInput.tsx')
  assert.match(component, /onChange\(event\.detail\.value, undefined\)/)
  assert.match(component, /onChange\(option\.name, option\.code\)/)
})
