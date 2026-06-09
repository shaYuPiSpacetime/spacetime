日常开发流程：
 cd miniapp
 npm run dev:weapp    # 编译 + watch，改代码自动重新编译
 # 然后在微信开发者工具中查看效果

## Mock 模式

项目内置全局 Mock 开关，在未接后端时可独立运行小程序完成所有页面流程。

**开关位置：** `src/constants/config.ts`

```typescript
/** 全局 Mock 开关：true=使用 Mock 数据不请求后端，false=正常请求后端 */
export const MOCK_ENABLED = true
```

**Mock 覆盖范围：**

| 模块 | Mock 行为 |
|------|----------|
| 登录 | 自动生成 mock token，跳过微信授权 |
| 实名认证 | 提交即通过（APPROVED） |
| 学历认证 | 提交即审核中（PENDING） |
| 头像认证 | 提交即通过 |
| 会员/成家币 | 使用 `services/mock.ts` 中的 mock 数据 |

**对接后端时：** 将 `MOCK_ENABLED` 改为 `false` 即可恢复真实请求。

ui https://lanhuapp.com/web/#/item/project/stage?pid=00cf551c-26f6-49e5-82db-1dc6fda9ca3a&image_id=0af138d0-cb20-4dd9-8eee-c82e951af16f&tid=428e8368-c279-4369-947b-a5828487924d

figma链接：https://www.figma.com/design/BqQhSLVSvuLYrZsgVlKmkU/%E6%88%90%E5%AE%B6%E7%AB%8B%E4%B8%9A?t=NH6dggfURmTA3PuA-1

## 2026-06-09 推荐朋友蓝湖还原记录

- 推荐首页覆盖 `觅知音 / 悦目 / 诚意贴` 三个二级 Tab，入口仍为 `/pages/recommend/index`。
- 推荐发布页按蓝湖 `推荐-朋友-诚意贴-发布动态` 还原，入口为 `/pages/recommend/post`。
- 推荐参考图归档在 `miniapp/.lanhu-ref/推荐/`。
- 推荐运行切图放在 `miniapp/src/assets/lanhu/recommend/slices/`，当前包括动态头像、城市图和未认证弹窗插画。
- 页面运行代码不得引用远程蓝湖 CDN；背景图继续使用本地 `miniapp/src/assets/lanhu/recommend/recommend-bg.png`。

## 2026-06-09 我的页底部栏修正记录

- 小程序启动页调整为 `/pages/profile/index`，用于默认进入蓝湖 `我的` 页面。
- `AppTabBar` 运行时固定同一套 DOM 结构，只切换 icon、文字颜色和字重，避免 `消息` 切到 `我的` 时整张底栏背景替换造成抖动或图标短暂丢失。
- `tabbar-bg.png` 仅保留为蓝湖视觉参考，不再作为运行时底栏背景。
- `编辑资料` 右箭头改为 CSS 斜角箭头，跟随 34rpx 高度 flex 居中，避免文本箭头在小程序中基线偏移。
- `我的` 页 VIP 横幅和“提升人气”按钮改用本地局部切图 `miniapp/src/assets/profile/vip-banner.png`、`miniapp/src/assets/profile/boost-button.png`，不再手绘渐变和闪电字符。
- 菜单列表图标与文字间距收敛到蓝湖标注值，当前图标右侧间距约 `20rpx`，避免 47rpx 的空隙过大。
