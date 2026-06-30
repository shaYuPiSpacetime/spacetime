# 静态 Demo 公共资源

该目录存放跨模块可复用的静态 Demo 基础资源，适用于后续 PRD-04 等模块。

## 文件说明

| 文件 | 用途 |
|------|------|
| `base.css` | 全局变量、基础布局、顶部栏、按钮、标签、弹窗、抽屉、Toast。 |
| `admin.css` | 管理后台骨架、侧边栏、表格、查询区、分页、后台弹窗画板。 |
| `admin-state.css` | 后台 hash 页面显示/隐藏状态层，应在模块样式后加载。 |
| `demo-common.js` | 选择器工具、HTML 转义、状态样式、Toast、弹窗、抽屉公共方法。 |

## 推荐引用顺序

管理后台页面：

```html
<link rel="stylesheet" href="../../shared/base.css">
<link rel="stylesheet" href="../../shared/admin.css">
<link rel="stylesheet" href="assets/demo.css">
<link rel="stylesheet" href="../../shared/admin-state.css">

<script src="../../shared/demo-common.js"></script>
<script src="mock/demo-data.js"></script>
<script src="assets/demo.js"></script>
```

移动端或总览页：

```html
<link rel="stylesheet" href="../../shared/base.css">
<link rel="stylesheet" href="assets/demo.css">

<script src="../../shared/demo-common.js"></script>
<script src="mock/demo-data.js"></script>
<script src="assets/demo.js"></script>
```

## 新模块目录建议

```text
docs/静态Demo/04-商业化/html/
  index.html
  admin.html
  miniapp.html
  assets/demo.css
  assets/demo.js
  mock/demo-data.js
```

模块目录只放业务页面、模块 mock 数据和少量覆盖样式；后台通用骨架优先复用 `shared/admin.css`。
