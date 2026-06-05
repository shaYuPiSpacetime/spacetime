## ADDED Requirements

### Requirement: 共用壳组件统一布局
系统 SHALL 提供一个 `LoginProfileShell` 组件，封装四个登录资料页的共用布局。

#### Scenario: 壳组件渲染基础结构
- **WHEN** 任意登录资料页被渲染
- **THEN** 壳组件提供全屏一致背景（`linear-gradient(90deg, #F2FEFD 0%, #F3F5FB 52%, #FBFCF5 100%)`）
- **THEN** 左上角显示返回箭头（`←` 样式，点击返回上一页或登录首页）
- **THEN** 页面顶部居中显示主标题「请选择」（36rpx, #0C285A, fontWeight 500）
- **THEN** 主标题下方显示说明文案（28rpx, #999999, 由 `description` prop 传入）
- **THEN** 底部居中显示圆形下一步按钮（126rpx 直径, 63rpx 圆角）

#### Scenario: 壳组件不显示导航标题
- **WHEN** 任意登录资料页被渲染
- **THEN** 页面顶部不出现「选择性别」「选择年龄」「选择学历」「选择地区」等导航栏标题

#### Scenario: 下一步按钮状态切换
- **WHEN** `nextActive` prop 为 `true`
- **THEN** 按钮背景色为 `#2876FF`（蓝色高亮），用户可点击
- **WHEN** `nextActive` prop 为 `false`
- **THEN** 按钮背景色为 `#E3F1FE`（浅蓝禁用态），点击无响应

#### Scenario: 点击下一步触发回调
- **WHEN** 用户点击下一步按钮且 `nextActive` 为 `true`
- **THEN** 调用 `onNext` prop 传入的回调函数
- **THEN** 执行页面跳转逻辑（如 `navigateTo` 到下一资料页）

#### Scenario: 点击返回箭头返回
- **WHEN** 用户点击左上角返回箭头
- **THEN** 如导航栈长度 > 1，调用 `navigateBack` 返回上一页
- **THEN** 如为栈底，跳转到登录首页 `/pages/login/index`
