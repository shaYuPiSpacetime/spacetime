# PRD-05 静态 HTML 自测与还原度报告

## 1. 自测结论

| 检查项 | 结果 | 证据 |
|--------|------|------|
| JavaScript 语法 | 通过 | `node --check html/assets/demo.js`、`node --check html/mock/demo-data.js` |
| 反向缺口静态契约 | 通过 | `verify-reverse-gaps.mjs` 共 14 项 |
| 移动端页面锚点 | 通过 | 17 个唯一 `APP-05-PAGE-*` 页面 |
| 草稿与上传状态 | 通过 | 保存/恢复/状态切换/失败重试为真实按钮 |
| 收藏与两级屏蔽 | 通过 | 收藏切换、hide_post、hide_author_posts、unhide_author_posts |
| 术语统一 | 通过 | “申请认识”统一跳转 greeting，不新增关系状态 |
| 浏览器交互回归 | 通过 | Chrome Headless：17 个页面锚点、收藏切换、草稿恢复、上传失败重试、作者级内容偏好 |

## 2. 截图证据

- [千寻互动中心](截图证据/PRD-05-interaction-center.png)
- [发布页单图上传失败与重试](截图证据/PRD-05-publish-upload-failed.png)

## 3. 还原度说明

本轮目标是补齐蓝湖已有功能与正式 PRD 的业务缺口，视觉上沿用既有 PRD-05 Demo 的字体、卡片、按钮、间距和手机框架。由于蓝湖画板没有提供全部异常态的精确标注值，本报告不对像素级高保真给出虚高评分；业务结构、可见组件和交互语义已形成可验收基线。

## 4. 已知限制

- 静态 Demo 不持久化刷新后的草稿、收藏和屏蔽结果。
- 图片上传进度为前端状态演示，不调用真实 OSS。
- 解锁记录只展示 PRD-04 返回结果，不模拟真实扣费或资产流水。
