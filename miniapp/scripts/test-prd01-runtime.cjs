/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

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

function requireRuntime() {
  const file = path.join(miniappRoot, 'src/domain/prd01Runtime.ts')
  assert.ok(fs.existsSync(file), 'PRD01 运行时领域层尚不存在')
  return require(file)
}

function requirePrd01Service() {
  const file = path.join(miniappRoot, 'src/constants/prd01ApiPaths.ts')
  assert.ok(fs.existsSync(file), 'PRD01 API 路径契约尚不存在')
  return require(file)
}

function requireErrorMessage() {
  const file = path.join(miniappRoot, 'src/utils/errorMessage.ts')
  assert.ok(fs.existsSync(file), '统一错误信息转换尚不存在')
  return require(file)
}

test('禁用、缺失或空白文案不返回前端硬编码兜底', () => {
  const { readCopy } = requireRuntime()
  assert.equal(readCopy({}, 'avatar_notice'), '')
  assert.equal(readCopy({ avatar_notice: { enabled: false, content: '不应展示' } }, 'avatar_notice'), '')
  assert.equal(readCopy({ avatar_notice: { enabled: true, content: '  ' } }, 'avatar_notice'), '')
  assert.equal(
    readCopy({ avatar_notice: { enabled: true, content: '请上传本人清晰头像' } }, 'avatar_notice'),
    '请上传本人清晰头像'
  )
})

test('请求失败对象转换为可读提示，不向页面渲染 [object Object]', () => {
  const { getErrorMessage } = requireErrorMessage()

  assert.equal(getErrorMessage(new Error('认证状态加载失败')), '认证状态加载失败')
  assert.equal(getErrorMessage({ message: '配置加载失败' }), '配置加载失败')
  assert.equal(
    getErrorMessage({ errMsg: 'request:fail connect ECONNREFUSED' }, '网络连接失败，请稍后重试'),
    '网络连接失败，请稍后重试'
  )
  assert.equal(getErrorMessage({}, '加载失败，请稍后重试'), '加载失败，请稍后重试')

  const requestSource = fs.readFileSync(
    path.join(miniappRoot, 'src/services/request.ts'),
    'utf8'
  )
  assert.match(requestSource, /getErrorMessage/)
  assert.match(requestSource, /网络连接失败，请稍后重试/)
})

test('运行时文案快照更新后发布新的读取器并触发页面重绘', () => {
  const { createCopyReader } = requireRuntime()
  const emptyReader = createCopyReader()
  const configuredReader = createCopyReader({
    login_use_action: { enabled: true, content: '立即使用' },
  })

  assert.notEqual(emptyReader, configuredReader)
  assert.equal(emptyReader('login_use_action'), '')
  assert.equal(configuredReader('login_use_action'), '立即使用')

  const storeSource = fs.readFileSync(
    path.join(miniappRoot, 'src/stores/prd01Store.ts'),
    'utf8'
  )
  assert.match(storeSource, /copy:\s*createCopyReader\(snapshot\.config\.copywriting\)/)
})

test('千寻准入页保留蓝湖顶部页签，认证文案由运行时配置提供', () => {
  const source = fs.readFileSync(
    path.join(miniappRoot, 'src/pages/index/index.tsx'),
    'utf8'
  )

  assert.match(source, /<TopTabs\b/)
  assert.match(source, /function TopTabs/)
  assert.match(source, /hoverClass="btn-hover"/)
  assert.match(source, />\s*成家\s*</)
  assert.match(source, />\s*知音\s*</)
  assert.match(source, />\s*立业\s*</)
  assert.match(source, /copy\('verification_onboarding_heading'\)/)
  assert.match(source, /copy\('verification_home_initial_heading_line2'\)/)
})

