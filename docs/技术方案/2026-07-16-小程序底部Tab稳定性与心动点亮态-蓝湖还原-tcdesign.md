# 小程序底部 Tab 稳定性与蓝湖切图还原技术方案

## 范围与设计基线

- 页面范围：小程序全局自定义底部 TabBar，覆盖千寻、心动、推荐、消息、我的五个入口。
- 蓝湖父页面：“我的”，设计 ID `a2fd5bfd-5e7b-47e6-85d9-6e3641c021cc`。
- 蓝湖切图子画板：“切图”，设计 ID `35cbbbef-696f-4d80-bf36-2a6db73ebade`，版本 3。
- 子画板尺寸：193.5×329.25，蓝湖 MCP 共返回 13 张切图；本次使用 4 组普通/点亮态图标和 1 张推荐圆钮，共 9 张。
- 素材规则：底部 Tab 图标继续使用包内无损 PNG，不走 OSS，不混用旧 SVG，也不通过 CSS 补画蓝点。

## 根因证据

1. 运行代码混用了旧 PNG、手绘 SVG 和通用 CSS 蓝点；蓝湖 active 切图本身已包含蓝色高光，叠加绘制会造成形态和位置错误。
2. `app.config.ts` 的千寻、消息、我的原生兜底图标映射错误，导致自定义 TabBar 切换期间短暂显示错误状态。
3. Taro 会为各 Tab 页面缓存各自的自定义 TabBar 实例。原实现的乐观点亮只调用当前实例的 `setState`，目标页缓存实例仍保留上次状态，因此出现“点千寻亮心动、点心动亮千寻”。
4. 微信页面栈会先更新真实路由、稍后送达 `switchTab success`；只依赖回调释放导航锁会吞掉新页面上的下一次合法点击。
5. `project.config.json` 仍设置 `lazyCodeLoading: requiredComponents`，会覆盖应用侧设置，造成 Taro 动态模板中的自定义 TabBar 偶发不挂载。

## 素材与组件映射

| 设计元素 | 项目落点 | 原图尺寸 |
|---|---|---:|
| 千寻普通/点亮 | `tab-home.png` / `tab-home-active.png` | 80×80 |
| 心动普通/点亮 | `tab-work.png` / `tab-work-active.png` | 80×80 |
| 推荐圆钮 | `tab-recommend.png` | 268×268 |
| 消息普通/点亮 | `tab-message.png` / `tab-message-active.png` | 80×80 |
| 我的普通/点亮 | `tab-profile.png` / `tab-profile-active.png` | 80×80 |
| 普通 Tab 运行尺寸 | `AppTabBar` | 40×40rpx |
| 推荐圆钮运行尺寸 | `AppTabBar` | 134×134rpx |
| 点亮文字 | `AppTabBar` | `#333333`、20rpx、500 |
| 未点亮文字 | `AppTabBar` | `#999999`、20rpx |

## 状态闭环

1. `tabState.ts` 保存唯一 `activeTabKey`，所有缓存 TabBar 实例订阅同一状态。
2. 点击目标 Tab 时先广播唯一 key，再执行 `Taro.switchTab`；目标缓存实例在页面出现前已经拿到正确点亮态。
3. `useDidShow` 再以 `getCurrentPages()` 的真实路由校正状态并释放导航事务锁。
4. 跳转失败时按发起路由回滚；原路由内的并发点击只受理首个事务，路由已变化时允许下一次切换。
5. 普通态和点亮态图片同时常驻，仅切换 `opacity`，避免变更 `src` 造成闪烁。
6. `app.config.ts` 和 `project.config.json` 都禁止 `requiredComponents` 懒加载，避免工具配置重新引入偶发缺栏。

## 回归门禁

- `test-tabbar-lanhu-closure.mjs` 固定校验 9 张蓝湖原图 SHA-256、PNG 引用、原生兜底映射、共享状态广播和懒加载配置。
- `verify-tabbar-runtime.cjs` 依次验证千寻、心动、推荐、消息、我的；普通 Tab 每一步只允许一张 active PNG 为 `opacity: 1`。
- 快速连点验证首个导航事务落地后 500ms 内不会再跳到第二目标。
- 运行态生成 5 张截图并人工核对蓝湖 active/inactive 图标状态。
