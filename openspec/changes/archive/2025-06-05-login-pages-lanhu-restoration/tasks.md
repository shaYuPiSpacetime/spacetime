## 1. 共用壳组件 LoginProfileShell 精细化调整

- [x] 1.1 统一背景渐变：确认 `pageStyle.background` 为 `linear-gradient(90deg, #F2FEFD 0%, #F3F5FB 52%, #FBFCF5 100%)`，与蓝湖一致
- [x] 1.2 无导航标题：确认壳组件不渲染 `CustomNavBar` 或任何顶部标题文字
- [x] 1.3 返回箭头样式精确：左上角返回箭头使用 CSS border 绘制的旋转正方形（`borderLeft + borderBottom + rotate(45deg)`），颜色 #697E9C，位置 left:20rpx, top:92rpx
- [x] 1.4 主标题「请选择」精确：36rpx, #0C285A, fontWeight 500, lineHeight 50rpx, top:247rpx, 居中
- [x] 1.5 说明文案精确：28rpx, #999999, fontWeight 400, lineHeight 40rpx, marginTop 28rpx（相对标题）
- [x] 1.6 底部下一步按钮精确：126rpx 直径圆形, left:312rpx, bottom:164rpx, 激活态 #2876FF, 禁用态 #E3F1FE, 箭头 ➜ 白色 56rpx
- [x] 1.7 返回逻辑：`handleBack` 保持栈深度判断（大于1则 back，否则跳登录首页）

## 2. 性别页 (gender.tsx) 样式对齐蓝湖

- [x] 2.1 性别卡片尺寸精确：宽 700rpx × 高 196rpx, 圆角 32rpx, left 25rpx
- [x] 2.2 卡片定位：女生 top 448rpx, 男生 top 693rpx
- [x] 2.3 选中态样式：女生选中 → 粉色渐变背景 + #FF7F8C 描边, 男生选中 → 蓝色渐变背景 + #2876FF 描边
- [x] 2.4 未选中态样式：`rgba(255,255,255,0.76)` 背景 + 透明边框
- [x] 2.5 性别图标精确：118rpx 直径圆形, 渐变背景, 带阴影, ♀/♂ 符号 74rpx 白色
- [x] 2.6 文字精确：左侧文字 40rpx, 选中 #333333 / 未选中 #999999, fontWeight 500
- [x] 2.7 入口默认：`selected` 初始值 'female', 下一步按钮 `nextActive=true`

## 3. 年龄页 (age.tsx) 样式对齐蓝湖

- [x] 3.1 选择器区域定位：left 25rpx, top 493rpx, 宽 700rpx × 高 410rpx
- [x] 3.2 选中行高亮层：半透明背景覆盖在第 3 行（top:124rpx），宽 700rpx × 高 128rpx, 圆角 24rpx, 背景 #E3F1FE, 描边 2rpx solid #2876FF
- [x] 3.3 五行可见文字层：偏移 -2 到 +2，颜色/字号按蓝湖（#D7D7D7 32rpx → #999999 32rpx → #333333 38rpx → #999999 32rpx → #D7D7D7 32rpx）
- [x] 3.4 三列等宽：每列 233rpx，居中对齐
- [x] 3.5 透明 PickerView 覆盖：opacity 0 但可交互, indicatorStyle 高度 128rpx
- [x] 3.6 默认值：`value=[12, 9, 0]`（即 1997年/10月/1日）
- [x] 3.7 按钮交互：滚动后 `touched=true` → `nextActive=true`（蓝色高亮）

## 4. 学历页 (education.tsx) 样式对齐蓝湖

- [x] 4.1 选项列表定位：left 25rpx, top 442rpx
- [x] 4.2 卡片尺寸精确：宽 700rpx × 高 128rpx, 圆角 24rpx, 间距 29rpx
- [x] 4.3 选中态：背景 #E3F1FE, 描边 2rpx solid #2876FF, 文字 #2876FF
- [x] 4.4 未选中态：背景 #FFFFFF, 描边 2rpx solid #FFFFFF（白色，与选中态同尺寸避免抖动）, 文字 #333333
- [x] 4.5 文字精确：38rpx, fontWeight 500, lineHeight 53rpx, 居中
- [x] 4.6 默认值：`selected='硕士'`, 按钮初始禁用态（`touched=false` → `nextActive=false`）
- [x] 4.7 交互：点击选项 → `setSelected` + `setTouched(true)` → 按钮高亮

## 5. 地址页 (address.tsx) 样式对齐蓝湖

- [x] 5.1 删除城市快捷标签区域（如有）
- [x] 5.2 选择区域定位：left 25rpx, top 518rpx, 宽 700rpx × 高 98rpx, 白色背景, 圆角 8rpx
- [x] 5.3 「选择城市」行精确：◎ 图标 #A6A6A6 52rpx, 文字 28rpx 未选 #999999 / 已选 #333333
- [x] 5.4 「获取定位」按钮精确：宽 170rpx, 文字 28rpx #4E8FFE, 右对齐
- [x] 5.5 交互保留：选择城市 → ActionSheet 两级联动; 获取定位 → chooseLocation → getLocation 降级
- [x] 5.6 按钮：`selected` 非空 → `nextActive=true`
- [x] 5.7 下一步逻辑：toast「注册完成」→ 1s 后 switchTab 到首页

## 6. 自检验收（静态验证，不执行编译）

- [x] 6.1 四页顶部均无「选择性别/选择年龄/选择学历/选择地区」导航标题
- [x] 6.2 四页背景一致（渐变，非蓝色纯色）
- [x] 6.3 默认态：女生选中、年龄 1997/10/1、硕士选中、地址未选
- [x] 6.4 地址页无额外城市标签
- [x] 6.5 年龄页无白色 Picker 卡片外观
- [x] 6.6 跳转流：性别 → 年龄 → 学历 → 地址 → 首页