test('非认证页面按蓝湖固定文案渲染，不消费认证文案配置', () => {
  const files = [
    'src/pages/login/index.tsx',
    'src/pages/login/phone.tsx',
    'src/pages/login/components/LoginProfileShell.tsx',
    'src/pages/login/gender.tsx',
    'src/pages/login/age.tsx',
    'src/pages/login/identity.tsx',
    'src/pages/login/education.tsx',
    'src/pages/login/address.tsx',
    'src/pages/profile/index.tsx',
    'src/pages/profile/edit.tsx',
    'src/pages/profile-edit/about.tsx',
    'src/pages/profile-edit/albums.tsx',
    'src/pages/profile-edit/background.tsx',
    'src/pages/profile-edit/intro.tsx',
    'src/pages/profile-edit/songs.tsx',
    'src/pages/profile-edit/tags.tsx',
    'src/hooks/useAuth.ts',
    'src/hooks/useProfile.ts',
  ]

  files.forEach(file => {
    const source = fs.readFileSync(path.join(miniappRoot, file), 'utf8')
    assert.equal(source.includes("copy('"), false, `${file} 不应消费认证流程 copyKey`)
  })
})

test('推荐消息社区的准入拦截使用固定文案，仅拦截原因来自接口', () => {
  const source = fs.readFileSync(
    path.join(miniappRoot, 'src/components/AccessBlockedPage.tsx'),
    'utf8'
  )

  assert.equal(source.includes('usePrd01Store'), false)
  assert.match(source, /正在校验准入状态/)
  assert.match(source, /当前功能暂不可用/)
  assert.match(source, /去完善资料与认证/)
  assert.match(source, /重新加载/)
  assert.match(source, /blockReasons/)
  assert.match(source, /pages\/verification\/my-certification/)
})

test('登录后按后端首登状态和 nextStep 决定页面', () => {
  const { resolvePostLoginRoute } = requireRuntime()
  assert.equal(resolvePostLoginRoute({ firstLoginCompleted: true }), '/pages/index/index')
  assert.equal(
    resolvePostLoginRoute({ firstLoginCompleted: false, nextStep: 3 }),
    '/pages/login/identity'
  )
  assert.equal(
    resolvePostLoginRoute({ firstLoginCompleted: false, nextStep: 5 }),
    '/pages/login/address'
  )
})

test('首登步骤只提交字典 code 并严格隔离字段', () => {
  const { buildInitStepPayload } = requireRuntime()
  const profileOptions = {
    gender: [{ code: 'FEMALE', label: '女' }],
    identity: [{ code: 'WORKER', label: '职场人' }],
    educationLevel: [{ code: 'BACHELOR', label: '本科' }],
  }

  assert.deepEqual(buildInitStepPayload(1, { gender: 'FEMALE' }, profileOptions), {
    step: 1,
    gender: 'FEMALE',
  })
  assert.deepEqual(buildInitStepPayload(3, { identity: 'WORKER' }, profileOptions), {
    step: 3,
    identity: 'WORKER',
  })
  assert.deepEqual(buildInitStepPayload(4, { educationLevel: 'BACHELOR' }, profileOptions), {
    step: 4,
    educationLevel: 'BACHELOR',
  })
  assert.throws(
    () => buildInitStepPayload(3, { identity: '职场人' }, profileOptions),
    /identity/
  )
})

test('地区步骤只接受行政区 code，不接受当前位置或中文名称', () => {
  const { buildInitStepPayload } = requireRuntime()
  assert.deepEqual(
    buildInitStepPayload(5, {
      locationProvince: '330000',
      locationCity: '330100',
      locationDistrict: '330106',
    }),
    {
      step: 5,
      locationProvince: '330000',
      locationCity: '330100',
      locationDistrict: '330106',
    }
  )
  assert.throws(
    () => buildInitStepPayload(5, { locationCity: '当前位置' }),
    /地区 code/
  )
})

test('短信倒计时优先使用发送接口响应，其次使用运行时配置', () => {
  const { resolveSmsCountdown } = requireRuntime()
  assert.equal(
    resolveSmsCountdown({ countdownSeconds: 45 }, { sendCountdownSeconds: 60 }),
    45
  )
  assert.equal(resolveSmsCountdown(undefined, { sendCountdownSeconds: 60 }), 60)
})

