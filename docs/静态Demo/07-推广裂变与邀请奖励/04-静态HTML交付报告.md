# PRD-07 静态 HTML 交付报告

## 1. 交付结论

PRD-07 静态 Demo 已按 2026-07-20 确认口径完成同步：移动端 3 页、管理端 5 个菜单页、2 个详情抽屉和 1 个二维码弹窗。邀请规则页已改为 H5 容器，并与 PRD-06 的 H5 内容配置建立清晰边界；原独立详情入口、奖励复核页和素材页已从运行态移除。

## 2. 访问入口

- 模块总览：`docs/静态Demo/07-推广裂变与邀请奖励/html/index.html`
- 移动端：`docs/静态Demo/07-推广裂变与邀请奖励/html/miniapp.html#home`
- 管理端：`docs/静态Demo/07-推广裂变与邀请奖励/html/admin.html#promo-rule-config`

## 3. 交付内容

| 类别 | 内容 |
|---|---|
| 页面 | `html/index.html`、`html/miniapp.html`、`html/admin.html` |
| 资源 | `html/assets/demo.css`、`html/assets/demo.js` |
| Mock | `html/mock/demo-data.js` |
| 验证 | `verify-demo.mjs`、`verify-browser.mjs` |
| 文档 | `00`至`04`范围、元素、方案、自测、交付报告 |
| 证据 | 18 张最新 PNG，覆盖页面、抽屉、弹窗和异常态；邀请规则 H5 当前版截图已更新 |

## 4. 本地演示

```bash
cd docs/静态Demo
python3 -m http.server 4173 --bind 127.0.0.1
```

打开`http://127.0.0.1:4173/07-推广裂变与邀请奖励/html/index.html`。

## 5. 边界

除二维码 PNG 保存和浏览器支持时的图片复制外，规则发布、奖励重试、状态修改、结算确定和导出均只更新本地 Mock。邀请规则 H5 的标题、URL、版本、状态由 PRD-06 配置；邀请及奖励规则由 PRD-07 定义。Demo 是产品行为与页面结构基线，不代表生产接口和业务代码已完成。
