# bobo_demo Mock 后端接口契约

> 模块：01-用户准入与资料认证初始化
> 形态：零依赖 Node mock server，仅用于静态 Demo 的前后端接口表达。

## 启动方式

```bash
node bobo_demo/backend/mock-server.mjs
```

默认端口：`18081`。可通过环境变量覆盖：

```bash
PORT=18082 node bobo_demo/backend/mock-server.mjs
```

## 通用响应

```json
{
  "code": 0,
  "msg": "ok",
  "data": {}
}
```

## 接口列表

便于演示时复制的接口清单：

```text
GET /api/admin/users
GET /api/admin/users/:id
GET /api/admin/audits?type=avatar|realName|education
GET /api/admin/access-config
GET /api/miniapp/profile
GET /api/miniapp/verification/status
POST /api/demo/action
```

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/api/admin/users` | 后台 App 用户卡片列表 |
| GET | `/api/admin/users/:id` | 后台用户画像详情 |
| GET | `/api/admin/audits?type=avatar` | 头像审核队列 |
| GET | `/api/admin/audits?type=realName` | 实名审核队列 |
| GET | `/api/admin/audits?type=education` | 学历审核队列 |
| GET | `/api/admin/access-config` | 准入与认证配置 |
| GET | `/api/miniapp/profile` | 小程序当前用户资料 |
| GET | `/api/miniapp/verification/status` | 小程序三重认证状态 |
| POST | `/api/demo/action` | 模拟审核、保存配置、导入导出等动作 |
| GET | `/health` | 服务健康检查 |

`POST /api/demo/action` 示例请求：

```json
{
  "action": "approve",
  "targetId": "R-2001",
  "operator": "demo-admin"
}
```

## 核心字段说明

- `accessStatus`：用户当前准入状态，例如 `FULL_ACCESS`、`BLOCKED_CERTIFICATION`。
- `avatarStatus`：头像审核状态。
- `realNameStatus`：实名认证状态。
- `educationStatus`：学历认证状态。
- `missingItems`：当前阻断准入的缺口项。
- `coreAccess`：小程序核心功能是否开放，`BLOCKED` 表示需要补认证。

## 边界

- 不连接数据库。
- 不写真实状态。
- 不返回真实手机号、身份证号、证照材料或 token。
- 前端静态页默认不依赖该 server，启动 server 只用于接口演示。