test('学历四种方式生成文档约定字段且使用字典 code', () => {
  const { buildEducationRequest } = requireRuntime()
  assert.deepEqual(
    buildEducationRequest('CHSI', {
      educationUserType: 'MAINLAND_GRADUATE',
      schoolName: '浙江工商大学',
      educationLevel: 'MASTER',
      chsiCode: '123456789012',
      educationAgreementChecked: true,
    }),
    {
      educationUserType: 'MAINLAND_GRADUATE',
      educationMethod: 'CHSI',
      schoolName: '浙江工商大学',
      educationLevel: 'MASTER',
      chsiCode: '123456789012',
      educationAgreementChecked: true,
    }
  )
  assert.equal(
    buildEducationRequest('MATERIAL_UPLOAD', {
      educationUserType: 'MAINLAND_GRADUATE',
      schoolName: '浙江工商大学',
      educationLevel: 'MASTER',
      certificateName: '张三',
      materialUrls: ['https://static.example.com/a.jpg'],
      educationAgreementChecked: true,
    }).educationMethod,
    'MATERIAL_UPLOAD'
  )
})

test('API 服务覆盖交接文档的新接口且不包含旧兼容路径', () => {
  const { PRD01_API_PATHS } = requirePrd01Service()
  const paths = Object.values(PRD01_API_PATHS)
  ;[
    '/miniapp/config/prd01',
    '/miniapp/dict/profile-options',
    '/miniapp/dict/locations',
    '/miniapp/auth/sms-code',
    '/miniapp/auth/phone-login',
    '/miniapp/auth/wechat-login',
    '/miniapp/profile/init-status',
    '/miniapp/profile/init-step',
    '/miniapp/profile/home-detail',
    '/miniapp/profile/basic',
    '/miniapp/verify/status',
    '/miniapp/profile/avatar',
    '/miniapp/verify/real-name',
    '/miniapp/verify/education',
    '/miniapp/profile/albums',
    '/miniapp/profile/background',
    '/miniapp/profile/introduction',
    '/miniapp/profile/about-me',
    '/miniapp/profile/voice-intro',
    '/miniapp/profile/access-status',
  ].forEach(expected => assert.ok(paths.includes(expected), `缺少接口路径：${expected}`))
  ;[
    '/miniapp/profile/detail',
    '/miniapp/profile/media',
    '/miniapp/profile/open-text',
    '/miniapp/profile/init-complete',
  ].forEach(forbidden => assert.equal(paths.includes(forbidden), false, `禁止接入旧接口：${forbidden}`))
})

test('运行时加载器并发复用配置请求并按父 code 缓存地区', async () => {
  const { createPrd01Loader } = requireRuntime()
  let configCalls = 0
  let optionCalls = 0
  let locationCalls = 0
  const api = {
    getConfig: async () => {
      configCalls += 1
      return {
        copywriting: {},
        configUpdatedAt: '2026-07-14 16:00:00',
        initFields: [1, 2, 3, 4, 5].map(step => ({ step })),
        accessPolicy: { minAge: 18, maxAge: 80 },
      }
    },
    getProfileOptions: async () => {
      optionCalls += 1
      return {
        gender: [{ code: 'FEMALE', label: '女' }],
        identity: [{ code: 'WORKER', label: '职场人' }],
        educationLevel: [{ code: 'BACHELOR', label: '本科' }],
      }
    },
    getLocations: async parentCode => {
      locationCalls += 1
      return [{ code: parentCode || '330000', label: '浙江省', leaf: false }]
    },
  }
  const loader = createPrd01Loader(api)

  const [first, second] = await Promise.all([loader.bootstrap(), loader.bootstrap()])
  assert.equal(first.config, second.config)
  assert.equal(configCalls, 1)
  assert.equal(optionCalls, 1)

  await loader.locations('330000')
  await loader.locations('330000')
  assert.equal(locationCalls, 1)
})

