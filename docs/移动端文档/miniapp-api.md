# 小程序 API 汇总

本文档按模块汇总小程序侧接口，来源于现有技术方案并对照代码补齐：

- `docs/技术方案/2026-05-22-推广裂变与邀请奖励-tcdesign.md`
- `docs/技术方案/2026-05-28-公共内容配置-tcdesign.md`
- `backend/src/main/java/com/spacetime/miniapp/controller/*`
- `backend/src/main/java/com/spacetime/common/interceptor/WebConfig.java`

## 1. 全局约定

### 1.1 Base URL

本地联调默认：

```text
http://127.0.0.1:8080
```

当前本机 `8080` 已有服务响应，公开接口示例均从实际 `curl` 结果拷贝。

### 1.2 Header

公开接口：

```http
Content-Type: application/json
```

登录态接口：

```http
Content-Type: application/json
X-Auth-Token: <miniapp token>
```

### 1.3 认证方式

小程序登录态接口通过请求头 `X-Auth-Token` 传 token。后端拦截 `/miniapp/**`，并从 Redis `miniapp:token:{token}` 读取用户上下文。

当前放行的公开接口：

- `/miniapp/login/**`
- `/miniapp/promotion/invite/rules`
- `/miniapp/promotion/invite/share-log`
- `/miniapp/promotion/invite/qr-source`
- `/miniapp/content/**`
- `/miniapp/mobile-config/**`
- `/miniapp/search/**`

无 token 访问登录态接口时，当前实际返回：

```json
{ "code": 401, "msg": "未登录" }
```

### 1.4 统一响应

Controller 统一返回 `R<T>`：

```json
{
  "code": 200,
  "msg": "success",
  "data": {}
}
```

分页接口当前使用 MyBatis-Plus `Page<T>`，常用字段：

```json
{
  "records": [],
  "total": 0,
  "size": 10,
  "current": 1,
  "pages": 0
}
```

## 2. 推广裂变 / 邀请奖励

### 2.1 邀请首页

| 项目   | 说明                             |
| ------ | -------------------------------- |
| Path   | `/miniapp/promotion/invite/home` |
| Method | `GET`                            |
| Auth   | 登录态                           |
| Query  | 无                               |

响应字段按当前代码结构：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "successInviteCount": 0,
    "totalRewardCoin": 0,
    "nextTierText": "邀请 2 位新同学完成三项认证，即可获得更多成家币"
  }
}
```

### 2.2 活动规则

| 项目   | 说明                              |
| ------ | --------------------------------- |
| Path   | `/miniapp/promotion/invite/rules` |
| Method | `GET`                             |
| Auth   | 公开                              |
| Query  | 无                                |

实际返回：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "rewardRule": "注册登录、资料完成、三项认证完成可分别触发奖励",
    "riskRule": "作弊、刷量、自邀不计奖，异常奖励可能进入冻结复核",
    "successRule": "被邀请人完成实名认证、头像认证、学历认证后，才算成功邀请"
  }
}
```

### 2.3 邀请记录

| 项目   | 说明                                                                     |
| ------ | ------------------------------------------------------------------------ |
| Path   | `/miniapp/promotion/invite/records`                                      |
| Method | `GET`                                                                    |
| Auth   | 登录态                                                                   |
| Query  | `page` 默认 `1`；`size` 默认 `20`，最大按代码截断为 `100`；`status` 可选 |

响应字段按当前代码结构：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "records": [
      {
        "id": 1,
        "createTime": "2026-05-29 10:00:00",
        "updateTime": "2026-05-29 10:00:00",
        "relationNo": "IR2060000000000000000",
        "sourceTraceId": 48,
        "sourceType": "user_qr",
        "inviterId": 10001,
        "inviteeId": 10002,
        "agentId": null,
        "qrCode": null,
        "status": "registered",
        "bindTime": "2026-05-29 10:00:00",
        "firstClickTime": null,
        "registerTime": "2026-05-29 10:00:00",
        "firstLoginTime": "2026-05-29 10:00:00",
        "profileCompleteTime": null,
        "verifySuccessTime": null,
        "totalRewardCoin": null
      }
    ],
    "total": 1,
    "size": 20,
    "current": 1,
    "pages": 1
  }
}
```

### 2.4 记录分享/扫码来源

| 项目   | 说明                                  |
| ------ | ------------------------------------- |
| Path   | `/miniapp/promotion/invite/share-log` |
| Method | `POST`                                |
| Auth   | 公开                                  |
| Body   | `PromotionSourceTrace` 部分字段       |

请求示例：

```json
{
  "sourceType": "user_qr",
  "inviterId": 10001,
  "scene": "share_card"
}
```

实际返回：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "id": 48,
    "createTime": "2026-05-29 10:04:06",
    "updateTime": "2026-05-29 10:04:06",
    "traceNo": "TR2060180351513726976",
    "sourceType": "user_qr",
    "inviterId": 10001,
    "scene": "share_card",
    "bindStatus": "unbound"
  }
}
```

