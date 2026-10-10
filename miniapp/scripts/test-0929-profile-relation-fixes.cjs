/* eslint-env node */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

function loadPaymentFeedback() {
  const source = read('src/domain/paymentFailureFeedback.ts')
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const loaded = { exports: {} }
  Function('module', 'exports', output)(loaded, loaded.exports)
  return loaded.exports.resolvePaymentFailureFeedback
}

function loadMyLikesModule() {
  const source = read('src/pages/heart/my-likes.tsx')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText
  const loaded = { exports: {} }
  const fakeRequire = specifier => {
    if (specifier === 'react/jsx-runtime') return { jsx: () => null, jsxs: () => null }
    if (specifier === 'react') {
      return {
        useEffect: () => {},
        useRef: value => ({ current: value }),
        useState: value => [value, () => {}],
      }
    }
    if (specifier === '@tarojs/taro') {
      return { __esModule: true, default: {}, useDidShow: () => {} }
    }
    return {}
  }
  Function('require', 'module', 'exports', output)(fakeRequire, loaded, loaded.exports)
  return loaded.exports
}

test('查看认证信息时不再展示平台不保证真实性的免责声明', () => {
  const source = read('src/pages/recommend/index.tsx')
  assert.doesNotMatch(source, /平台不保证真实性|对认证结果不保证/)
})

test('学校模糊搜索结果只展示学校名称，不展示省市简称副标题', () => {
  const source = read('src/components/SchoolSearchInput.tsx')
  assert.doesNotMatch(source, /option\.province|option\.city|option\.shortName/)
})

test('基础资料保存事件同步刷新编辑页昵称', () => {
  const source = read('src/pages/profile/edit.tsx')
  const handler = source.match(/const applyProfileUpdate = \(update: ProfileEditUpdate\) => \{[\s\S]*?\n  \}/)?.[0]
  assert.ok(handler, '缺少资料局部更新处理器')
  assert.match(handler, /update\.type === 'basic'[\s\S]*?setNickname\(/)
})

test('我喜欢的和喜欢我的使用不同且确定的列表入口', () => {
  const profile = read('src/pages/profile/index.tsx')
  const appConfig = read('src/app.config.ts')
  const service = read('src/services/relation.ts')
  const pagePath = path.join(root, 'src/pages/heart/my-likes.tsx')

  assert.match(profile, /label: '我喜欢的'[\s\S]{0,160}\/pages\/heart\/my-likes/)
  assert.match(profile, /label: '喜欢我的'[\s\S]{0,240}community_requested_tab[\s\S]{0,180}likes/)
  assert.match(appConfig, /pages:\s*\[[^\]]*'my-likes'/)
  assert.match(service, /getGivenLikes/)
  assert.ok(fs.existsSync(pagePath), '缺少“我喜欢的”真实列表页面')
  const page = fs.readFileSync(pagePath, 'utf8')
  assert.match(page, /getGivenLikes/)
  assert.doesNotMatch(page, /fallback|demo|mock/i)
})

test('会员权益页不展示伪造人数和伪造个人资料', () => {
  const source = read('src/pages/heart/membership-unlock.tsx')
  assert.doesNotMatch(source, /123人|340位访客|97年|本科|70人/)
  assert.doesNotMatch(source, /const MEMBER_AVATARS = \[([^\]]*\b\w+\b[^\]]*)\1/m)
  assert.match(source, /会员权益|解锁|查看/)
})