test('首登运行时拒绝空字典、无效年龄范围和空地区，不再静默渲染空白页', async () => {
  const { validateInitRuntime, createPrd01Loader } = requireRuntime()
  const validConfig = {
    initFields: [1, 2, 3, 4, 5].map(step => ({ step })),
    accessPolicy: { minAge: 18, maxAge: 80 },
  }
  const validOptions = {
    gender: [{ code: 'FEMALE', label: '女' }, { code: 'MALE', label: '男' }],
    identity: [{ code: 'WORKER', label: '职场人' }],
    educationLevel: [{ code: 'BACHELOR', label: '本科' }],
  }

  assert.doesNotThrow(() => validateInitRuntime(validConfig, validOptions))
  assert.throws(
    () => validateInitRuntime(validConfig, { ...validOptions, gender: [] }),
    /性别字典配置为空/
  )
  assert.throws(
    () => validateInitRuntime({ ...validConfig, accessPolicy: {} }, validOptions),
    /年龄范围配置无效/
  )

  const loader = createPrd01Loader({
    getConfig: async () => validConfig,
    getProfileOptions: async () => validOptions,
    getLocations: async () => [],
  })
  await assert.rejects(loader.locations(), /地区字典配置为空/)
})

test('认证中心拒绝缺失文案和认证字典，不再渲染无文字卡片', () => {
  const { validateVerificationRuntime, VERIFICATION_COPY_KEYS: copyKeys } = requireRuntime()
  const config = {
    copywriting: Object.fromEntries(
      copyKeys.map(key => [key, { enabled: true, content: key }])
    ),
  }
  const options = {
    educationLevel: [{ code: 'BACHELOR', label: '本科' }],
    auditStatus: [{ code: 'NOT_SUBMITTED', label: '未提交' }],
    auditSource: [{ code: 'MACHINE', label: '机审' }],
    coreAccessStatus: [{ code: 'CORE_ALLOWED', label: '核心能力可用' }],
    educationUserType: [{ code: 'STUDENT', label: '在校生' }],
    educationMethod: [{ code: 'STUDENT_CARD', label: '学生证或在读证明' }],
    avatarSource: [{ code: 'CAMERA', label: '拍照' }],
  }

  assert.doesNotThrow(() => validateVerificationRuntime(config, options))
  assert.throws(
    () => validateVerificationRuntime({ copywriting: {} }, options),
    /认证文案配置缺失/
  )
  assert.throws(
    () => validateVerificationRuntime(config, { ...options, auditStatus: [] }),
    /审核状态字典配置为空/
  )
})

test('认证页面入口相互隔离，避免构建产物重复注册 Page', () => {
  const myCertification = fs.readFileSync(
    path.join(miniappRoot, 'src/pages/verification/my-certification.tsx'),
    'utf8'
  )
  const triple = fs.readFileSync(
    path.join(miniappRoot, 'src/pages/verification/triple.tsx'),
    'utf8'
  )
  const centerPath = path.join(
    miniappRoot,
    'src/pages/verification/components/VerificationCenterPage.tsx'
  )

  assert.equal(myCertification.includes("from './triple'"), false)
  assert.equal(triple.includes("from './my-certification'"), false)
  assert.ok(fs.existsSync(centerPath), '认证中心必须抽为非页面组件')
  const center = fs.readFileSync(centerPath, 'utf8')
  const boundary = fs.readFileSync(
    path.join(miniappRoot, 'src/pages/verification/components/VerificationRuntimeBoundary.tsx'),
    'utf8'
  )
  assert.doesNotMatch(myCertification, /VerificationCenterPage/)
  assert.match(myCertification, /CertificationDetailCard/)
  assert.match(myCertification, /VerificationRuntimeBoundary/)
  assert.match(triple, /VerificationCenterPage/)
  assert.match(center, /VerificationRuntimeBoundary/)
  assert.match(boundary, /validateVerificationRuntime/)
  assert.match(boundary, /common_load_failed_title/)
  assert.match(boundary, /common_retry_action/)
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(miniappRoot, 'package.json'), 'utf8')
  )
  assert.match(packageJson.scripts['prebuild:weapp'], /validate-page-entry-isolation\.mjs/)
  assert.match(packageJson.scripts['predev:weapp'], /validate-page-entry-isolation\.mjs/)
})

