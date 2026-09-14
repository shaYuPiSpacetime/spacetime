const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')

test('non-mock message home never falls back to fake certification or match rows', () => {
  const source = read('src/pages/chat/index.tsx')
  assert.doesNotMatch(source, /unverified\s*\?\s*mockHomeRows\.filter/)
})

test('profile preview uses effective audited text and approved photos only', () => {
  const presentation = read('src/domain/profileAboutPresentation.ts')
  const page = read('src/pages/profile/edit.tsx')
  assert.match(presentation, /resolvePreviewVisibleText/)
  assert.match(page, /resolvePreviewVisibleText\(introDetail\)/)
  assert.match(page, /auditStatus\s*===\s*['"]APPROVED['"]/)
  assert.match(page, /effectiveAvatarUrl/)
  assert.match(page, /effectiveMediaUrl/)
})

test('core blocked users are hard-blocked and school label is updated', () => {
  const access = read('src/domain/accessStatus.ts')
  const index = read('src/pages/index/index.tsx')
  const profile = read('src/pages/profile/index.tsx')
  const basicCard = read('src/pages/verification/components/BasicInfoCard.tsx')
  assert.match(access, /isCoreAccessBlocked/)
  assert.match(index, /isCoreAccessBlocked\(cachedAccessStatus\)/)
  assert.match(profile, /isCoreAccessBlocked\(data\.accessStatus\)/)
  assert.match(basicCard, /所属于院校/)
})

test('LiteChat treats not-logged-in logout as idempotent and surfaces SDK errors', () => {
  const source = read('src/im/LiteChatMessageImGateway.ts')
  assert.match(source, /isAlreadyLoggedOutError/)
  assert.match(source, /TencentCloudChat\.EVENT\.ERROR/)
})
