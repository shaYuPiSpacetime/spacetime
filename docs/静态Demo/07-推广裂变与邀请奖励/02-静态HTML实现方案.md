# PRD-07 静态 HTML 实现方案

## 1. 文件职责

```text
07-推广裂变与邀请奖励/
├── html/
│   ├── index.html
│   ├── miniapp.html             # 3个移动端视图
│   ├── admin.html               # 5个管理页、2个抽屉、二维码弹窗
│   ├── assets/demo.css
│   ├── assets/demo.js
│   └── mock/demo-data.js        # 规则、关系、奖励、代理、结算、审计
├── verify-demo.mjs
├── verify-browser.mjs
└── 截图证据/
```

## 2. 结构与状态

- 移动端通过`data-view=home|records|rules`切换；`rules` 使用 `data-h5-content=invite-rules` 模拟共享 H5 容器，`data-mobile-state`演示空态、二维码失败、发放失败、H5 缓存和 H5 无缓存不可用。
- 管理端只允许5个Hash路由；详情使用`data-drawer`，二维码使用`data-modal=qrcode`。
- 固定/阶梯单选实时控制各自阶梯配置区显示；问号支持悬停和键盘聚焦。
- Mock 数据不包含关系状态、风险、独立素材集合或打款字段。

## 3. 二维码实现

二维码由Canvas根据代理推广标识绘制。保存按钮通过Blob和浏览器下载能力生成本地PNG；复制按钮通过Clipboard API复制PNG，权限或能力不足时明确提示改用保存。

## 4. 视觉 token

| 用途 | 值 |
|---|---|
| 管理端品牌蓝 | `#2563eb` |
| 移动端邀请紫 | `#6d4aff` / `#8b5cf6` |
| 页面背景 | `#eef3fa` / `#f7f5ff` |
| 主文字 | `#172033` |
| 次文字 | `#667085` |
| 边框 | `#d9e2ec` |
| 圆角 | 后台8px / 移动卡片16px |

## 5. 门禁

- 静态门禁检查页面数量、废弃入口消失、关键业务文字、函数、Mock集合和本地依赖。
- 浏览器门禁检查3个移动页、5个管理页、2个抽屉、阶梯显隐/提示、二维码下载、自然月结算、只读权限、控制台错误和页面溢出。
- 跨模块门禁检查 PRD-06 存在 `invite_rules` 配置及业务规则 Tab，PRD-07 只消费 H5 且不包含 URL 编辑控件。