### 2.5 绑定邀请关系

| 项目   | 说明                                                             |
| ------ | ---------------------------------------------------------------- |
| Path   | `/miniapp/promotion/invite/bind`                                 |
| Method | `POST`                                                           |
| Auth   | 登录态                                                           |
| Body   | `traceNo`、`inviteCode`、`qrCode` 三者至少应提供有效邀请来源之一 |

请求示例：

```json
{
  "traceNo": "TR2060180351513726976",
  "inviteCode": "",
  "qrCode": ""
}
```

响应字段按当前代码结构：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "id": 1,
    "relationNo": "IR2060000000000000000",
    "sourceTraceId": 48,
    "sourceType": "user_qr",
    "inviterId": 10001,
    "inviteeId": 10002,
    "agentId": null,
    "qrCode": null,
    "status": "registered",
    "bindTime": "2026-05-29 10:00:00",
    "registerTime": "2026-05-29 10:00:00",
    "firstLoginTime": "2026-05-29 10:00:00"
  }
}
```

### 2.6 获取普通用户二维码

| 项目   | 说明                                |
| ------ | ----------------------------------- |
| Path   | `/miniapp/promotion/invite/qr-code` |
| Method | `GET`                               |
| Auth   | 登录态                              |
| Query  | 无                                  |

响应字段按当前代码结构：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "materialUrl": null,
    "qrUrl": null,
    "miniappPath": "/pages/index/index?inviterId=10001"
  }
}
```

### 2.7 查询代理二维码来源

| 项目   | 说明                                  |
| ------ | ------------------------------------- |
| Path   | `/miniapp/promotion/invite/qr-source` |
| Method | `GET`                                 |
| Auth   | 公开                                  |
| Query  | `qrCode` 必填                         |

实际返回：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "qrCode": "AGENT_QR_DEMO",
    "available": false
  }
}
```

## 3. 公共内容 / 公告 / 帮助 / 协议

### 3.1 公告列表

| 项目   | 说明                                                      |
| ------ | --------------------------------------------------------- |
| Path   | `/miniapp/content/announcements`                          |
| Method | `GET`                                                     |
| Auth   | 公开                                                      |
| Query  | `page` 默认 `1`；`size` 默认 `10`，最大按代码截断为 `100` |

实际返回：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "records": [
      {
        "id": 5,
        "type": "ANNOUNCEMENT",
        "category": "系统公告",
        "title": "平台升级公告",
        "summary": "平台将于本周末进行系统升级维护",
        "coverUrl": "",
        "contentType": "NATIVE",
        "contentUrl": "",
        "sort": 0,
        "createTime": "2026-05-28 19:44:52"
      }
    ],
    "total": 1,
    "size": 1,
    "current": 1,
    "pages": 1
  }
}
```

### 3.2 帮助文档列表

| 项目   | 说明                                                                       |
| ------ | -------------------------------------------------------------------------- |
| Path   | `/miniapp/content/help-docs`                                               |
| Method | `GET`                                                                      |
| Auth   | 公开                                                                       |
| Query  | `category` 可选；`page` 默认 `1`；`size` 默认 `10`，最大按代码截断为 `100` |

实际返回：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "records": [
      {
        "id": 6,
        "type": "HELP_DOC",
        "category": "新手指南",
        "title": "如何完善个人资料",
        "summary": "教你快速完善个人资料，提高匹配成功率",
        "coverUrl": "",
        "contentType": "NATIVE",
        "contentUrl": "",
        "sort": 0,
        "createTime": "2026-05-28 19:45:48"
      }
    ],
    "total": 1,
    "size": 1,
    "current": 1,
    "pages": 1
  }
}
```

### 3.3 规则 / 协议内容列表

| 项目   | 说明                     |
| ------ | ------------------------ |
| Path   | `/miniapp/content/rules` |
| Method | `GET`                    |
| Auth   | 公开                     |
| Query  | `type` 默认 `RULE`       |

实际返回：

```json
{
  "code": 200,
  "msg": "success",
  "data": [
    {
      "id": 7,
      "type": "RULE",
      "category": "平台规则",
      "title": "社区行为规范",
      "summary": "用户在平台上的行为准则",
      "coverUrl": "",
      "contentType": "NATIVE",
      "contentUrl": "",
      "sort": 0,
      "createTime": "2026-05-28 19:46:29"
    }
  ]
}
```

### 3.4 内容详情

| 项目       | 说明                             |
| ---------- | -------------------------------- |
| Path       | `/miniapp/content/articles/{id}` |
| Method     | `GET`                            |
| Auth       | 公开                             |
| Path Param | `id` 文章 ID                     |

实际返回：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "id": 5,
    "type": "ANNOUNCEMENT",
    "category": "系统公告",
    "title": "平台升级公告",
    "summary": "平台将于本周末进行系统升级维护",
    "coverUrl": "",
    "contentType": "NATIVE",
    "contentUrl": "",
    "sort": 0,
    "createTime": "2026-05-28 19:44:52",
    "contentBody": "尊敬的用户，为了给您提供更好的服务体验，平台将于本周六凌晨2:00-6:00进行系统升级维护，届时部分功能可能暂时无法使用，请您提前做好安排。感谢您的理解与支持！"
  }
}
```

