/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const miniappRoot = path.resolve(__dirname, '..')
const read = relativePath => fs.readFileSync(path.join(miniappRoot, relativePath), 'utf8')

test('自我介绍提交接口返回明确的审核结果类型', () => {
  const types = read('src/types/prd01.ts')
  const service = read('src/services/prd01.ts')

  assert.match(types, /export interface OpenTextAuditResult\s*{[\s\S]*?auditStatus:\s*string/)
  assert.match(types, /OpenTextAuditResult[\s\S]*?rejectReason\?:\s*string/)
  assert.match(service, /OpenTextAuditResult,/)
  assert.match(service, /submitIntroduction:[\s\S]*?post<OpenTextAuditResult>/)
})

test('自我介绍被驳回时显示中文原因并停留当前页', () => {
  const page = read('src/pages/verification/intro.tsx')
  const submitIndex = page.indexOf('const auditResult = await prd01Api.submitIntroduction(content)')
  const redirectIndex = page.indexOf("Taro.redirectTo({ url: '/pages/verification/triple' })", submitIndex)

  assert.ok(submitIndex >= 0, '提交后必须读取审核结果')
  assert.ok(redirectIndex > submitIndex, '非驳回结果应继续进入三重认证')

  const feedbackBranch = page.slice(submitIndex, redirectIndex)
  assert.match(feedbackBranch, /auditResult\.auditStatus\s*===\s*'REJECTED'/)
  assert.match(feedbackBranch, /auditResult\.rejectReason/)
  assert.match(feedbackBranch, /Taro\.showToast/)
  assert.match(feedbackBranch, /return/)
})
