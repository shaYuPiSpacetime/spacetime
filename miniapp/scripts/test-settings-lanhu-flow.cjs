const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const miniappRoot = path.resolve(__dirname, '..')
const flowPath = path.join(miniappRoot, 'src/domain/settingsFlow.ts')

function read(relativePath) {
  return fs.readFileSync(path.join(miniappRoot, relativePath), 'utf8')
}

async function loadFlowModule() {
  assert.ok(fs.existsSync(flowPath), '缺少设置与注销领域状态机')
  const source = fs.readFileSync(flowPath, 'utf8')
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
}

test('注销原因未选择时禁用，选择原因后启用', async () => {
  const { resolveCancelSubmitState } = await loadFlowModule()

  assert.deepEqual(resolveCancelSubmitState({ selected: [], detail: '' }), {
    enabled: false,
    reason: '',
  })
  assert.deepEqual(resolveCancelSubmitState({ selected: ['暂时不想使用'], detail: '' }), {
    enabled: true,
    reason: '暂时不想使用',
  })
})

test('其他原因组合用户输入且去除空白', async () => {
  const { resolveCancelSubmitState } = await loadFlowModule()

  assert.deepEqual(resolveCancelSubmitState({ selected: ['其他'], detail: '  想暂停一段时间  ' }), {
    enabled: true,
    reason: '其他：想暂停一段时间',
  })
  assert.equal(resolveCancelSubmitState({ selected: ['其他'], detail: '   ' }).enabled, false)
})

test('注销冷静期和可撤销状态严格读取接口枚举', async () => {
  const { isCoolingOff, canRevokeCancellation } = await loadFlowModule()

  assert.equal(isCoolingOff({ status: 'COOLING_OFF', coolingDays: 15 }), true)
  assert.equal(canRevokeCancellation({ status: 'COOLING_OFF' }), true)
  assert.equal(canRevokeCancellation({ status: 'REVOKED' }), false)
  assert.equal(isCoolingOff({ status: 'NONE' }), false)
})

test('七张蓝湖稿必须映射为三个页面和四个真实交互状态', () => {
  const appConfig = read('src/app.config.ts')
  const profileHook = read('src/hooks/useProfile.ts')
  const settings = read('src/pages/settings/index.tsx')
  const cancellation = read('src/pages/settings/account-cancel.tsx')
  const about = read('src/pages/settings/about.tsx')

  for (const route of ['index', 'account-cancel', 'about', 'content', 'announcements']) {
    assert.match(appConfig, new RegExp(`['"]${route}['"]`), `设置分包缺少 ${route}`)
  }
  assert.match(profileHook, /pages\/settings\/index/)
  assert.doesNotMatch(profileHook, /设置功能即将开放/)

  assert.match(settings, /getHome|settingsApi\.home/)
  assert.match(settings, /logoutDialogOpen|setLogoutDialogOpen/)
  assert.match(settings, /settingsApi\.logout/)
  assert.match(settings, /useAuthStore\.getState\(\)\.logout\(\)/)

  assert.match(cancellation, /settingsApi\.cancelStatus/)
  assert.match(cancellation, /settingsApi\.applyCancel/)
  assert.match(cancellation, /settingsApi\.revokeCancel/)
  assert.match(cancellation, /Textarea/)
  assert.match(cancellation, /cancelDialogOpen|setCancelDialogOpen/)
  assert.match(cancellation, /submitSuccess|setSubmitSuccess/)

  assert.match(about, /settingsAboutLogo/)
  assert.match(about, /currentVersion/)
})

test('设置模块禁止设计截图冒充交互和透明热区', () => {
  const runtime = [
    'src/pages/settings/index.tsx',
    'src/pages/settings/account-cancel.tsx',
    'src/pages/settings/about.tsx',
    'src/pages/settings/content.tsx',
    'src/pages/settings/announcements.tsx',
    'src/pages/settings/components/SettingsDialog.tsx',
  ].map(read).join('\n')

  assert.match(runtime, /onClick=/)
  assert.doesNotMatch(runtime, /lanhuapp\.com|alipic\.lanhuapp/)
  assert.doesNotMatch(runtime, /opacity\s*:\s*0(?:[;,}]|\b)/)
  assert.doesNotMatch(runtime, /backgroundImage[^\n]*(?:reference|screenshot|design|lanhu)/i)
})
