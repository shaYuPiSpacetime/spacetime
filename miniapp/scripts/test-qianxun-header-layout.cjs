const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const filename = path.resolve(__dirname, '../src/features/qianxun/QianxunHeader.tsx')
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  fileName: filename,
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText

function load(width, menu, env = 'WEAPP') {
  const taro = {
    getEnv: () => env,
    ENV_TYPE: { WEAPP: 'WEAPP' },
    getMenuButtonBoundingClientRect: () => {
      if (menu instanceof Error) throw menu
      return menu
    },
  }
  const module = { exports: {} }
  const stubs = {
    '@tarojs/taro': { __esModule: true, default: taro },
    '@tarojs/components': { Image: 'image', Text: 'text', View: 'view' },
    '@/utils/system': { getWindowMetrics: () => ({ windowWidth: width }) },
  }
  Function('module', 'exports', 'require', compiled)(module, module.exports, name => stubs[name] || require(name))
  return module.exports
}

test('UI-01: 正常设备头像点击区避开全部一级菜单和胶囊', () => {
  for (const width of [320, 360, 375, 390, 430, 768]) {
    const menu = { left: width - 97, right: width - 10, width: 87, top: 50, height: 32 }
    const { getQianxunHeaderMetrics, QianxunHeader } = load(width, menu)
    const metrics = getQianxunHeaderMetrics()
    const tree = QianxunHeader({ active: 'KINDRED', avatar: 'avatar.png', metrics })
    const [tabs, profile] = tree.props.children
    const avatarLeft = metrics.avatarLeft
    const avatarRight = avatarLeft + parseFloat(profile.props.style.width)
    for (const tab of tabs) {
      assert.ok(avatarLeft >= parseFloat(tab.props.style.left) + parseFloat(tab.props.style.width) + 12)
    }
    assert.ok(avatarRight <= menu.left * 750 / width - 12 + 1e-8)
    assert.equal(metrics.primaryTop, menu.top * 750 / width + (menu.height * 750 / width - 45) / 2)
  }
})

test('UI-02: 异常胶囊及窗口坐标不一致使用安全兜底', () => {
  for (const menu of [
    undefined,
    { left: 0, right: 0, top: 0, width: 0, height: 0 },
    { left: 125, right: 212, top: 50, width: 87, height: 32 },
    { left: NaN, right: NaN, top: NaN, width: 87, height: 32 },
    { left: 400, right: 487, top: 50, width: 87, height: 32 },
  ]) {
    const metrics = load(375, menu).getQianxunHeaderMetrics()
    assert.equal(metrics.avatarLeft, 522)
    assert.equal(metrics.primaryTop, 90)
    assert.equal(metrics.contentTop, 242)
  }
})

test('UI-03: 胶囊 API 异常及非微信环境仍可显示安全头像', () => {
  assert.equal(load(375, new Error('API unavailable')).getQianxunHeaderMetrics().avatarLeft, 522)
  assert.equal(load(375, undefined, 'WEB').getQianxunHeaderMetrics().avatarLeft, 522)
})

test('UI-04: 保留本人头像及主页点击回调', () => {
  const { QianxunHeader, getQianxunHeaderMetrics } = load(375)
  let clicks = 0
  const tree = QianxunHeader({ active: 'FAMILY', avatar: 'user-1008.png', metrics: getQianxunHeaderMetrics(), onProfile: () => clicks++ })
  const profile = tree.props.children[1]
  assert.equal(profile.props.id, 'qianxun-profile-entry')
  assert.equal(profile.props.children.props.src, 'user-1008.png')
  profile.props.onClick()
  assert.equal(clicks, 1)
})

test('UI-05: 宽胶囊及窗口宽度兜底仍按原生坐标避让', () => {
  for (const width of [320, 360, 375, 393, 430]) {
    const actualWidth = width === 375 ? 393 : width
    const menu = { left: actualWidth - 122, right: actualWidth - 10, width: 112, top: 48, height: 36 }
    const { getQianxunHeaderMetrics, QianxunHeader } = load(width, menu)
    const metrics = getQianxunHeaderMetrics()
    const tree = QianxunHeader({ active: 'FAMILY', avatar: 'avatar.png', metrics })
    const profile = tree.props.children[1]
    assert.equal(metrics.avatarAnchorLeft, menu.left)
    assert.equal(profile.props.style.left, `calc(${menu.left}px - 76rpx)`)
    assert.equal(profile.props.style.top, `calc(${menu.top + menu.height / 2}px - 32rpx)`)
    const touchRight = menu.left - 12 * actualWidth / 750
    const touchLeft = touchRight - 64 * actualWidth / 750
    assert.ok(touchRight < menu.left)
    assert.ok(touchLeft >= 361 * actualWidth / 750)
    assert.equal(profile.props.children.props.style.width, '48rpx')
  }
})
