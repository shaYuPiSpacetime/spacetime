const { sources } = require('webpack')

// 原生切页先于 Taro 的首次 setData。把静态轮廓写进页面模板，微信可在 JS 启动前绘制。
module.exports = function tabFirstPaint(ctx) {
  ctx.modifyBuildAssets(({ assets }) => {
    const app = JSON.parse(assets['app.json'].source().toString())
    for (const { pagePath } of app.tabBar.list) {
      const filename = `${pagePath}.wxml`
      const template = assets[filename]
      if (template.source().toString().includes('id="tab-first-paint"')) continue
      const page = JSON.parse(assets[`${pagePath}.json`].source().toString())
      const layout = `
<view wx:if="{{!root.cn.length}}" id="tab-first-paint" class="tab-first-paint" style="background-color:${page.backgroundColor}" aria-hidden="true">
  <view class="tab-first-paint__heading"></view>
  <view class="tab-first-paint__card">
    <view class="tab-first-paint__avatar"></view>
    <view class="tab-first-paint__lines">
      <view class="tab-first-paint__line"></view>
      <view class="tab-first-paint__line tab-first-paint__line--short"></view>
    </view>
  </view>
</view>`
      assets[filename] = new sources.ConcatSource(template, layout)
    }
  })
}
