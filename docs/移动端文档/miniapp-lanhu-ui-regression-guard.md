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
- 认证 22 张：`认证-基本资料`、`认证-基本资料-身高/体重`、`认证-基本资料-家乡`、`认证-基本资料-职业`、`认证-基本资料-年收入`、`认证-添加头像`、`认证-添加头像-选择相册`、`认证-添加头像-裁剪照片`、`认证-添加头像-头像审核`、`认证-自我介绍`、`认证-自我介绍-填写内容`、`认证-三重认证`、`三重认证-顺序提示`、`三重认证-实名认证-身份证`、`三重认证-实名认证-身份证点亮`、`三重认证-学历认证在校学生` x2、`三重认证-学历认证在校学生-信息填写即资料上传`、`三重认证-学历认证中国大陆`、`学信网验证编码`、`毕业证或者学位证书编号`、`上传毕业证或学位证书`

### 路由映射

- 推荐首页：`/pages/recommend/index`
- 推荐发布：`/pages/recommend/post`
- 认证基本资料：`/pages/verification/basic`
- 基本资料弹层状态：`/pages/verification/height-weight`、`/pages/verification/hometown`、`/pages/verification/career`、`/pages/verification/income`
- 头像链路：`/pages/verification/avatar`、`/pages/verification/avatar-crop`、`/pages/verification/avatar-review`
- 头像相册兼容页：`/pages/verification/avatar-album` 仅保留为历史/兼容入口，主链路不得再跳入该页
- 自我介绍链路：`/pages/verification/intro`、`/pages/verification/intro-edit`
- 三重认证链路：`/pages/verification/triple`
- 实名认证链路：`/pages/verification/real-name`
- 学历认证链路：`/pages/verification/education-student`、`/pages/verification/education-mainland`、`/pages/verification/education-chsi-help`、`/pages/verification/education-diploma-no`、`/pages/verification/education-certificate-upload`

### 模块边界

1. 推荐朋友页面只放在 `miniapp/src/pages/recommend/`。
2. 认证页面只放在 `miniapp/src/pages/verification/`。
3. 推荐资源只放 `miniapp/src/assets/lanhu/recommend/`。
4. 认证资源只放 `miniapp/src/assets/lanhu/verification/`。
5. 认证蓝湖参考图统一放 `miniapp/.lanhu-ref/认证/`，运行时局部切图统一放 `miniapp/src/assets/lanhu/verification/slices/` 并通过本地 import 引入。
6. 页面代码不得直接引用 `lanhuapp.com`、`alipic.lanhuapp.com` 等远程蓝湖 CDN。
7. 两个模块不得复用整屏截图当页面，背景图只提供底色/纹理，文字、卡片、按钮、弹窗必须代码绘制。
8. 认证流程固定接在地址页之后：`登录 → 性别 → 年龄 → 学历 → 地址 → 认证 → 首页`。

认证运行切图至少包含：三重认证三项圆形图标、学历上传相机图标、学信网验证编码 4 张步骤示意图。

### 认证链路路由安全

1. 登录资料页与认证页属于连续流程，前进跳转必须使用 `Taro.redirectTo` 替换当前页面，禁止用连续 `Taro.navigateTo` 叠加页面栈。
2. 头像主链路固定为：`avatar` 调用 `Taro.chooseImage` + `Taro.cropImage({ cropScale: '1:1' })` → `redirectTo(avatar-crop)` → `redirectTo(avatar-review)` → `redirectTo(intro)`。
3. 头像选择入口必须加点击锁，防止用户连点重复打开系统相册/裁剪器。
4. `avatar-album` 只作为兼容页保留，不得作为“添加头像”按钮的主跳转目标。
5. 自我介绍填写页提交后必须进入 `/pages/verification/triple`，不得直接调用登录 `submit()` 回首页。
6. 三重认证页的 `实名认证` 和 `学历认证` 必须跳转真实认证页面，不得使用“建设中”占位提示。
7. 当前小程序阶段认证提交流程走本地 Mock：实名认证提交成功后进入 `/pages/verification/education-student`，学历认证提交成功后再进入首页；未接后台前不得强依赖 `/miniapp/verify/*`。
8. 出现 `navigateTo:fail webview count limit exceed` 时，优先检查是否把登录/认证连续步骤误改回了 `navigateTo`。

## 提交前排查

每次蓝湖 UI 还原后执行静态扫描，不做编译时也必须跑：

```bash
rg -n "•••|⊙|↺|☷|ProfileTabBar|SELF_DRAWN_TABBAR_ROUTES" miniapp/src
rg -n "LanhuTopTabs active|onTabClick|LanhuTabBar active" miniapp/src/pages
rg -n "pages/recommend|pages/verification|recommend|LoginStep|LoginUserInfo" miniapp/src
rg -n "Taro\\.navigateTo\\(\\{ url: '/pages/(login|verification)" miniapp/src/pages/login miniapp/src/pages/verification
rg -n "https://alipic\\.lanhuapp|lanhuapp\\.com" miniapp/src/pages/verification miniapp/src/assets/lanhu/verification
git diff --check -- miniapp/src TEAM_STANDARDS.md docs/移动端文档/miniapp-lanhu-ui-regression-guard.md
```

检查口径：

- 第一条不应命中顶部自绘胶囊、右侧自绘操作图标或页面局部 TabBar。
- 第二条逐个确认顶部 Tab 有点击回调，底部 active 与业务归属一致。
- 第三条确认推荐 Tab 迁移、认证路由、登录流程类型和认证草稿字段仍在。
- 第四条在登录/认证连续流程内不应命中；若命中，必须确认它不是连续步骤推进。
- 第五条不应命中认证运行代码和运行资产中的远程蓝湖资源。
- `git diff --check` 必须无输出。