test('认证运行时迁移只补认证字典和文案，不恢复越界动态文案', () => {
  const migrationPath = path.resolve(
    miniappRoot,
    '../deploy/sql/prod/049_prd01_verification_runtime_seed.sql'
  )
  assert.ok(fs.existsSync(migrationPath), '缺少认证运行时配置迁移')
  const source = fs.readFileSync(migrationPath, 'utf8')
  ;[
    'app_audit_status',
    'app_education_user_type',
    'app_education_method',
    'app_avatar_source',
    'verification_center_title',
    'verification_enter_action',
    'avatar_title',
    'real_name_title',
    'education_notice',
  ].forEach(value => assert.match(source, new RegExp(value)))
  assert.match(source, /WHERE NOT EXISTS/)
  assert.equal(source.includes('login_wechat_action'), false)
  assert.equal(source.includes('profile_default_nickname'), false)
})

test('首登动态数据异常时所有页面展示固定错误态与重试入口', () => {
  const shell = fs.readFileSync(
    path.join(miniappRoot, 'src/pages/login/components/LoginProfileShell.tsx'),
    'utf8'
  )
  const useLogin = fs.readFileSync(path.join(miniappRoot, 'src/hooks/useLogin.ts'), 'utf8')
  const pages = ['gender', 'age', 'identity', 'education', 'address']

  assert.match(shell, /加载失败/)
  assert.match(shell, /重新加载/)
  assert.match(shell, /onRetry/)
  assert.match(useLogin, /runtimeLoading/)
  assert.match(useLogin, /runtimeError/)
  assert.match(useLogin, /retryRuntime/)
  pages.forEach(page => {
    const source = fs.readFileSync(path.join(miniappRoot, `src/pages/login/${page}.tsx`), 'utf8')
    assert.match(source, /runtimeLoading/)
    assert.match(source, /runtimeError/)
    assert.match(source, /retryRuntime/)
  })
})

test('部署迁移补齐 app_gender 大写 code 且可重复执行', () => {
  const migrationPath = path.resolve(miniappRoot, '../deploy/sql/prod/048_prd01_gender_dictionary_seed.sql')
  assert.ok(fs.existsSync(migrationPath), '缺少性别字典修复迁移')
  const source = fs.readFileSync(migrationPath, 'utf8')
  assert.match(source, /'app_gender'/)
  assert.match(source, /'FEMALE'/)
  assert.match(source, /'MALE'/)
  assert.match(source, /WHERE NOT EXISTS/)
})

