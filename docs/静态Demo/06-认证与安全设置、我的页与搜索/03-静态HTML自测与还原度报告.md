# PRD-06 静态 HTML 自测与还原度报告

## 1. 结论

- 本轮新增“业务规则”H5 配置分组，预置`invite_rules`邀请规则配置项。
- PRD-06 只维护 H5 标题、URL、版本、状态和预览；邀请成功、基础奖励、阶梯奖励等业务规则仍由 PRD-07 定义。
- 邀请规则编辑、预览、来源模块只读约束均通过；控制台错误 0 项，页面无横向溢出。
- 既有移动端、搜索屏蔽词和注销申请 Demo 未改变业务范围。

## 2. 执行记录

| 检查 | 命令 | 结果 |
|---|---|---|
| 跨模块静态门禁 | `node docs/静态Demo/06-认证与安全设置、我的页与搜索/verify-invite-rules-h5.mjs` | PASS |
| JavaScript 语法 | `node --check .../html/assets/demo.js`、`node --check .../html/mock/demo-data.js` | PASS |
| 浏览器逐页验证 | `node docs/静态Demo/06-认证与安全设置、我的页与搜索/verify-browser.mjs` | PASS |
| 控制台 | Playwright 监听`console`/`pageerror` | 0 项 |
| 页面溢出 | `scrollWidth <= clientWidth` | PASS |

内置浏览器当前没有可用会话，因此按前端验收流程降级为仓库 Playwright 脚本，并使用本地同版本 Chromium 完成交互和截图。

## 3. 页面与证据矩阵

| 页面/状态 | 入口 | 截图 |
|---|---|---|
| H5 内容配置—业务规则 | `admin.html` → 业务规则 | `截图证据/PRD-06-admin-desktop.png` |
| 邀请规则编辑 | 邀请规则 → 编辑 | `截图证据/PRD-06-admin-invite-rules-edit.png` |
| 邀请规则预览 | 邀请规则 → 预览 | `截图证据/PRD-06-admin-invite-rules-preview.png` |
| 搜索屏蔽词 | `admin-blockwords.html` | `截图证据/PRD-06-admin-blockwords.png` |
| 注销申请 | `admin-cancellations.html` | `截图证据/PRD-06-admin-cancellations.png` |
| 移动端“我的页” | `miniapp.html` | `截图证据/PRD-06-miniapp-my-page.png` |

## 4. 业务验收

| 验收点 | 结果 |
|---|---|
| H5 内容配置包含“协议政策 / 公告与帮助 / 业务规则”3 个 Tab | 通过 |
| 业务规则内存在`invite_rules`且来源模块显示 PRD-07 | 通过 |
| 页面明确“内容配置：PRD-06；业务规则：PRD-07” | 通过 |
| 编辑弹窗仅配置标题、URL、版本、状态，来源模块只读 | 通过 |
| 页面不提供奖励金额、阶梯档位等业务配置字段 | 通过 |
| 预览 H5 包含“完成注册即邀请成功”和第 5 人`20+50`示例 | 通过 |

## 5. 最终视觉保真台账

| 检查点 | 基线 | 最新实现 | 结论 |
|---|---|---|---|
| 后台外壳 | PRD-06 既有白色侧栏、固定顶栏、浅蓝灰内容区 | H5 配置页复用原布局与 token | 一致 |
| 管理端跨模块风格 | PRD-08 白卡、轻边框、蓝色主操作 | Tab、提示卡和表格沿用相同层级 | 一致 |
| 表格密度 | 既有内容配置表格 | 单行邀请规则仍保持同列高和操作密度 | 一致 |
| 信息归属提示 | 既有蓝色轻提示样式 | 使用浅蓝提示卡和蓝色归属标签 | 一致 |
| 弹窗样式 | 既有居中白色弹窗 | 编辑和 H5 预览沿用相同圆角、遮罩、按钮 | 一致 |
| 移动端既有页面 | 用户提供“我的页”视觉基线 | 本轮未改动其布局与视觉 | 无回归 |

已在同一验收轮次用`view_image`对照 PRD-08 管理端基线、PRD-06 既有移动端截图及本轮最新 H5 配置截图。当前只声明与仓库既有模块风格一致，不声明外部设计稿像素级还原。

## 6. 差异与说明

| 项 | 说明 |
|---|---|
| 真实接口 | 未接入，配置和预览数据来自`mock/demo-data.js` |
| H5 业务正文 | Demo 用 PRD-07 当前规则生成预览内容；正式环境由 PRD-06 发布配置承载 |
| 生产代码 | 本轮只修改 PRD 与静态 Demo，未改动真实`frontend`、`backend`或`miniapp`代码 |

## 7. 自测命令

```bash
cd docs/静态Demo
python3 -m http.server 4173 --bind 127.0.0.1
node 06-认证与安全设置、我的页与搜索/verify-invite-rules-h5.mjs
node 06-认证与安全设置、我的页与搜索/verify-browser.mjs
```