test('匹配成功的公开主页只展示私信入口', () => {
  const source = read('src/pages/heart/user.tsx')
  assert.match(source, /!profile\.matched\s*\?\s*\([\s\S]*?id="public-profile-like-button"/)
  assert.match(source, /id="public-profile-chat-button"/)
})

test('iOS 商户支付资质限制展示明确且不承诺代码绕过', () => {
  const resolve = loadPaymentFeedback()
  const feedback = resolve({ errMsg: 'requestVirtualPayment:fail 当前商户未开启IOS支付' })
  assert.equal(feedback.capabilityRestricted, true)
  assert.match(feedback.message, /商户.*iOS.*未开通|商户.*未开通.*iOS/)
  assert.match(feedback.message, /客服|支持的设备/)
  assert.doesNotMatch(feedback.message, /重试即可|已修复|自动开通/)
})

test('推荐已无候选或达到上限时底部推荐红点归零', async () => {
  const source = read('src/pages/recommend/index.tsx')
  const domain = await import('data:text/javascript;base64,' + Buffer.from(read('src/domain/recommendBadge.js')).toString('base64'))
  assert.match(source, /publishRecommendBadge\(userId,\s*\{\s*\.\.\.page, items: page.items.slice\(candidateIndex\)/)
  assert.equal(domain.resolveRecommendBadgeCount({ items: [], remainingBrowseCount: 20 }), 0)
  assert.equal(domain.resolveRecommendBadgeCount({ items: [{ candidateNo: '1' }], remainingBrowseCount: 0 }), 0)
})

test('心动先确认曝光，成功后离开当前卡片，曝光失败不能绕过额度', () => {
  const source = read('src/pages/recommend/index.tsx')
  const toggleLike = source.slice(source.indexOf('  const toggleLike ='), source.indexOf('  const updateCandidate ='))
  assert.ok(toggleLike.indexOf('await awaitCurrentCandidateView()') < toggleLike.indexOf('await sendRelationLike('))
  assert.match(source, /!await awaitCurrentCandidateView\(\)\) \{\s*await loadCandidates\(\)\s*return/)
  assert.match(toggleLike, /await showNextCandidate\(candidateGeneration\)/)
  assert.doesNotMatch(source, /currentCandidateHandled/)
})

test('我喜欢的后端接口经过 Controller、Service、DAO、DAOImpl 和 Mapper', () => {
  const repositoryRoot = path.resolve(root, '..')
  const backend = relativePath => fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8')
  assert.match(backend('backend/src/main/java/com/spacetime/miniapp/controller/MiniappRelationController.java'), /@GetMapping\("\/likes-given"\)/)
  assert.match(backend('backend/src/main/java/com/spacetime/miniapp/service/MiniappRelationService.java'), /givenLikes\(/)
  assert.match(backend('backend/src/main/java/com/spacetime/miniapp/service/impl/MiniappRelationServiceImpl.java'), /givenLikes\(/)
  assert.match(backend('backend/src/main/java/com/spacetime/common/dao/AppRelationLikeDao.java'), /selectOutgoingLikes\(/)
  assert.match(backend('backend/src/main/java/com/spacetime/common/dao/impl/AppRelationLikeDaoImpl.java'), /selectOutgoingLikes\(/)
  assert.match(backend('backend/src/main/java/com/spacetime/common/mapper/AppRelationLikeMapper.java'), /selectOutgoingLikes\(/)
})

test('我喜欢的返回页面后刷新并隔离旧请求，追加分页按 likeNo 去重', () => {
  const page = read('src/pages/heart/my-likes.tsx')
  assert.match(page, /useDidShow\(\(\) => \{[\s\S]{0,300}load\(1\)/)
  assert.match(page, /requestGenerationRef/)
  assert.match(page, /requestGeneration\s*!==\s*requestGenerationRef\.current/)
  assert.match(page, /mergeGivenLikesByLikeNo\(/)
  const { mergeGivenLikesByLikeNo } = loadMyLikesModule()
  assert.deepEqual(
    mergeGivenLikesByLikeNo(
      [{ likeNo: 'LIK-1', nickname: '旧数据' }],
      [{ likeNo: 'LIK-1', nickname: '新数据' }, { likeNo: 'LIK-2', nickname: '第二页' }],
    ),
    [{ likeNo: 'LIK-1', nickname: '新数据' }, { likeNo: 'LIK-2', nickname: '第二页' }],
  )
})