### 3.5 获取公开配置

| 项目   | 说明                                 |
| ------ | ------------------------------------ |
| Path   | `/miniapp/content/config`            |
| Method | `GET`                                |
| Auth   | 公开                                 |
| Query  | `keys` 必填，多个 key 用英文逗号分隔 |

实际返回：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "search.empty_state_text": "暂无搜索结果，换个关键词试试",
    "search.default_sort": "综合相关度",
    "search.violation_text": "搜索内容不支持展示"
  }
}
```

说明：该接口只返回启用且 `public_visible=1` 的配置。

## 4. 移动端入口配置

### 4.1 查询页面入口配置

| 项目   | 说明                             |
| ------ | -------------------------------- |
| Path   | `/miniapp/mobile-config/entries` |
| Method | `GET`                            |
| Auth   | 公开                             |
| Query  | `pageCode` 必填                  |

`pageCode=MY_PAGE` 实际返回：

```json
{
  "code": 200,
  "msg": "success",
  "data": [
    {
      "entryKey": "help_docs",
      "entryName": "帮助文档",
      "icon": "help",
      "jumpType": "NATIVE_ROUTE",
      "jumpTarget": "/pages/help/index",
      "badgeType": "NONE",
      "loginRequired": 0,
      "sort": 10
    },
    {
      "entryKey": "announcements",
      "entryName": "平台公告",
      "icon": "notice",
      "jumpType": "NATIVE_ROUTE",
      "jumpTarget": "/pages/announcement/index",
      "badgeType": "NONE",
      "loginRequired": 0,
      "sort": 20
    },
    {
      "entryKey": "about_us",
      "entryName": "关于我们",
      "icon": "info",
      "jumpType": "NATIVE_ROUTE",
      "jumpTarget": "/pages/about/index",
      "badgeType": "NONE",
      "loginRequired": 0,
      "sort": 30
    },
    {
      "entryKey": "user_agreement",
      "entryName": "用户协议",
      "icon": "file",
      "jumpType": "H5",
      "jumpTarget": "https://spacetime.app/agreement/user",
      "badgeType": "NONE",
      "loginRequired": 0,
      "sort": 40
    },
    {
      "entryKey": "invite_friends",
      "entryName": "邀请好友",
      "icon": "",
      "jumpType": "NATIVE_ROUTE",
      "jumpTarget": "/pages/invite/index",
      "badgeText": "",
      "badgeType": "NONE",
      "loginRequired": 0,
      "sort": 50
    }
  ]
}
```

`pageCode=SETTINGS_PAGE` 实际返回：

```json
{
  "code": 200,
  "msg": "success",
  "data": [
    {
      "entryKey": "privacy_policy",
      "entryName": "隐私政策",
      "icon": "shield",
      "jumpType": "H5",
      "jumpTarget": "https://spacetime.app/agreement/privacy",
      "badgeType": "NONE",
      "loginRequired": 0,
      "sort": 10
    },
    {
      "entryKey": "third_party_list",
      "entryName": "第三方信息共享清单",
      "icon": "list",
      "jumpType": "H5",
      "jumpTarget": "https://spacetime.app/agreement/third-party",
      "badgeType": "NONE",
      "loginRequired": 0,
      "sort": 20
    },
    {
      "entryKey": "personal_info_list",
      "entryName": "个人信息收集清单",
      "icon": "list",
      "jumpType": "H5",
      "jumpTarget": "https://spacetime.app/agreement/personal-info",
      "badgeType": "NONE",
      "loginRequired": 0,
      "sort": 30
    }
  ]
}
```

说明：当后台 `jumpTarget` 以 `config:` 开头时，小程序接口会尝试读取同名公开配置并替换为配置值。

## 5. 搜索配置

### 5.1 热门搜索词

| 项目   | 说明                        |
| ------ | --------------------------- |
| Path   | `/miniapp/search/hot-words` |
| Method | `GET`                       |
| Auth   | 公开                        |
| Query  | `limit` 默认 `10`           |

实际返回：

```json
{
  "code": 200,
  "msg": "success",
  "data": [
    {
      "word": "校园活动",
      "scene": "GLOBAL"
    },
    {
      "word": "周末约会",
      "scene": "GLOBAL"
    },
    {
      "word": "学习搭子",
      "scene": "GLOBAL"
    }
  ]
}
```

### 5.2 搜索展示配置

| 项目   | 说明                     |
| ------ | ------------------------ |
| Path   | `/miniapp/search/config` |
| Method | `GET`                    |
| Auth   | 公开                     |
| Query  | 无                       |

实际返回：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "emptyStateText": "暂无搜索结果，换个关键词试试",
    "violationText": "搜索内容不支持展示",
    "defaultSort": "综合相关度",
    "tabs": [
      {
        "entryKey": "user",
        "entryName": "用户",
        "jumpType": "NONE",
        "badgeType": "NONE",
        "loginRequired": 0,
        "sort": 10
      },
      {
        "entryKey": "post",
        "entryName": "动态",
        "jumpType": "NONE",
        "badgeType": "NONE",
        "loginRequired": 0,
        "sort": 20
      },
      {
        "entryKey": "topic",
        "entryName": "话题",
        "jumpType": "NONE",
        "badgeType": "NONE",
        "loginRequired": 0,
        "sort": 30
      }
    ]
  }
}
```

