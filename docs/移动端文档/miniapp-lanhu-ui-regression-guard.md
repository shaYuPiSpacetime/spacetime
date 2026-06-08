# 小程序蓝湖 UI 还原防回归规范

## 背景

蓝湖稿里右上角常会显示微信小程序原生胶囊，但真实小程序运行时该胶囊由客户端自动渲染。代码如果再次自绘 `...`、圆点或相似符号，会出现右上角双胶囊、顶部文案错位的问题。

本项目的成家/觅缘/精选/会员/成家币/推荐朋友/认证相关页面统一按以下规范还原。

## 顶部区域

1. 不自绘微信原生胶囊。
2. 顶部业务 Tab 只渲染业务文字、角标、下划线。
3. 750rpx 设计稿中，顶部业务 Tab 默认使用：

```tsx
{
  height: '176rpx',
  padding: '86rpx 160rpx 0 25rpx',
}
```

其中 `160rpx` 是给右上原生胶囊预留的安全宽度。

## 交互规则

1. 业务 Tab 不允许只画不可点击文字。
2. 已有页面必须绑定真实跳转，例如：

```tsx
Taro.navigateTo({ url: '/pages/featured/index' })
```

3. 暂未实现的 Tab 必须给 `Taro.showToast({ title: '功能建设中', icon: 'none' })`。
4. 伪 Tab 子页面返回主 Tab 时，优先回退页面栈，失败再 `switchTab`：

```tsx
Taro.navigateBack({
  delta: 1,
  fail: () => {
    Taro.switchTab({ url: '/pages/index/index' })
  },
})
```

## 底部 TabBar

1. Tab 页面和伪 Tab 页面统一使用 `AppTabBar`。
2. 页面内不得再自绘一套局部 TabBar。
3. `LanhuTabBar` 只能委托 `AppTabBar`，不得复制底部图标布局。
4. “精选”属于成家主链路，底部高亮使用 `active="index"`。
5. “推荐”底部 Tab 入口固定为 `/pages/recommend/index`，不再使用旧 `/pages/assessment/index` 作为 Tab 入口。

## 推荐朋友与认证模块

### 蓝湖目标稿清单

蓝湖 MCP 已确认以下稿件存在于项目「时空邂逅」：

- 推荐朋友 6 张：`推荐-朋友-悦目` x2、`推荐-朋友-觅知音`、`推荐-朋友-诚意贴` x2、`推荐-朋友-诚意贴-发布动态`
- 认证 11 张：`认证-基本资料`、`认证-基本资料-身高/体重`、`认证-基本资料-家乡`、`认证-基本资料-职业`、`认证-基本资料-年收入`、`认证-添加头像`、`认证-添加头像-选择相册`、`认证-添加头像-裁剪照片`、`认证-添加头像-头像审核`、`认证-自我介绍`、`认证-自我介绍-填写内容`

### 路由映射

- 推荐首页：`/pages/recommend/index`
- 推荐发布：`/pages/recommend/post`
- 认证基本资料：`/pages/verification/basic`
- 基本资料弹层状态：`/pages/verification/height-weight`、`/pages/verification/hometown`、`/pages/verification/career`、`/pages/verification/income`
- 头像链路：`/pages/verification/avatar`、`/pages/verification/avatar-album`、`/pages/verification/avatar-crop`、`/pages/verification/avatar-review`
- 自我介绍链路：`/pages/verification/intro`、`/pages/verification/intro-edit`

### 模块边界

1. 推荐朋友页面只放在 `miniapp/src/pages/recommend/`。
2. 认证页面只放在 `miniapp/src/pages/verification/`。
3. 推荐资源只放 `miniapp/src/assets/lanhu/recommend/`。
4. 认证资源只放 `miniapp/src/assets/lanhu/verification/`。
5. 两个模块不得复用整屏截图当页面，背景图只提供底色/纹理，文字、卡片、按钮、弹窗必须代码绘制。
6. 认证流程固定接在地址页之后：`登录 → 性别 → 年龄 → 学历 → 地址 → 认证 → 首页`。

## 提交前排查

每次蓝湖 UI 还原后执行静态扫描，不做编译时也必须跑：

```bash
rg -n "•••|⊙|↺|☷|ProfileTabBar|SELF_DRAWN_TABBAR_ROUTES" miniapp/src
rg -n "LanhuTopTabs active|onTabClick|LanhuTabBar active" miniapp/src/pages
rg -n "pages/recommend|pages/verification|recommend|LoginStep|LoginUserInfo" miniapp/src
git diff --check -- miniapp/src TEAM_STANDARDS.md docs/移动端文档/miniapp-lanhu-ui-regression-guard.md
```

检查口径：

- 第一条不应命中顶部自绘胶囊、右侧自绘操作图标或页面局部 TabBar。
- 第二条逐个确认顶部 Tab 有点击回调，底部 active 与业务归属一致。
- 第三条确认推荐 Tab 迁移、认证路由、登录流程类型和认证草稿字段仍在。
- `git diff --check` 必须无输出。
