## Why

当前登录资料四页（性别/年龄/学历/地址）已具备基础交互逻辑，但视觉还原度不足——背景、卡片样式、导航标题、按钮状态等与蓝湖设计稿存在偏差。需要按蓝湖稿做 1:1 像素级还原，确保用户在小程序端看到的界面与设计稿一致。

## What Changes

- **性别页**：调整两张性别卡片的尺寸、位置、圆角、边框和渐变图标，默认选中「我是女生」且下一步按钮高亮
- **年龄页**：去掉现有白色 Picker 卡片外观，改为蓝湖五行三列视觉效果（选中行浅蓝背景 + 蓝色描边），默认值 1997年/10月/1日
- **学历页**：四选项卡片严格按照蓝湖 700rpx 宽、24rpx 圆角、选中态蓝色描边实现，默认高亮「硕士」
- **地址页**：删除城市快捷标签，只保留「选择城市 / 获取定位」两行交互，点击下一步跳转首页
- **共用壳组件**：统一背景层、无导航标题（仅返回箭头）、主标题「请选择」、底部圆形下一步按钮

## Capabilities

### New Capabilities
- `login-profile-shell`: 登录资料页共用壳组件，提供统一背景、返回导航、标题区和下一步按钮
- `login-gender-card`: 性别选择卡片组件，支持选中态视觉切换（蓝/粉渐变图标 + 描边 + 背景）
- `login-age-picker`: 年龄三列滚动选择器，蓝湖五行三列视觉，选中行高亮
- `login-education-card`: 学历选择卡片列表，四选项等宽等高，选中态蓝色描边 + 浅蓝背景
- `login-address-selector`: 地址选择组件，简化为「选择城市」+「获取定位」两行

### Modified Capabilities
<!-- 本次不修改已有 spec，纯 UI 还原，不涉及接口或流程变更 -->

## Impact

- 受影响的代码：`miniapp/src/pages/login/gender.tsx`、`age.tsx`、`education.tsx`、`address.tsx`
- 受影响的组件：`miniapp/src/pages/login/components/LoginProfileShell.tsx`（已有，需调整）
- 可能新增：`miniapp/src/pages/login/components/` 下的子组件文件
- 不修改后端接口、不新增 API URL、不改变登录流程对外路由
- 页面配置保持 `navigationStyle: 'custom'`
