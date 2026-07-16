/* eslint-env node */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const miniappRoot = path.resolve(__dirname, '..')

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  })
  module._compile(output.outputText, filename)
}

const originalResolveFilename = Module._resolveFilename
Module._resolveFilename = function resolveMiniappAlias(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    return originalResolveFilename.call(
      this,
      path.join(miniappRoot, 'src', request.slice(2)),
      parent,
      isMain,
      options
    )
  }
  return originalResolveFilename.call(this, request, parent, isMain, options)
}

function source(file) {
  return fs.readFileSync(path.join(miniappRoot, file), 'utf8')
}

test('认证运行态完整校验 138 个文案 key 与全部认证字典', () => {
  const runtime = require(path.join(miniappRoot, 'src/domain/prd01Runtime.ts'))
  assert.equal(runtime.VERIFICATION_COPY_KEYS.length, 138)
  assert.equal(new Set(runtime.VERIFICATION_COPY_KEYS).size, 138)

  const config = {
    copywriting: Object.fromEntries(
      runtime.VERIFICATION_COPY_KEYS.map(key => [key, { enabled: true, content: key }])
    ),
  }
  const option = [{ code: 'READY', label: '已配置' }]
  const profileOptions = {
    educationLevel: option,
    educationUserType: option,
    educationMethod: option,
    auditStatus: option,
    auditSource: option,
    coreAccessStatus: option,
    avatarSource: option,
  }

  assert.doesNotThrow(() => runtime.validateVerificationRuntime(config, profileOptions))
  const missingCopy = {
    copywriting: { ...config.copywriting, avatar_title: undefined },
  }
  assert.throws(
    () => runtime.validateVerificationRuntime(missingCopy, profileOptions),
    /avatar_title/
  )
  assert.throws(
    () => runtime.validateVerificationRuntime(config, { ...profileOptions, auditSource: [] }),
    /审核来源/
  )
})

test('认证页面文案与枚举全部由运行态配置驱动，底部操作适配安全区', () => {
  const basic = source('src/pages/verification/basic.tsx')
  ;[
    'profile_basic_nav_title',
    'profile_basic_heading',
    'profile_basic_notice',
    'common_save_action',
    'common_saving_action',
    'common_save_success',
  ].forEach(copyKey => assert.match(basic, new RegExp(`copy\\('${copyKey}'\\)`)))
  assert.match(basic, /VerificationBottomAction/)

  const shell = source('src/pages/verification/components/VerificationShell.tsx')
  assert.match(shell, /env\(safe-area-inset-bottom\)/)

  assert.equal(fs.existsSync(path.join(miniappRoot, 'src/pages/verification/flow.ts')), false,
    '认证目录禁止保留本地枚举文件')

  const checkedFiles = [
    'src/pages/verification/basic.tsx',
    'src/pages/verification/avatar-album.tsx',
    'src/pages/verification/intro-edit.tsx',
    'src/pages/verification/components/BasicPickerPage.tsx',
  ]
  const hardcodedCopy = /(['"`])[^'"`\n]*[\u4e00-\u9fff][^'"`\n]*\1/g
  checkedFiles.forEach(file => {
    assert.deepEqual(source(file).match(hardcodedCopy) || [], [], `${file} 禁止硬编码中文文案`)
  })
})

test('所有消费认证文案的页面都由统一运行态边界托管', () => {
  const files = [
    'src/pages/verification/components/VerificationCenterPage.tsx',
    'src/pages/verification/my-certification.tsx',
    'src/pages/verification/avatar.tsx',
    'src/pages/verification/avatar-review.tsx',
    'src/pages/verification/avatar-crop.tsx',
    'src/pages/verification/real-name.tsx',
    'src/pages/verification/education-mainland.tsx',
    'src/pages/verification/components/EducationSubmitPage.tsx',
  ]
  files.forEach(file => {
    assert.match(source(file), /VerificationRuntimeBoundary/, `${file} 缺少统一认证运行态边界`)
  })
  const boundary = source('src/pages/verification/components/VerificationRuntimeBoundary.tsx')
  assert.match(boundary, /validateVerificationRuntime/)
  ;['认证', '正在加载', '加载失败', '重新加载'].forEach(copyText => {
    assert.equal(boundary.includes(`>${copyText}<`), false, `运行态边界禁止硬编码：${copyText}`)
  })
  ;[
    'verification_nav_title',
    'common_loading_action',
    'common_load_failed_title',
    'common_load_failed_message',
    'common_retry_action',
  ].forEach(copyKey => assert.match(boundary, new RegExp(`copy\\('${copyKey}'\\)`)))

  const index = source('src/pages/index/index.tsx')
  assert.match(index, /validateVerificationRuntime/, '千寻准入页必须先校验认证运行态')
  assert.match(index, /if \(!ready\) return <IndexLoadingSkeleton/, '千寻准入页运行态未就绪时禁止渲染空文案控件')
})

test('学历受保护材料通过带 token 的 downloadFile 生成临时预览地址', () => {
  const protectedFile = source('src/services/protectedFile.ts')
  assert.match(protectedFile, /Taro\.downloadFile/)
  assert.match(protectedFile, /TOKEN_HEADER/)
  assert.match(protectedFile, /TOKEN_KEY/)
  assert.match(protectedFile, /\/miniapp\/file\/credential\//)

  const education = source('src/pages/verification/components/EducationSubmitPage.tsx')
  assert.match(education, /resolveProtectedFilePreviews/)
  assert.match(education, /materialPreviewUrls/)
  assert.match(education, /materialUrls/)
  assert.equal(education.includes('API_BASE_URL + url'), false)
})

test('手机号和微信登录后统一重新查询 init-status 再导航', () => {
  const phone = source('src/pages/login/phone.tsx')
  const wechat = source('src/pages/login/index.tsx')
  ;[phone, wechat].forEach(loginSource => {
    assert.equal(loginSource.includes('resolvePostLoginRoute'), false)
    assert.match(loginSource, /await resumeInit\(\)/)
  })
})

test('页面入口门禁精确读取 app.config 的 63 个路由并递归扫描依赖', () => {
  const gate = source('scripts/validate-page-entry-isolation.mjs')
  assert.match(gate, /app\.config\.ts/)
  assert.match(gate, /transpileModule/)
  assert.match(gate, /visit|traverse|walkImports/)
  assert.match(gate, /63/)
})

test('构建注册门禁从 dist app.json 校验 Page、App 唯一注册', () => {
  const gatePath = path.join(miniappRoot, 'scripts/validate-built-page-registrations.mjs')
  assert.ok(fs.existsSync(gatePath), '缺少构建产物 Page/App 注册门禁')
  const gate = fs.readFileSync(gatePath, 'utf8')
  assert.match(gate, /app\.json/)
  assert.match(gate, /Page\\s\*\\\(/)
  assert.match(gate, /App\\s\*\\\(/)
})
