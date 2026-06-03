# 小程序 UI 还原指南 — 蓝湖 → 代码

## 1. 度量体系对齐

### 当前 Taro 配置

```ts
// config/index.ts
designWidth: 375  // 蓝湖设计稿基准宽度
```

**映射关系**：蓝湖上的 1px = 小程序 2rpx

| 蓝湖标注 | Tailwind 类名 | 实际 rpx | 说明 |
|---------|-------------|---------|------|
| 12px | `text-xs` | 24rpx | 辅助文字 |
| 14px | `text-sm` | 28rpx | 正文 |
| 16px | `text-base` | 32rpx | 标题 |
| 18px | `text-lg` | 36rpx | 大标题 |
| 4px | `gap-1` / `p-1` | 8rpx | 最小间距 |
| 8px | `gap-2` / `p-2` | 16rpx | 小间距 |
| 12px | `gap-3` / `p-3` | 24rpx | 常规间距 |
| 16px | `gap-4` / `p-4` | 32rpx | 卡片内边距 |
| 24px | `gap-6` / `p-6` | 48rpx | 区块间距 |
| 32px | `gap-8` / `p-8` | 64rpx | 页面边距 |

> **关键**：设计稿 375 宽度下，1px 直接对应 Tailwind 的 1 单位，无需翻倍换算。

### 颜色映射

在蓝湖取色后，统一用 `tailwind.config.js` 里定义的设计 Token：

```js
// tailwind.config.js 已配置
colors: {
  primary: '#E54D42',        // 品牌红
  'primary-light': '#FF8A80', // 浅红
}
```

使用时：`text-primary` / `bg-primary` / `border-primary`

---

## 2. 蓝湖到代码的还原流程

### Step 1：看整体 — 确认页面骨架

在蓝湖选中整个页面区域，按 F 或点击"标注"：
- 记下背景色 → `bg-gray-50` / `bg-white`
- 记下页面左右边距 → `px-4`
- 记下各区块间距 → `space-y-3` / `gap-4`

```tsx
// 典型页面骨架
<View className="min-h-screen bg-gray-50 px-4 pt-4 pb-8">
  {/* 区块间用 mt-* / space-y-* 控制 */}
  <View className="bg-white rounded-xl p-4">
    {/* 卡片内容 */}
  </View>
  <View className="mt-3 bg-white rounded-xl p-4">
    {/* 卡片内容 */}
  </View>
</View>
```

### Step 2：看局部 — 逐卡片还原

每个卡片区域独立成一个组件片段：

蓝湖选中卡片 → 看标注面板：
```
宽度：343px（375 - 16*2 边距）
圆角：12px → rounded-xl
内边距：16px → p-4
背景色：#FFFFFF → bg-white
阴影 → shadow-sm
```

### Step 3：看文字 — 字级/行高/颜色

蓝湖选中文字 → 标注面板：
```
字号 14px → text-sm
行高 20px → leading-5
字重 500  → font-medium
颜色 #333 → text-gray-800
```

**蓝湖字重 → Tailwind 映射**：
| 蓝湖 | Tailwind | CSS |
|------|---------|-----|
| Regular (400) | `font-normal` | 400 |
| Medium (500) | `font-medium` | 500 |
| Semibold (600) | `font-semibold` | 600 |
| Bold (700) | `font-bold` | 700 |

### Step 4：看间距 — margin/padding

蓝湖元素间距 → Tailwind spacing：

```
两个元素间距 12px → 上一个 mb-3 / 下一个 mt-3 / 父 flex gap-3
元素内边距 16px  → p-4
文字旁 icon 间距 4px → gap-1
```

### Step 5：处理图片/图标

- **icon 类小图**：蓝湖导出 SVG/PNG 放 `src/assets/icons/`
- **用户头像/动态图**：用 `Image` 组件 + `rounded-full` / `rounded-xl`
- **背景大图**：VantUI `Image` 组件的 `lazyLoad` 模式

---

## 3. 实操示例

蓝湖设计稿上有一个"用户信息卡片"：

![卡片](标注：宽343 高72 圆角12 背景白 内边距16)

```
├── Image 48x48 圆角 50%
├── 文字组
│   ├── "张三" 16px Medium #333
│   └── "浙江大学 · 22岁" 12px Regular #999
└── 箭头 icon 16x16 #999
```

**逐行翻译为代码**：

```tsx
<View className="flex items-center gap-3 bg-white rounded-xl p-4">
  {/* 头像 */}
  <Image className="w-12 h-12 rounded-full" src={avatar} />
  {/* 文字 */}
  <View className="flex-1">
    <Text className="text-base font-medium text-gray-800">张三</Text>
    <Text className="text-xs text-gray-400 mt-0.5">浙江大学 · 22岁</Text>
  </View>
  {/* 箭头 */}
  <Image className="w-4 h-4" src={arrowIcon} />
</View>
```

---

## 4. VantUI 组件与蓝湖对齐

蓝湖上常见元素的对应 VantUI 组件：

| 蓝湖设计元素 | VantUI 组件 | 注意 |
|-------------|-----------|------|
| 顶部导航栏 | `NavBar` | 自定义 title、leftArrow |
| Tab 切换栏 | `Tabs` + `Tab` | 匹配品牌色 |
| 按钮 | `Button` | round / type / size |
| 弹窗 | `Popup` | position / round |
| 列表项 | `Cell` / `CellGroup` | 图标、右侧箭头 |
| 输入框 | `Field` | label / placeholder |
| 标签 | `Tag` | 圆角、颜色 |
| 图片 | `Image` | fit / radius |
| 底部操作栏 | `ActionSheet` | actions 配置 |
| 加载中 | `Loading` | 颜色大小可调 |
| Toast | `Toast` | 全局注册 |

**VantUI 样式覆盖**（必要时）：

```tsx
// 通过 customStyle 覆盖默认样式
<Button
  type="primary"
  customStyle={{ borderRadius: '24rpx', height: '88rpx', fontSize: '32rpx' }}
>
  立即匹配
</Button>
```

---

## 5. 还原前后核对清单

每做完一个页面，逐项对照蓝湖：

- [ ] 背景色是否一致
- [ ] 页面左右边距是否一致
- [ ] 每个卡片的圆角、内边距、阴影
- [ ] 所有文字的字号、颜色、行高
- [ ] 元素间距（横向 gap / 纵向 margin）
- [ ] 图片尺寸和圆角
- [ ] 分割线颜色 `#eee → border-gray-100`
- [ ] 空状态 / 错误态是否设计了
- [ ] 底部安全区 `pb-safe`（iPhone X+ 适配）

---

## 6. 自定义 Tailwind 值（蓝湖特殊尺寸）

如果蓝湖某个值不在 Tailwind 默认 scale 中，用方括号：

```tsx
<View className="w-[358px] h-[96px] rounded-[14px] p-[18px]">
  {/* 任意值写法 */}
</View>
```

频繁使用的特殊值，加到 `tailwind.config.js` 的 `theme.extend` 中。