## 6. 枚举值说明

### 6.1 公共内容

| 字段          | 枚举值             | 说明                             |
| ------------- | ------------------ | -------------------------------- |
| `type`        | `ANNOUNCEMENT`     | 公告                             |
| `type`        | `HELP_DOC`         | 帮助文档                         |
| `type`        | `RULE`             | 规则/协议说明                    |
| `type`        | `SAFETY_GUIDE`     | 交友指南                         |
| `type`        | `FRAUD_GUIDE`      | 反诈指南                         |
| `type`        | `SECURITY_CONTENT` | 安全中心内容                     |
| `type`        | `ABOUT_US`         | 关于我们                         |
| `contentType` | `H5`               | H5 链接，读取 `contentUrl`       |
| `contentType` | `NATIVE`           | 原生内容，详情读取 `contentBody` |

### 6.2 移动端入口

| 字段            | 枚举值              | 说明           |
| --------------- | ------------------- | -------------- |
| `pageCode`      | `MY_PAGE`           | 我的页         |
| `pageCode`      | `SETTINGS_PAGE`     | 设置页         |
| `pageCode`      | `SECURITY_CENTER`   | 安全中心       |
| `pageCode`      | `SEARCH_RESULT_TAB` | 搜索结果 Tab   |
| `jumpType`      | `NATIVE_ROUTE`      | 小程序原生路由 |
| `jumpType`      | `H5`                | H5 页面        |
| `jumpType`      | `MINI_PROGRAM`      | 其他小程序     |
| `jumpType`      | `NONE`              | 无跳转         |
| `loginRequired` | `0`                 | 不要求登录     |
| `loginRequired` | `1`                 | 要求登录       |

### 6.3 搜索配置

| 字段        | 枚举值             | 说明         |
| ----------- | ------------------ | ------------ |
| `blockType` | `SEARCH_VIOLATION` | 搜索词违规   |
| `blockType` | `RESULT_BLOCK`     | 搜索结果屏蔽 |
| `matchType` | `EXACT`            | 精确匹配     |
| `matchType` | `FUZZY`            | 包含匹配     |
| `matchType` | `PREFIX`           | 前缀匹配     |

说明：搜索屏蔽词当前在 service 中提供 `validateKeyword(keyword)` 能力，但尚未暴露独立小程序 Controller 接口。

### 6.4 推广邀请

| 字段          | 枚举值                       | 说明                    |
| ------------- | ---------------------------- | ----------------------- |
| `sourceType`  | `user_qr`                    | 普通用户分享/二维码来源 |
| `sourceType`  | `agent_qr`                   | 校园代理二维码来源      |
| `status`      | `registered`                 | 已注册/已绑定           |
| `status`      | `profile_completed`          | 已完善资料              |
| `status`      | `verify_success`             | 三项认证完成            |
| `rewardEvent` | `register_login_reward`      | 注册登录奖励            |
| `rewardEvent` | `profile_complete_reward`    | 资料完善奖励            |
| `rewardEvent` | `verify_complete_reward`     | 认证完成奖励            |
| `rewardEvent` | `ladder_reward`              | 阶梯奖励                |
| `rewardEvent` | `first_vip_reward`           | 首次会员奖励            |
| `rewardEvent` | `first_coin_recharge_reward` | 首次成家币充值奖励      |

### 6.5 通用状态

| 字段     | 枚举值     | 说明 |
| -------- | ---------- | ---- |
| `status` | `ENABLED`  | 启用 |
| `status` | `DISABLED` | 禁用 |
