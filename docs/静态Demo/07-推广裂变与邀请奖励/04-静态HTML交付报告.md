# PRD-07 静态 HTML 交付报告

## 1. 交付结论

PRD-07 普通用户邀请首页已于 2026-07-27 按确认 UI 稿重构。首页不再展示二维码、邀请码、保存二维码和“千寻币能做什么”，改为注册奖励说明、全量阶梯进度、最近邀请记录和规则摘要。原分享弹层、邀请记录页、邀请规则 H5、校园代理二维码和管理后台保持可用。

## 2. 访问入口

- 模块总览：`docs/静态Demo/07-推广裂变与邀请奖励/html/index.html`
- 移动端：首页 `docs/静态Demo/07-推广裂变与邀请奖励/html/miniapp.html#home`
- 管理端：`docs/静态Demo/07-推广裂变与邀请奖励/html/admin.html#promo-rule-config`

## 3. 交付内容

| 类别 | 内容 |
|---|---|
| 设计基线 | 用户确认 UI 稿的稳定项目副本 |
| 页面 | `html/index.html`、`html/miniapp.html`、`html/admin.html` |
| 资源 | `html/assets/demo.css`、`html/assets/demo.js`、`html/assets/images/invite-avatar.png` |
| Mock | 注册奖励、成功人数、累计到账、完整阶梯、最近邀请、分享上下文 |
| 验证 | `verify-demo.mjs`、`verify-browser.mjs` |
| 文档 | 00～04 范围、元素、方案、自测与交付报告 |
| 证据 | 21 张 PNG；首页新增上/下半屏、分享、加载、空记录和网络错误证据 |

## 4. 本地演示

```bash
cd docs/静态Demo
python3 -m http.server 4173 --bind 127.0.0.1
```

打开 `http://127.0.0.1:4173/07-推广裂变与邀请奖励/html/index.html`。

## 5. 边界

- 首页设计稿示例数字由 Mock 提供，生产实现必须读取已发布规则，不能写死 20、330 或三档配置。
- 分享不可用时 Demo 用本地 Toast 模拟复制成功，不向外部系统发送数据。
- 人物插画暂从确认 UI 基线裁切；拿到独立无损切图后可在不改布局的情况下替换。
- 校园代理二维码的本地 PNG 保存/复制能力保留，普通用户首页不再出现二维码。
- Demo 是产品行为与页面结构基线，不代表生产接口和业务代码已完成。