test('首登五页只使用运行时配置、字典 code 和服务端 nextStep', () => {
  const pageNames = ['gender', 'age', 'identity', 'education', 'address']
  const sources = Object.fromEntries(
    pageNames.map(name => [
      name,
      fs.readFileSync(path.join(miniappRoot, `src/pages/login/${name}.tsx`), 'utf8'),
    ])
  )

  Object.entries(sources).forEach(([name, source]) => {
    assert.equal(source.includes('getDemoPageData'), false, `${name} 禁止读取蓝湖演示数据`)
    assert.equal(source.includes('updateUserInfo'), false, `${name} 禁止只写本地状态`)
    assert.equal(source.includes('Taro.redirectTo'), false, `${name} 必须按接口 nextStep 跳转`)
    assert.match(source, /saveInitStep\(/, `${name} 必须调用首登步骤接口`)
  })

  assert.match(sources.gender, /option\.code/)
  assert.match(sources.identity, /option\.code/)
  assert.match(sources.education, /option\.code/)
  assert.match(sources.address, /loadLocations\(/)
  assert.equal(sources.address.includes("setSelected('当前位置')"), false)
})

test('认证服务不再启用本地 Mock 或旧请求结构', () => {
  const source = fs.readFileSync(path.join(miniappRoot, 'src/services/verification.ts'), 'utf8')
  assert.equal(source.includes('MOCK_ENABLED'), false)
  assert.equal(source.includes('mockStatus'), false)
  assert.match(source, /prd01Api\.getVerificationStatus/)
  assert.match(source, /prd01Api\.submitRealName/)
  assert.match(source, /prd01Api\.submitEducation/)
})

test('学历认证页面从字典取人群、方式和学历 code，并先上传再提交 URL', () => {
  const component = fs.readFileSync(
    path.join(miniappRoot, 'src/pages/verification/components/EducationSubmitPage.tsx'),
    'utf8'
  )
  assert.equal(component.includes('EDUCATION_LEVELS'), false)
  assert.equal(component.includes('DEFAULT_'), false)
  assert.match(component, /profileOptions\?\.educationMethod/)
  assert.match(component, /profileOptions\?\.educationUserType/)
  assert.match(component, /option\.code/)
  assert.match(component, /prd01Api\.uploadEducation/)
  assert.match(component, /buildEducationRequest/)
  assert.match(component, /prd01Api\.submitEducation/)
})

test('头像认证从头像来源字典选择，并按上传 URL 提交审核', () => {
  const sourcePage = fs.readFileSync(path.join(miniappRoot, 'src/pages/verification/avatar.tsx'), 'utf8')
  const cropPage = fs.readFileSync(path.join(miniappRoot, 'src/pages/verification/avatar-crop.tsx'), 'utf8')
  assert.match(sourcePage, /profileOptions\?\.avatarSource/)
  assert.match(sourcePage, /option\.code/)
  assert.match(cropPage, /prd01Api\.uploadAvatar/)
  assert.match(cropPage, /prd01Api\.submitAvatar/)
  assert.equal(cropPage.includes('updateUserInfo'), false)
})

test('资料编辑页按后端字段配置渲染，并使用字典 code 保存', () => {
  const source = fs.readFileSync(path.join(miniappRoot, 'src/pages/profile/edit.tsx'), 'utf8')
  const basicEditor = fs.readFileSync(path.join(miniappRoot, 'src/pages/verification/basic.tsx'), 'utf8')
  assert.equal(source.includes('getDemoPageData'), false)
  assert.match(source, /prd01Api\.getBasicProfile/)
  assert.match(source, /fieldSettings/)
  assert.match(source, /option\.code/)
  assert.match(source, /pages\/verification\/basic\?from=profile/)
  assert.match(basicEditor, /prd01Api\.saveBasicProfile/)
  assert.match(source, /prd01Api\.saveDatingGoal/)
  assert.match(source, /prd01Api\.saveEmotionalStatus/)
})

test('标签、关于我、自我介绍和歌曲页面全部读取业务接口', () => {
  const files = {
    tags: fs.readFileSync(path.join(miniappRoot, 'src/pages/profile-edit/tags.tsx'), 'utf8'),
    about: fs.readFileSync(path.join(miniappRoot, 'src/pages/profile-edit/about.tsx'), 'utf8'),
    intro: fs.readFileSync(path.join(miniappRoot, 'src/pages/profile-edit/intro.tsx'), 'utf8'),
    songs: fs.readFileSync(path.join(miniappRoot, 'src/pages/profile-edit/songs.tsx'), 'utf8'),
  }
  Object.values(files).forEach(source => assert.equal(source.includes('getDemoPageData'), false))
  assert.match(files.tags, /profileTagGroups/)
  assert.match(files.tags, /prd01Api\.getTags/)
  assert.match(files.tags, /prd01Api\.saveTags/)
  assert.match(files.about, /prd01Api\.getAboutMe/)
  assert.match(files.about, /prd01Api\.submitAboutMe/)
  assert.match(files.intro, /prd01Api\.getIntroduction/)
  assert.match(files.intro, /prd01Api\.submitIntroduction/)
  assert.match(files.songs, /prd01Api\.searchSongs/)
  assert.match(files.songs, /prd01Api\.saveFavoriteSong/)
})

test('核心页面准入只消费 access-status，不在前端自行拼认证规则', () => {
  const hook = fs.readFileSync(path.join(miniappRoot, 'src/hooks/useAccessStatus.ts'), 'utf8')
  assert.match(hook, /prd01Api\.getAccessStatus/)
  assert.match(hook, /status\?\.\[capability\]/)
  assert.match(hook, /blockReasons/)
  ;['chat/index.tsx', 'community/index.tsx'].forEach(file => {
    const source = fs.readFileSync(path.join(miniappRoot, 'src/pages', file), 'utf8')
    assert.match(source, /useAccessStatus/)
    assert.match(source, /AccessBlockedPage/)
  })
  const recommend = fs.readFileSync(path.join(miniappRoot, 'src/pages/recommend/index.tsx'), 'utf8')
  assert.match(recommend, /useAccessStatus/)
  assert.match(recommend, /access\.status\?\.coreAccessStatus === 'CORE_ALLOWED'/)
  assert.match(recommend, /UncertifiedSheet/, '千寻按最新蓝湖稿使用页内未认证弹层')
  assert.doesNotMatch(recommend, /realNameStatus|educationStatus/, '千寻不得自行拼三项认证规则')
})

test('文件上传由小程序拿短时凭证后直传 OSS', () => {
  const source = fs.readFileSync(path.join(miniappRoot, 'src/services/ossUpload.ts'), 'utf8')
  assert.match(source, /post<OssUploadTicket>/)
  assert.match(source, /Taro\.uploadFile/)
  assert.match(source, /url: ticket\.uploadUrl/)
  assert.match(source, /formData: ticket\.formData/)
  assert.equal(source.includes('AccessKeySecret'), false)
  const { PRD01_API_PATHS } = requirePrd01Service()
  assert.equal(PRD01_API_PATHS.uploadAvatarTicket, '/miniapp/file/upload-ticket/avatar')
  assert.equal(PRD01_API_PATHS.uploadEducationTicket, '/miniapp/file/upload-ticket/education')
  assert.equal(PRD01_API_PATHS.uploadAlbumTicket, '/miniapp/file/upload-ticket/album')
  assert.equal(PRD01_API_PATHS.uploadBackgroundTicket, '/miniapp/file/upload-ticket/background')
  assert.equal(PRD01_API_PATHS.uploadVoiceTicket, '/miniapp/file/upload-ticket/voice')
})

test('相册、背景图和语音介绍使用真实查询、直传、保存与删除接口', () => {
  const files = {
    albums: fs.readFileSync(path.join(miniappRoot, 'src/pages/profile-edit/albums.tsx'), 'utf8'),
    background: fs.readFileSync(path.join(miniappRoot, 'src/pages/profile-edit/background.tsx'), 'utf8'),
    voice: fs.readFileSync(path.join(miniappRoot, 'src/pages/profile/edit.tsx'), 'utf8'),
  }
  assert.match(files.albums, /prd01Api\.getAlbums/)
  assert.match(files.albums, /prd01Api\.uploadAlbum/)
  assert.match(files.albums, /prd01Api\.replaceAlbum/)
  assert.match(files.albums, /prd01Api\.deleteAlbum/)
  assert.match(files.background, /prd01Api\.getBackground/)
  assert.match(files.background, /prd01Api\.uploadBackground/)
  assert.match(files.background, /prd01Api\.saveBackground/)
  assert.match(files.background, /prd01Api\.deleteBackground/)
  assert.match(files.voice, /voiceMinDuration/)
  assert.match(files.voice, /voiceMaxDuration/)
  assert.match(files.voice, /prd01Api\.uploadVoice/)
  assert.match(files.voice, /prd01Api\.submitVoiceIntro/)
  assert.match(files.voice, /prd01Api\.deleteVoiceIntro/)
})

test('首登完成页根据资料与认证接口决定下一步，不再进入旧资料页', () => {
  const source = fs.readFileSync(path.join(miniappRoot, 'src/pages/index/index.tsx'), 'utf8')
  assert.match(source, /prd01Api\.getBasicProfile/)
  assert.match(source, /prd01Api\.getVerificationStatus/)
  assert.match(source, /prd01Api\.getIntroduction/)
  assert.match(source, /basicProfileCompleted/)
  assert.equal(source.includes('/pages/verification/basic'), false)
  assert.match(source, /resolveVerificationOnboardingRoute/)
  assert.match(source, /copy\('verification_onboarding_heading'\)/)
  assert.match(source, /copy\('verification_home_primary_action'\)/)
})

test('个人中心使用主页统一详情，不再读取蓝湖演示资料', () => {
  const source = fs.readFileSync(path.join(miniappRoot, 'src/hooks/useProfile.ts'), 'utf8')
  assert.match(source, /prd01Api\.getHomeDetail/)
  assert.equal(source.includes('getDemoPageData'), false)
  assert.equal(source.includes('profileDemo'), false)
})
