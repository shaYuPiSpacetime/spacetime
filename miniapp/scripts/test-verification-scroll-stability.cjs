const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { JSDOM } = require('jsdom')
const { createRoot } = require('react-dom/client')
const { act } = React

// 运行真实页面与弹层，只替代小程序原生节点和数据接口。
const dom = new JSDOM('<!doctype html><html><body></body></html>')
global.window = dom.window
global.document = dom.window.document
global.IS_REACT_ACT_ENVIRONMENT = true
const sourceRoot = path.resolve(__dirname, '../src')

function host(tag, scroll = false) {
  return props => {
    const style = Object.fromEntries(Object.entries(props.style || {}).map(([key, value]) => [
      key, typeof value === 'string' ? value.replace(/(-?[\d.]+)rpx/g, (_, n) => `${Number(n) / 2}px`) : value,
    ]))
    return React.createElement(tag, {
      style, onClick: props.onClick, 'data-role': props['data-role'],
      'data-scroll': scroll ? 'true' : undefined,
    }, props.children)
  }
}

async function mount(t, filename, props = {}) {
  const fieldSettings = [{ fieldId: 'maritalStatus', label: '婚姻状况', visible: true, editable: true, fieldType: 'dict' }]
  const copies = { avatar_choose_action: '选择头像', common_cancel_action: '取消', common_confirm_action: '确定', common_save_action: '保存' }
  const state = {
    copy: key => copies[key] || key, bootstrap: async () => {}, provinceCities: async () => [],
    locations: async () => [], userId: 1, config: { fieldSettings },
    profileOptions: { avatarSource: [{ code: 'album', label: '从相册选择' }], maritalStatus: [{ code: 'SINGLE', label: '未婚' }] },
  }
  const store = Object.assign(selector => selector(state), { getState: () => state })
  const taro = { showToast: async () => {}, getCurrentPages: () => [{}], navigateBack: async () => {}, redirectTo: async () => {} }
  const stubs = {
    '@tarojs/components': { View: host('div'), Text: host('span'), Image: host('div'), ScrollView: host('div', true), Input: host('div'), PickerView: host('div'), PickerViewColumn: host('div') },
    '@tarojs/taro': { __esModule: true, default: taro, useRouter: () => ({ params: { from: 'profile' } }) },
    '@/stores/prd01Store': { usePrd01Store: store },
    '@/stores/authStore': { useAuthStore: store },
    '@/services/prd01': { prd01Api: { getBasicProfile: async () => ({ identity: 'WORKER', maritalStatus: 'SINGLE', fieldSettings }) } },
    '@/utils/navigation': { navigateBackOrRedirect: async () => {} },
    '@/utils/profileEditEvents': { emitProfileUpdated: () => {} },
    '@/utils/avatar': { chooseAndCropAvatar: async () => null },
    '@/constants/ossIcons': { miniappOssIcons: {} },
    '@/components/SchoolSearchInput': { __esModule: true, default: () => null },
    '@/components/LanhuSubNav': { __esModule: true, default: () => null },
    '@/components/NativeNavigation': { MiniappBackIcon: () => null, getNativeNavigationMetrics: () => ({ menuTop: 100, menuHeight: 64, titleTop: 110, navigationHeight: 188 }) },
  }
  const cache = new Map()
  function load(relative) {
    if (cache.has(relative)) return cache.get(relative).exports
    const source = path.join(sourceRoot, relative)
    const loaded = { exports: {} }
    cache.set(relative, loaded)
    const compiled = ts.transpileModule(fs.readFileSync(source, 'utf8'), {
      fileName: source,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText
    const localRequire = name => {
      if (name in stubs) return stubs[name]
      if (name === 'react' || name === 'react/jsx-runtime') return require(name)
      if (name.endsWith('VerificationRuntimeBoundary')) return { __esModule: true, default: ({ children }) => children }
      if (/\.(webp|png)$/.test(name)) return '测试图片'
      const base = name.startsWith('@/') ? name.slice(2) : path.join(path.dirname(relative), name)
      for (const extension of ['.ts', '.tsx']) {
        if (fs.existsSync(path.join(sourceRoot, base + extension))) return load(base + extension)
      }
      throw new Error(`未替代依赖：${name}`)
    }
    Function('module', 'exports', 'require', compiled)(loaded, loaded.exports, localRequire)
    return loaded.exports
  }
  const Component = load(filename).default
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const render = async next => act(async () => { root.render(React.createElement(Component, next)) })
  await render(props)
  t.after(async () => { await act(async () => root.unmount()); container.remove() })
  const click = async text => {
    const element = [...container.querySelectorAll('span')].find(item => item.textContent === text)
    assert.ok(element, `缺少可点击文本：${text}`)
    await act(async () => { element.dispatchEvent(new window.MouseEvent('click', { bubbles: true })) })
  }
  return { container, render, click }
}

test('头像来源弹层开关后保留原滚动节点与位置', async t => {
  const page = await mount(t, 'pages/verification/avatar.tsx')
  const scroll = page.container.querySelector('[data-scroll]')
  scroll.scrollTop = 180
  await page.click('选择头像')
  assert.equal(page.container.querySelector('[data-scroll]'), scroll, '打开弹层不能卸载页面滚动容器')
  await page.click('取消')
  assert.equal(page.container.querySelector('[data-scroll]'), scroll)
  assert.equal(scroll.scrollTop, 180)
})

test('资料字段弹层隐藏保存按钮时保留占位，关闭后恢复同一按钮', async t => {
  const page = await mount(t, 'pages/verification/basic.tsx')
  const scroll = page.container.querySelector('[data-scroll]')
  const save = page.container.querySelector('[data-role="profile-basic-save"]')
  scroll.scrollTop = 320
  await page.click('婚姻状况')
  assert.equal(page.container.querySelector('[data-role="profile-basic-save"]'), save, '隐藏按钮不能收缩滚动内容')
  assert.equal(save.style.visibility, 'hidden')
  await page.click('确定')
  assert.equal(save.style.visibility, 'visible')
  assert.equal(page.container.querySelector('[data-scroll]'), scroll)
  assert.equal(scroll.scrollTop, 320)
})

test('认证字段弹层开关不改变底部留白或滚动节点', async t => {
  const props = { stage: 'basic', scroll: true, children: React.createElement('p', null, '认证资料'), onPrimary: () => {} }
  const page = await mount(t, 'pages/verification/components/VerificationShell.tsx', props)
  const scroll = page.container.querySelector('[data-scroll]')
  const content = scroll.firstElementChild
  const padding = content.style.paddingBottom
  scroll.scrollTop = 280
  await page.render({ ...props, onPrimary: undefined })
  assert.equal(content.style.paddingBottom, padding, '隐藏下一步按钮不能压缩页面高度')
  assert.equal(page.container.querySelector('[data-scroll]'), scroll)
  assert.equal(scroll.scrollTop, 280)
})
