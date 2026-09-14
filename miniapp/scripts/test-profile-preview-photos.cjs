/* eslint-env node */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

const root = path.resolve(__dirname, '..')
const sourceRoot = path.join(root, 'src')
const photoData = fs.readFileSync(path.join(sourceRoot, 'assets/lanhu/profile/profile-preview-photo.png')).toString('base64')
const photos = Array.from({ length: 6 }, (_, index) => `data:image/png;base64,${photoData}#photo-${index + 1}`)
const iconData = name => `data:image/png;base64,${fs.readFileSync(path.join(sourceRoot, 'assets/lanhu/profile', name)).toString('base64')}`
const fixture = {
  avatarUrl: '', heroImageUrl: '', nickname: '照片回归样例', gender: 'FEMALE',
  genderAgeHeight: '', location: '', tags: [], introduction: '喜欢阅读与旅行，用照片记录生活。', photos,
  certifications: [
    { key: 'avatar', label: '头像', passed: true },
    { key: 'realName', label: '实名', passed: true },
    { key: 'education', label: '学历', passed: true },
  ],
  voice: { url: '' }, datingGoal: '', relationshipStatus: '', favoriteSong: '',
  aboutMe: Array.from({ length: 10 }, (_, index) => ({ title: `关于我 ${index + 1}`, value: '喜欢散步、看展和旅行' })),
}

function host(tag) {
  return ({ children, style, mode, ...props }) => {
    const converted = Object.fromEntries(Object.entries(style || {}).map(([key, value]) => [
      key, typeof value === 'string' ? value.replace(/(-?[\d.]+)rpx/g, (_, amount) => `${Number(amount) / 2}px`) : value,
    ]))
    if (tag === 'img' && mode === 'aspectFill') converted.objectFit = 'cover'
    return React.createElement(tag, { ...props, style: converted }, children)
  }
}

function load(relative, cache = new Map()) {
  if (cache.has(relative)) return cache.get(relative)
  const filename = path.join(sourceRoot, relative)
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  const stubs = {
    '@tarojs/components': { View: host('div'), Text: host('span'), Image: host('img'), ScrollView: host('div') },
    '@tarojs/taro': { __esModule: true, default: {} },
    '@/constants/ossIcons': { miniappOssIcons: {
      profilePreviewCertAvatar: iconData('profile-preview-cert-avatar.png'),
      profilePreviewCertRealname: iconData('profile-preview-cert-realname.png'),
      profilePreviewCertEducation: iconData('profile-preview-cert-education.png'),
    } },
  }
  const localRequire = id => {
    if (id in stubs) return stubs[id]
    if (id === '@/domain/profilePreviewVisibility') return load('domain/profilePreviewVisibility.ts', cache)
    // 导航、头图和动态不在本次截图范围，保留边界供真实页面创建元素。
    if (id.startsWith('@/components/') || id.startsWith('./')) return { __esModule: true, default: () => null }
    return require(id)
  }
  const module = { exports: {} }
  Function('require', 'module', 'exports', output)(localRequire, module, module.exports)
  cache.set(relative, module.exports)
  return module.exports
}

const Preview = load('pages/profile/components/ProfilePreviewPage.tsx').default
const sectionNames = new Set(['ProfilePreviewIntroduction', 'ProfilePreviewPhoto', 'ProfilePreviewCertification', 'ProfilePreviewAboutMe'])
function sections(model, variant = 'owner-preview') {
  const result = []
  const visit = element => {
    if (Array.isArray(element)) return element.forEach(visit)
    if (!element || typeof element !== 'object') return
    if (sectionNames.has(element.type?.name)) result.push(element)
    else visit(element.props?.children)
  }
  visit(Preview({ model, variant, onBack: () => {} }))
  return result
}
const photoSections = items => items.filter(item => item.type.name === 'ProfilePreviewPhoto')

function albumMapper() {
  const text = fs.readFileSync(path.join(sourceRoot, 'pages/profile/edit.tsx'), 'utf8')
  const parsed = ts.createSourceFile('edit.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const declarations = parsed.statements.filter(statement =>
    ['mergeAlbumSlots', 'normalizeAlbumSlot'].includes(statement.name?.text)
    || statement.declarationList?.declarations.some(item => item.name.text === 'defaultPhotoSlots'))
  const output = ts.transpileModule(declarations.map(item => item.getText(parsed)).join('\n'), {}).outputText
  return Function(output + '\nreturn mergeAlbumSlots')()
}

async function screenshots(phase) {
  const { chromium } = require(path.resolve(root, '../frontend/node_modules/playwright'))
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 })
  const folder = path.resolve(root, '../docs/验收报告/截图证据/2026-09-14-主页预览照片')
  fs.mkdirSync(folder, { recursive: true })
  try {
    for (const [name, model] of [['six', fixture], ['empty', { ...fixture, photos: [] }]]) {
      const markup = sections(model).map(element => renderToStaticMarkup(
        React.createElement('section', { 'data-section': element.type.name, style: { display: 'contents' } }, element)
      )).join('')
      await page.setContent(`<html lang="zh"><meta charset="utf-8"><style>body{margin:0;background:#f3f7fb;font-family:'PingFang SC',sans-serif}main{width:350px;margin:0 auto}</style><main>${markup}</main></html>`)
      await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())))
      const urls = await page.locator('[data-section="ProfilePreviewPhoto"] img').evaluateAll(images => images.map(image => image.getAttribute('src')))
      assert.deepEqual(urls, model.photos)
      await page.screenshot({ path: path.join(folder, `${phase}-${name}.png`) })
      console.log(`${phase}-${name}: ${urls.length} 张图片已渲染并解码`)
    }
  } finally { await browser.close() }
}

if (process.argv.includes('--screenshots')) {
  screenshots(process.argv.at(-1)).catch(error => { console.error(error); process.exitCode = 1 })
} else {
  for (const variant of ['owner-preview', 'public-profile']) {
    test(`${variant} 自我介绍后立即展示照片，完整保留6张及关于我`, () => {
      const items = sections(fixture, variant)
      assert.equal(items[1].type.name, 'ProfilePreviewPhoto')
      assert.equal(items[2].type.name, 'ProfilePreviewCertification')
      assert.equal(items[3].type.name, 'ProfilePreviewPhoto')
      assert.equal(items.at(-1).type.name, 'ProfilePreviewAboutMe')
      assert.deepEqual(photoSections(items).map(item => item.props.url), photos)
    })
  }
  test('真实相册槽位映射保留6张乱序接口图片', () => {
    const albums = photos.map((mediaUrl, sortOrder) => ({ mediaId: String(sortOrder + 1), mediaUrl, sortOrder })).reverse()
    assert.deepEqual(albumMapper()(albums).map(item => item.imageUrl), photos)
  })
  for (const count of [0, 1, 2, 6]) {
    test(`${count} 张有效图片与空白 URL 不产生空相册卡`, () => {
      const visiblePhotos = photos.slice(0, count)
      const items = sections({ ...fixture, photos: ['', ...visiblePhotos, '  '] })
      assert.deepEqual(photoSections(items).map(item => item.props.url), visiblePhotos)
    })
  }
  test('没有自我介绍和认证时仍先展示照片', () => {
    const items = sections({ ...fixture, introduction: '', certifications: [] })
    assert.equal(items[0].type.name, 'ProfilePreviewPhoto')
    assert.equal(items.at(-1).type.name, 'ProfilePreviewAboutMe')
    assert.equal(photoSections(items).length, 6)
  })
}
