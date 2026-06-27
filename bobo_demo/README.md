# bobo_demo 静态 Demo

本目录是“01-用户准入与资料认证初始化”的独立静态 Demo，采用“静态前端 + 轻量 Mock 后端”架构，不依赖正式 `frontend`、`miniapp`、`backend` 工程。

## 目录结构

```text
bobo_demo/
  frontend/
    index.html              # 总入口
    admin.html              # 管理后台静态 Demo
    mobile.html             # 小程序 H5 静态 Demo
    assets/demo.css         # 统一样式
    assets/demo.js          # 页面交互
    mock/demo-data.js       # 前端写死 demo 数据
  backend/
    mock-server.mjs         # 零依赖 Node Mock Server
    mock-data.mjs           # 后端 mock 数据
    api-contract.md         # 接口契约说明
  截图证据/                 # 当前渲染截图证据
  verify-demo.mjs           # 静态闭环验收脚本
  验收报告.md
  技术方案.md
```

## 打开前端 Demo

直接用浏览器打开：

```text
bobo_demo/frontend/index.html
```

入口页包含：

- 移动端 H5：`frontend/mobile.html`
- 管理后台：`frontend/admin.html`
- 接口契约：`backend/api-contract.md`
- 技术方案：`技术方案.md`

前端默认读取 `frontend/mock/demo-data.js` 中的写死数据，无需启动后端。

## 启动 Mock 后端

如需演示接口形态，可在仓库根目录执行：

```bash
node bobo_demo/backend/mock-server.mjs
```

默认端口为 `18081`，可通过环境变量覆盖：

```bash
PORT=18082 node bobo_demo/backend/mock-server.mjs
```

常用接口：

```text
GET  http://localhost:18081/api/admin/users
GET  http://localhost:18081/api/admin/users/u_1001
GET  http://localhost:18081/api/admin/audits?type=realName
GET  http://localhost:18081/api/admin/access-config
GET  http://localhost:18081/api/miniapp/profile
GET  http://localhost:18081/api/miniapp/verification/status
POST http://localhost:18081/api/demo/action
```

## 推荐演示路径

1. 打开 `frontend/index.html`，先看整体业务入口。
2. 进入 `frontend/mobile.html`，依次演示 16 个移动端页面：登录、轻量引导、基本资料、头像、自我介绍、三重认证、实名、学历、核心拦截、资料编辑。
3. 进入 `frontend/admin.html`，演示 7 个后台工作台：App 用户管理、准入配置、头像/实名/学历/资料图片/开放性文字审核。
4. 启动 `backend/mock-server.mjs`，用接口说明展示前后端数据结构如何对应。

## 静态验收

在仓库根目录执行：

```bash
node bobo_demo/verify-demo.mjs
```

该脚本会检查：

- 前端、后端、文档文件是否齐全。
- 移动端 16 个 PRD 页面 ID 是否可导航。
- 管理后台 7 个 PRD 页面 ID 是否可导航。
- 关键交互钩子、审核详情、配置日志、准入缺口、三重认证状态是否存在。
- 截图证据和验收报告是否存在。
- 是否存在外部远程链接、密钥特征或尾部空格。

## 边界说明

- Demo 数据全部写死且脱敏。
- 不接真实数据库、Redis、鉴权服务或第三方认证平台。
- `POST /api/demo/action` 只模拟成功返回，不持久化状态。
- 本目录不修改正式小程序、管理后台和 Java 后端工程。
