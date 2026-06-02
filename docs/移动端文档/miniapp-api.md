# 小程序 API 汇总

本文档按模块汇总小程序侧接口，来源于现有技术方案并对照代码补齐：

- `docs/技术方案/2026-05-22-推广裂变与邀请奖励-tcdesign.md`
- `docs/技术方案/2026-05-28-公共内容配置-tcdesign.md`
- `docs/技术方案/2026-05-28-PRD-04-商业化-tcdesign.md`
- `docs/技术方案/2026-05-29-PRD-05-推荐模块（朋友、社区与内容互动）-tcdesign.md`
- `docs/技术方案/2026-05-29-PRD-06用户安全设置与搜索主链路-tcdesign.md`
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
- `/miniapp/search/hot-words`
- `/miniapp/search/config`

说明：`/miniapp/search/results` 是搜索结果主链路，需要登录态。

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

## 6. 用户安全设置与搜索主链路

本章节对应 PRD-06 第二阶段，小程序前端通过这些接口完成“我的页、认证中心、设置、安全设置、反馈、注销、搜索结果”主链路。

### 6.1 我的页聚合

| 项目   | 说明                         |
| ------ | ---------------------------- |
| Path   | `/miniapp/profile/home`      |
| Method | `GET`                        |
| Auth   | 登录态                       |
| Query  | 无                           |

响应字段：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "userId": 1,
    "nickname": "peter",
    "avatar": "",
    "gender": "MALE",
    "age": 25,
    "school": "示例大学",
    "city": "上海",
    "profileCompletion": 80,
    "realNameStatus": "PENDING",
    "avatarStatus": "PENDING",
    "educationStatus": "PENDING",
    "vipStatus": null,
    "coinBalance": null,
    "entries": []
  }
}
```

说明：`entries` 复用移动端入口配置；认证与资产字段允许在对应 PRD 未接入前返回占位值或 `null`。

### 6.2 认证中心聚合

| 项目   | 说明                                      |
| ------ | ----------------------------------------- |
| Path   | `/miniapp/profile/certification-center`   |
| Method | `GET`                                     |
| Auth   | 登录态                                    |
| Query  | 无                                        |

响应字段：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "realNameStatus": "PENDING",
    "avatarStatus": "PENDING",
    "educationStatus": "PENDING",
    "title": "完成认证，提升匹配可信度",
    "description": "实名认证、头像认证、学历认证由认证模块承接"
  }
}
```

### 6.3 设置页聚合

| 项目   | 说明                         |
| ------ | ---------------------------- |
| Path   | `/miniapp/settings/home`     |
| Method | `GET`                        |
| Auth   | 登录态                       |
| Query  | 无                           |

响应字段：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "phoneBindStatus": "BOUND",
    "maskedPhone": "138****0000",
    "wechatBindStatus": "UNBOUND",
    "entries": [],
    "currentVersion": "1.0.0"
  }
}
```

### 6.4 隐私设置

#### 6.4.1 查询隐私设置

| 项目   | 说明                         |
| ------ | ---------------------------- |
| Path   | `/miniapp/settings/privacy`  |
| Method | `GET`                        |
| Auth   | 登录态                       |
| Query  | 无                           |

#### 6.4.2 保存隐私设置

| 项目   | 说明                         |
| ------ | ---------------------------- |
| Path   | `/miniapp/settings/privacy`  |
| Method | `PUT`                        |
| Auth   | 登录态                       |
| Body   | `MiniappPrivacySettingReq`   |

请求/响应字段：

```json
{
  "showDistance": false,
  "hideActiveTime": false,
  "showMaritalStatus": true,
  "profileUpdateVisible": true,
  "onlyOppositeInteraction": true,
  "personalizedPush": true,
  "matchChatHint": true,
  "smartReply": true
}
```

说明：PUT 支持部分字段更新，未传字段保持原值。

### 6.5 通知设置

#### 6.5.1 查询通知设置

| 项目   | 说明                              |
| ------ | --------------------------------- |
| Path   | `/miniapp/settings/notifications` |
| Method | `GET`                             |
| Auth   | 登录态                            |
| Query  | 无                                |

#### 6.5.2 保存通知设置

| 项目   | 说明                              |
| ------ | --------------------------------- |
| Path   | `/miniapp/settings/notifications` |
| Method | `PUT`                             |
| Auth   | 登录态                            |
| Body   | `MiniappNotificationSettingReq`   |

请求/响应字段：

```json
{
  "interaction": true,
  "community": true,
  "dailyRecommend": true,
  "appExit": true,
  "matchSuccess": true,
  "chat": false,
  "whisper": true,
  "certification": true,
  "report": true,
  "asset": true,
  "bannerInApp": true
}
```

说明：PUT 支持部分字段更新，未传字段保持原值。

### 6.6 黑名单与不看 TA 动态

#### 6.6.1 黑名单列表

| 项目   | 说明                                    |
| ------ | --------------------------------------- |
| Path   | `/miniapp/settings/blocks/blacklist`    |
| Method | `GET`                                   |
| Auth   | 登录态                                  |
| Query  | `page` 默认 `1`；`size` 默认 `20`       |

响应字段：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "records": [
      {
        "id": 1,
        "targetUserId": 2,
        "targetNickname": "普通已注册",
        "targetAvatar": "",
        "blockType": "BLACKLIST",
        "sourceScene": "PROFILE",
        "createTime": "2026-05-29 15:00:00"
      }
    ],
    "total": 1,
    "size": 20,
    "current": 1,
    "pages": 1
  }
}
```

#### 6.6.2 加入/解除黑名单

| 项目   | 说明                                      |
| ------ | ----------------------------------------- |
| Path   | `/miniapp/settings/blocks/blacklist`      |
| Method | `POST`                                    |
| Auth   | 登录态                                    |
| Body   | `targetUserId` 必填；`sourceScene` 可选   |

```json
{
  "targetUserId": 2,
  "sourceScene": "PROFILE"
}
```

| 项目       | 说明                                      |
| ---------- | ----------------------------------------- |
| Path       | `/miniapp/settings/blocks/blacklist/{id}` |
| Method     | `DELETE`                                  |
| Auth       | 登录态                                    |
| Path Param | `id` 屏蔽关系 ID                          |

#### 6.6.3 不看 TA 动态列表

| 项目   | 说明                                        |
| ------ | ------------------------------------------- |
| Path   | `/miniapp/settings/blocks/hidden-dynamics`  |
| Method | `GET`                                       |
| Auth   | 登录态                                      |
| Query  | `page` 默认 `1`；`size` 默认 `20`           |

#### 6.6.4 加入/移除不看 TA 动态

| 项目   | 说明                                        |
| ------ | ------------------------------------------- |
| Path   | `/miniapp/settings/blocks/hidden-dynamics`  |
| Method | `POST`                                      |
| Auth   | 登录态                                      |
| Body   | `targetUserId` 必填；`sourceScene` 可选     |

| 项目       | 说明                                             |
| ---------- | ------------------------------------------------ |
| Path       | `/miniapp/settings/blocks/hidden-dynamics/{id}`  |
| Method     | `DELETE`                                         |
| Auth       | 登录态                                           |
| Path Param | `id` 屏蔽关系 ID                                 |

### 6.7 个人关键词屏蔽

#### 6.7.1 关键词列表

| 项目   | 说明                                   |
| ------ | -------------------------------------- |
| Path   | `/miniapp/settings/keyword-blocks`     |
| Method | `GET`                                  |
| Auth   | 登录态                                 |
| Query  | 无                                     |

响应字段：

```json
{
  "code": 200,
  "msg": "success",
  "data": [
    {
      "id": 1,
      "keyword": "屏蔽词",
      "createTime": "2026-05-29 15:00:00"
    }
  ]
}
```

#### 6.7.2 新增/删除关键词

| 项目   | 说明                                   |
| ------ | -------------------------------------- |
| Path   | `/miniapp/settings/keyword-blocks`     |
| Method | `POST`                                 |
| Auth   | 登录态                                 |
| Body   | `keyword` 必填                         |

```json
{
  "keyword": "屏蔽词"
}
```

| 项目       | 说明                                      |
| ---------- | ----------------------------------------- |
| Path       | `/miniapp/settings/keyword-blocks/{id}`   |
| Method     | `DELETE`                                  |
| Auth       | 登录态                                    |
| Path Param | `id` 关键词 ID                            |

说明：个人关键词只保存用户自己的社区内容屏蔽规则，不用于整体拦截搜索词。

### 6.8 反馈提交

| 项目   | 说明                         |
| ------ | ---------------------------- |
| Path   | `/miniapp/feedback`          |
| Method | `POST`                       |
| Auth   | 登录态                       |
| Body   | `MiniappFeedbackSubmitReq`   |

请求示例：

```json
{
  "feedbackType": "BUG",
  "content": "页面展示异常",
  "imageUrls": [
    "https://example.com/feedback/1.png"
  ],
  "contact": "13800000000"
}
```

响应 `data` 为反馈 ID：

```json
{
  "code": 200,
  "msg": "success",
  "data": 1
}
```

### 6.9 注销申请与退出登录

#### 6.9.1 查询注销状态

| 项目   | 说明                              |
| ------ | --------------------------------- |
| Path   | `/miniapp/account/cancel-status`  |
| Method | `GET`                             |
| Auth   | 登录态                            |
| Query  | 无                                |

响应字段：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "id": 1,
    "status": "COOLING_OFF",
    "reason": "不再使用",
    "blockReason": null,
    "coolingEndTime": "2026-06-05 15:00:00",
    "coolingDays": 7
  }
}
```

#### 6.9.2 提交注销申请

| 项目   | 说明                         |
| ------ | ---------------------------- |
| Path   | `/miniapp/account/cancel`    |
| Method | `POST`                       |
| Auth   | 登录态                       |
| Body   | `confirm` 必填；`reason` 可选 |

```json
{
  "confirm": true,
  "reason": "不再使用"
}
```

响应 `data` 为注销申请 ID。

#### 6.9.3 撤销注销申请

| 项目   | 说明                              |
| ------ | --------------------------------- |
| Path   | `/miniapp/account/cancel/revoke`  |
| Method | `POST`                            |
| Auth   | 登录态                            |
| Body   | 无                                |

#### 6.9.4 退出登录

| 项目   | 说明                |
| ------ | ------------------- |
| Path   | `/miniapp/logout`   |
| Method | `POST`              |
| Auth   | 登录态              |
| Body   | 无                  |

说明：退出登录会让当前 `X-Auth-Token` 失效。

### 6.10 搜索结果聚合

| 项目   | 说明                                      |
| ------ | ----------------------------------------- |
| Path   | `/miniapp/search/results`                 |
| Method | `GET`                                     |
| Auth   | 登录态                                    |
| Query  | `keyword` 必填；`type` 默认 `all`；`page` 默认 `1`；`size` 默认 `20` |

响应字段：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "keyword": "peter",
    "type": "all",
    "tabs": [
      "all",
      "user",
      "post",
      "topic"
    ],
    "items": [
      {
        "id": 1,
        "type": "user",
        "title": "peter",
        "subtitle": "上海 示例大学",
        "avatar": ""
      }
    ],
    "hasMore": false,
    "totalCount": 1,
    "violation": false,
    "message": null
  }
}
```

说明：

- `type` 当前支持 `all`、`user`、`post`、`topic`。
- 动态和话题结果为 PRD-05 预留，未接入内容表时可返回空列表。
- 命中搜索违规词时返回 `violation=true` 与提示文案，不返回正常结果。

## 7. 枚举值说明

### 7.1 公共内容

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

### 7.2 移动端入口

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

### 7.3 搜索配置

| 字段        | 枚举值             | 说明         |
| ----------- | ------------------ | ------------ |
| `blockType` | `SEARCH_VIOLATION` | 搜索词违规   |
| `blockType` | `RESULT_BLOCK`     | 搜索结果屏蔽 |
| `matchType` | `EXACT`            | 精确匹配     |
| `matchType` | `FUZZY`            | 包含匹配     |
| `matchType` | `PREFIX`           | 前缀匹配     |

说明：搜索屏蔽词当前在 service 中提供 `validateKeyword(keyword)` 能力，但尚未暴露独立小程序 Controller 接口。

### 7.4 推广邀请

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

### 7.5 用户安全与搜索主链路

| 字段           | 枚举值             | 说明                       |
| -------------- | ------------------ | -------------------------- |
| `blockType`    | `BLACKLIST`        | 黑名单                     |
| `blockType`    | `HIDDEN_DYNAMIC`   | 不看 TA 动态               |
| `feedbackType` | `BUG`              | 问题反馈                   |
| `feedbackType` | `SUGGESTION`       | 功能建议                   |
| `feedbackType` | `REPORT`           | 举报或安全相关反馈         |
| `cancelStatus` | `NONE`             | 无注销申请                 |
| `cancelStatus` | `COOLING_OFF`      | 注销后悔期中               |
| `cancelStatus` | `REVOKED`          | 用户已撤销注销申请         |
| `cancelStatus` | `CANCELLED`        | 注销完成                   |
| `cancelStatus` | `BLOCKED`          | 存在阻断项，暂不允许注销   |
| `searchType`   | `all`              | 综合搜索                   |
| `searchType`   | `user`             | 用户搜索                   |
| `searchType`   | `post`             | 动态搜索，当前预留         |
| `searchType`   | `topic`            | 话题搜索，当前预留         |

### 7.6 通用状态

| 字段     | 枚举值     | 说明 |
| -------- | ---------- | ---- |
| `status` | `ENABLED`  | 启用 |
| `status` | `DISABLED` | 禁用 |

## 8. VIP 会员

本章节对应 PRD-04 商业化模块中的 VIP 会员能力，小程序前端通过这些接口完成套餐浏览、权益展示、VIP 状态查询和订单记录查看。**所有接口均需登录态。**

### 8.1 VIP 套餐列表

| 项目   | 说明                      |
| ------ | ------------------------- |
| Path   | `/miniapp/vip/packages`   |
| Method | `GET`                     |
| Auth   | 登录态                    |
| Query  | 无                        |

说明：只返回 `status=ENABLED` 的套餐，按 `sort_order` 升序排列。

响应字段：

```json
{
  "code": 200,
  "msg": "success",
  "data": [
    {
      "id": 1,
      "packageName": "月度会员",
      "packageType": "normal",
      "price": 29.90,
      "originPrice": 39.90,
      "durationDays": 30,
      "recommendFlag": 0,
      "packageTag": "hot"
    },
    {
      "id": 2,
      "packageName": "季度会员",
      "packageType": "normal",
      "price": 79.90,
      "originPrice": 119.70,
      "durationDays": 90,
      "recommendFlag": 1,
      "packageTag": "recommend"
    },
    {
      "id": 3,
      "packageName": "年度会员",
      "packageType": "normal",
      "price": 259.90,
      "originPrice": 478.80,
      "durationDays": 365,
      "recommendFlag": 0,
      "packageTag": "save"
    }
  ]
}
```

### 8.2 VIP 权益列表

| 项目   | 说明                      |
| ------ | ------------------------- |
| Path   | `/miniapp/vip/benefits`   |
| Method | `GET`                     |
| Auth   | 登录态                    |
| Query  | 无                        |

说明：只返回 `status=ENABLED` 的权益项，按 `display_order` 排序。

响应字段：

```json
{
  "code": 200,
  "msg": "success",
  "data": [
    {
      "id": 1,
      "benefitCode": "unlimited_view",
      "benefitName": "无限查看次数",
      "benefitType": "quota",
      "benefitDesc": "每日查看用户主页次数不限",
      "displayOrder": 1
    },
    {
      "id": 2,
      "benefitCode": "advanced_filter",
      "benefitName": "高级筛选",
      "benefitType": "exposure",
      "benefitDesc": "可按学历、城市等条件精准筛选",
      "displayOrder": 2
    },
    {
      "id": 3,
      "benefitCode": "hidden_visit",
      "benefitName": "隐藏访问记录",
      "benefitType": "privacy",
      "benefitDesc": "访问他人主页不留痕迹",
      "displayOrder": 3
    },
    {
      "id": 4,
      "benefitCode": "vip_badge",
      "benefitName": "VIP 专属标识",
      "benefitType": "exposure",
      "benefitDesc": "个人主页展示 VIP 金色标识",
      "displayOrder": 4
    }
  ]
}
```

### 8.3 VIP 状态

| 项目   | 说明                      |
| ------ | ------------------------- |
| Path   | `/miniapp/vip/status`     |
| Method | `GET`                     |
| Auth   | 登录态                    |
| Query  | 无                        |

响应字段：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "vipStatus": "active",
    "vipExpireTime": "2026-07-02 00:00:00"
  }
}
```

说明：
- `vipStatus` 取值：`inactive`（非 VIP）/ `active`（VIP 生效中）/ `expired`（已过期）。
- `vipExpireTime` 在非 VIP 状态下可能为 `null`。

### 8.4 VIP 订单记录

| 项目   | 说明                                                                     |
| ------ | ------------------------------------------------------------------------ |
| Path   | `/miniapp/vip/orders`                                                    |
| Method | `GET`                                                                    |
| Auth   | 登录态                                                                   |
| Query  | `page` 默认 `1`；`size` 默认 `10`                                        |

响应字段：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "records": [
      {
        "id": 1001,
        "orderNo": "TO2026052900000001",
        "packageName": "月度会员",
        "payAmount": 29.90,
        "orderStatus": "success",
        "successTime": "2026-05-29 15:30:00",
        "expireTime": "2026-06-28 15:30:00"
      }
    ],
    "total": 1,
    "size": 10,
    "current": 1,
    "pages": 1
  }
}
```

## 9. 成家币

本章节对应 PRD-04 商业化模块中的成家币能力。**所有接口均需登录态。**

### 9.1 成家币套餐列表

| 项目   | 说明                      |
| ------ | ------------------------- |
| Path   | `/miniapp/coin/packages`  |
| Method | `GET`                     |
| Auth   | 登录态                    |
| Query  | 无                        |

说明：只返回 `status=ENABLED` 的套餐，按 `sort_order` 升序排列。`bonusCoinCount` 为额外赠送币数。

响应字段：

```json
{
  "code": 200,
  "msg": "success",
  "data": [
    {
      "id": 1,
      "packageName": "60成家币",
      "amount": 6.00,
      "coinCount": 60,
      "bonusCoinCount": 0,
      "recommendFlag": 0,
      "packageTag": "budget",
      "packageDesc": "适合轻度使用"
    },
    {
      "id": 3,
      "packageName": "300成家币",
      "amount": 28.00,
      "coinCount": 300,
      "bonusCoinCount": 18,
      "recommendFlag": 1,
      "packageTag": "recommend",
      "packageDesc": "热销之选，赠送18币"
    },
    {
      "id": 5,
      "packageName": "1200成家币",
      "amount": 98.00,
      "coinCount": 1200,
      "bonusCoinCount": 168,
      "recommendFlag": 0,
      "packageTag": "save",
      "packageDesc": "超值之选，赠送168币"
    }
  ]
}
```

### 9.2 成家币余额

| 项目   | 说明                      |
| ------ | ------------------------- |
| Path   | `/miniapp/coin/balance`   |
| Method | `GET`                     |
| Auth   | 登录态                    |
| Query  | 无                        |

响应字段：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "coinBalance": 480
  }
}
```

### 9.3 成家币流水

| 项目   | 说明                                                                     |
| ------ | ------------------------------------------------------------------------ |
| Path   | `/miniapp/coin/flows`                                                    |
| Method | `GET`                                                                    |
| Auth   | 登录态                                                                   |
| Query  | `page` 默认 `1`；`size` 默认 `10`                                        |

响应字段：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "records": [
      {
        "id": 5001,
        "flowNo": "CF2026052900000001",
        "flowType": "recharge",
        "changeAmount": 300,
        "balanceAfter": 480,
        "bizScene": "coin_recharge",
        "bizDesc": "购买 300成家币",
        "createTime": "2026-05-29 16:00:00"
      },
      {
        "id": 5002,
        "flowNo": "CF2026052900000002",
        "flowType": "consume",
        "changeAmount": -5,
        "balanceAfter": 475,
        "bizScene": "likes_unlock",
        "bizDesc": "解锁「喜欢我的」",
        "createTime": "2026-05-29 16:30:00"
      }
    ],
    "total": 2,
    "size": 10,
    "current": 1,
    "pages": 1
  }
}
```

说明：`flowType` 为 `consume` 时 `changeAmount` 为负数；`balanceAfter` 为变动后余额。

## 10. 资产与解锁

本章节对应 PRD-04 商业化模块中的用户资产与按次解锁能力。**所有接口均需登录态。**

### 10.1 用户资产摘要

| 项目   | 说明                        |
| ------ | --------------------------- |
| Path   | `/miniapp/asset/summary`    |
| Method | `GET`                       |
| Auth   | 登录态                      |
| Query  | 无                          |

响应字段：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "vipStatus": "active",
    "vipExpireTime": "2026-07-02 00:00:00",
    "coinBalance": 475,
    "todayFreeWhisperRemain": 3,
    "totalRecharge": 126.00
  }
}
```

说明：`todayFreeWhisperRemain` 为今日免费悄悄话剩余次数（VIP 权益之一）。

### 10.2 统一解锁

| 项目   | 说明                        |
| ------ | --------------------------- |
| Path   | `/miniapp/asset/unlock`     |
| Method | `POST`                      |
| Auth   | 登录态                      |
| Body   | `UnlockReq`                 |

请求字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `unlockScene` | String | 是 | 解锁场景：`likes`/`viewers`/`ideal_user`/`featured_profile` |
| `targetUserIds` | List\<Long\> | 是 | 目标用户 ID 列表。`ideal_user` 场景单次最多 5 个 |

请求示例（批量解锁理想型）：

```json
{
  "unlockScene": "ideal_user",
  "targetUserIds": [1002, 1003, 1004]
}
```

响应字段：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "unlockedCount": 3,
    "coinCost": 12
  }
}
```

说明：
- 系统根据 `unlockScene` 查询对应单价，计算总消耗后从 `coin_balance` 扣减。
- 余额不足时返回业务错误（`code=5001`），不扣币。
- 解锁保留期：`likes`/`viewers` 永久有效；`ideal_user` 默认 90 天；`featured_profile` 默认 3 天（后台可配）。

### 10.3 解锁记录

| 项目   | 说明                                                                     |
| ------ | ------------------------------------------------------------------------ |
| Path   | `/miniapp/asset/unlock-records`                                          |
| Method | `GET`                                                                    |
| Auth   | 登录态                                                                   |
| Query  | `page` 默认 `1`；`size` 默认 `10`                                        |

响应字段：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "records": [
      {
        "id": 2001,
        "unlockScene": "likes",
        "unlockMethod": "coin",
        "coinCost": 3,
        "effectiveTime": "2026-05-29 16:30:00",
        "expireTime": null,
        "status": "active"
      },
      {
        "id": 2002,
        "unlockScene": "ideal_user",
        "unlockMethod": "coin",
        "coinCost": 4,
        "effectiveTime": "2026-05-29 17:00:00",
        "expireTime": "2026-08-27 17:00:00",
        "status": "active"
      }
    ],
    "total": 2,
    "size": 10,
    "current": 1,
    "pages": 1
  }
}
```

说明：
- `unlockMethod`：`vip`（VIP 免费解锁）/ `coin`（成家币解锁）。
- `expireTime` 为 `null` 时表示永久有效。
- `status`：`active`（生效中）/ `expired`（已过期）。

## 11. 支付

本章节对应 PRD-04 商业化模块中的支付能力。首版使用**模拟支付**，不接真实微信支付。**所有接口均需登录态。**

### 11.1 创建订单

| 项目   | 说明                              |
| ------ | --------------------------------- |
| Path   | `/miniapp/payment/create-order`   |
| Method | `POST`                            |
| Auth   | 登录态                            |
| Body   | `CreateOrderReq`                  |

请求字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `orderType` | String | 是 | `vip` 或 `coin` |
| `packageId` | Long | 是 | 套餐 ID |

请求示例（购买 VIP 套餐）：

```json
{
  "orderType": "vip",
  "packageId": 1
}
```

请求示例（充值成家币）：

```json
{
  "orderType": "coin",
  "packageId": 3
}
```

响应字段：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "orderId": 1001,
    "orderNo": "TO2026052900000001"
  }
}
```

说明：订单创建后初始状态为 `unpaid`（待支付）。`orderNo` 为系统生成的唯一订单号。

### 11.2 模拟支付

| 项目       | 说明                              |
| ---------- | --------------------------------- |
| Path       | `/miniapp/payment/mock-pay/{orderId}` |
| Method     | `POST`                            |
| Auth       | 登录态                            |
| Path Param | `orderId` 订单 ID                 |
| Body       | 无                                |

说明：
- 仅支持状态为 `unpaid` 的订单，已支付订单幂等返回当前状态。
- 支付处理在事务内完成：更新订单状态 → 更新用户资产 → 记录流水。

响应字段（VIP 订单支付成功）：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "orderNo": "TO2026052900000001",
    "orderStatus": "success",
    "vipExpireTime": "2026-06-28 15:30:00",
    "coinBalance": null
  }
}
```

响应字段（成家币订单支付成功）：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "orderNo": "TO2026052900000002",
    "orderStatus": "success",
    "vipExpireTime": null,
    "coinBalance": 780
  }
}
```

## 12. 社区互动

本章节对应 PRD-05 推荐模块中的社区互动能力，覆盖社区动态/诚意贴、评论、点赞、关注、举报主链路。**发布/评论/点赞/关注/举报接口需登录态；列表和详情接口兼容未登录状态（此时点赞/关注状态返回 false）。**

### 12.1 社区内容列表

| 项目   | 说明                                                                                   |
| ------ | -------------------------------------------------------------------------------------- |
| Path   | `/miniapp/community/posts`                                                             |
| Method | `GET`                                                                                  |
| Auth   | 按需登录（未登录时仍可浏览已审核通过内容，但 `liked`/`followingAuthor` 始终为 `false`） |
| Query  | `postType` 可选（`community`/`sincere_post`）；`topicId` 可选；`page` 默认 `1`；`size` 默认 `10` |

响应字段：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "records": [
      {
        "id": 100,
        "authorId": 1,
        "authorName": "peter",
        "authorAvatar": "",
        "postType": "community",
        "title": null,
        "content": "周末露营，天气真好 ☀️",
        "imageUrls": ["https://cdn.example.com/img/001.png"],
        "topicId": 10,
        "topicName": "露营",
        "likeCount": 5,
        "commentCount": 2,
        "reportCount": 0,
        "liked": true,
        "followingAuthor": false,
        "status": "PUBLISHED",
        "auditStatus": "APPROVED",
        "createTime": "2026-05-29 18:00:00"
      }
    ],
    "total": 1,
    "size": 10,
    "current": 1,
    "pages": 1
  }
}
```

说明：
- 默认只返回 `status=PUBLISHED` 且 `audit_status=APPROVED` 的内容。
- `postType=community` 为普通社区动态，`sincere_post` 为诚意贴（带标题、更长正文、支持联系方式）。

### 12.2 内容详情

| 项目       | 说明                              |
| ---------- | --------------------------------- |
| Path       | `/miniapp/community/posts/{id}`    |
| Method     | `GET`                             |
| Auth       | 按需登录                          |
| Path Param | `id` 内容 ID                      |

响应字段：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "id": 100,
    "authorId": 1,
    "authorName": "peter",
    "authorAvatar": "",
    "postType": "sincere_post",
    "title": "真诚交友，期待相遇",
    "content": "98年，上海读研，喜欢旅行和摄影。希望找到志同道合的朋友一起探索城市～",
    "imageUrls": ["https://cdn.example.com/img/002.png", "https://cdn.example.com/img/003.png"],
    "topicId": 10,
    "topicName": "露营",
    "mentionUserIds": [2, 3],
    "likeCount": 12,
    "commentCount": 3,
    "reportCount": 0,
    "liked": false,
    "followingAuthor": true,
    "status": "PUBLISHED",
    "auditStatus": "APPROVED",
    "auditRemark": null,
    "createTime": "2026-05-28 20:00:00"
  }
}
```

说明：详情接口与列表卡片相比多了 `mentionUserIds`（@提及的用户 ID 列表）和 `auditRemark`（审核备注）。

### 12.3 发布内容

| 项目   | 说明                      |
| ------ | ------------------------- |
| Path   | `/miniapp/community/posts` |
| Method | `POST`                    |
| Auth   | 登录态                    |
| Body   | `CommunityPostCreateReq`  |

请求字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `postType` | String | 是 | `community` 或 `sincere_post` |
| `title` | String | 否 | 诚意贴标题（`sincere_post` 时必填） |
| `content` | String | 是 | 正文内容 |
| `imageUrls` | List\<String\> | 否 | 图片 URL 列表，数量受 `community.post_max_images` 限制 |
| `topicId` | Long | 是 | 话题字典数据 ID |
| `mentionUserIds` | List\<Long\> | 否 | @提及的用户 ID 列表，数量受 `community.post_max_mentions` 限制 |

请求示例（发布普通社区动态）：

```json
{
  "postType": "community",
  "content": "周末露营，天气真好 ☀️",
  "imageUrls": ["https://cdn.example.com/img/001.png"],
  "topicId": 10,
  "mentionUserIds": [2, 3]
}
```

请求示例（发布诚意贴）：

```json
{
  "postType": "sincere_post",
  "title": "真诚交友，期待相遇",
  "content": "98年，上海读研，喜欢旅行和摄影。希望找到志同道合的朋友一起探索城市～",
  "imageUrls": [],
  "topicId": 10,
  "mentionUserIds": []
}
```

响应 `data` 为新建内容 ID：

```json
{
  "code": 200,
  "msg": "success",
  "data": 100
}
```

说明：
- 发布后默认 `status=PENDING`，`audit_status=PENDING`，需后台审核通过后才公开展示。
- 诚意贴正文长度需 ≥ `community.sincere_post_min_text_length`（默认 20 字），否则返回参数错误。
- 图片数量超过上限时返回参数错误。
- 通过准入校验（`community.interaction_gate_mode`）判断用户是否有发布权限，当前默认 `LOGIN_ONLY`。

### 12.4 删除内容

| 项目       | 说明                            |
| ---------- | ------------------------------- |
| Path       | `/miniapp/community/posts/{id}`  |
| Method     | `DELETE`                        |
| Auth       | 登录态                          |
| Path Param | `id` 内容 ID                    |

响应：

```json
{
  "code": 200,
  "msg": "success"
}
```

说明：
- 仅内容作者可删除自己的内容。
- 删除后将 `status` 设为 `DELETED`，`deleted_by_user=1`（逻辑删除）。
- 若内容已被管理员 `BLOCKED`，用户删除会覆盖该状态（已知限制，后续迭代优化）。

### 12.5 评论列表

| 项目       | 说明                                                                     |
| ---------- | ------------------------------------------------------------------------ |
| Path       | `/miniapp/community/posts/{id}/comments`                                  |
| Method     | `GET`                                                                    |
| Auth       | 按需登录                                                                 |
| Path Param | `id` 内容 ID                                                             |
| Query      | `page` 默认 `1`；`size` 默认 `10`                                        |

响应字段：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "records": [
      {
        "id": 5001,
        "postId": 100,
        "authorId": 2,
        "authorName": "普通已注册",
        "authorAvatar": "",
        "parentCommentId": null,
        "replyUserId": null,
        "replyUserName": null,
        "content": "拍得真好！",
        "status": "PUBLISHED",
        "auditStatus": "APPROVED",
        "createTime": "2026-05-29 18:30:00"
      },
      {
        "id": 5002,
        "postId": 100,
        "authorId": 1,
        "authorName": "peter",
        "authorAvatar": "",
        "parentCommentId": 5001,
        "replyUserId": 2,
        "replyUserName": "普通已注册",
        "content": "谢谢！",
        "status": "PUBLISHED",
        "auditStatus": "APPROVED",
        "createTime": "2026-05-29 18:35:00"
      }
    ],
    "total": 2,
    "size": 10,
    "current": 1,
    "pages": 1
  }
}
```

说明：
- `parentCommentId` 非 null 表示该评论是对另一条评论的回复（楼中楼）。
- `replyUserId`/`replyUserName` 为被回复的父评论作者信息。

### 12.6 发表评论

| 项目   | 说明                           |
| ------ | ------------------------------ |
| Path   | `/miniapp/community/comments`   |
| Method | `POST`                         |
| Auth   | 登录态                         |
| Body   | `CommunityCommentCreateReq`    |

请求字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `postId` | Long | 是 | 所属内容 ID |
| `parentCommentId` | Long | 否 | 父评论 ID（回复某条评论时传入） |
| `replyUserId` | Long | 否 | 被回复用户 ID |
| `content` | String | 是 | 评论内容 |

请求示例（直接评论动态）：

```json
{
  "postId": 100,
  "content": "拍得真好！"
}
```

请求示例（回复某条评论）：

```json
{
  "postId": 100,
  "parentCommentId": 5001,
  "replyUserId": 2,
  "content": "谢谢！"
}
```

响应 `data` 为新建评论 ID：

```json
{
  "code": 200,
  "msg": "success",
  "data": 5001
}
```

说明：评论发布后默认 `status=PUBLISHED`，`audit_status=PENDING`（待后台审核）。

### 12.7 删除评论

| 项目       | 说明                                |
| ---------- | ----------------------------------- |
| Path       | `/miniapp/community/comments/{id}`   |
| Method     | `DELETE`                            |
| Auth       | 登录态                              |
| Path Param | `id` 评论 ID                        |

响应：

```json
{
  "code": 200,
  "msg": "success"
}
```

说明：仅评论作者可删除自己的评论。删除后 `status=DELETED`。

### 12.8 点赞/取消点赞

| 项目       | 说明                                  |
| ---------- | ------------------------------------- |
| Path       | `/miniapp/community/posts/{id}/like`   |
| Method     | `POST`                                |
| Auth       | 登录态                                |
| Path Param | `id` 内容 ID                          |
| Body       | 无                                    |

说明：Toggle 模式——已点赞则取消，未点赞则点赞。

响应字段：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "liked": true,
    "likeCount": 13
  }
}
```

### 12.9 关注/取消关注

| 项目       | 说明                                         |
| ---------- | -------------------------------------------- |
| Path       | `/miniapp/community/follows/{targetUserId}`   |
| Method     | `POST`                                       |
| Auth       | 登录态                                       |
| Path Param | `targetUserId` 被关注用户 ID                 |
| Body       | 无                                           |

说明：Toggle 模式——已关注则取消，未关注则关注。

响应字段：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "following": true
  }
}
```

### 12.10 发起举报

| 项目   | 说明                         |
| ------ | ---------------------------- |
| Path   | `/miniapp/community/reports`  |
| Method | `POST`                       |
| Auth   | 登录态                       |
| Body   | `CommunityReportCreateReq`   |

请求字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `targetType` | String | 是 | 举报目标类型：`post`/`comment`/`user` |
| `targetId` | Long | 是 | 举报目标 ID |
| `reasonCode` | String | 是 | 举报原因编码（对应 `community_report_reason` 字典值） |
| `extraText` | String | 否 | 补充说明 |

请求示例：

```json
{
  "targetType": "post",
  "targetId": 100,
  "reasonCode": "spam",
  "extraText": "该内容存在广告引流行为"
}
```

响应 `data` 为新建举报单 ID：

```json
{
  "code": 200,
  "msg": "success",
  "data": 3001
}
```

说明：
- 举报提交后默认 `status=PENDING`，需后台管理员处理。
- 同一用户可对同一目标重复举报（当前版本无去重校验，后续迭代优化）。

### 12.11 社区公共配置

| 项目   | 说明                       |
| ------ | -------------------------- |
| Path   | `/miniapp/community/config` |
| Method | `GET`                      |
| Auth   | 登录态                     |
| Query  | 无                         |

说明：返回社区相关的公共配置项（从 `app_config` 读取）和社区首页 Tab 入口配置。

响应字段：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "interactionGateMode": "LOGIN_ONLY",
    "postMaxImages": 9,
    "postMaxTextLength": 500,
    "postMaxMentions": 5,
    "sincerePostMinTextLength": 20,
    "contactInfoAllowed": false,
    "reportEntryEnabled": true,
    "homeTabs": [
      {
        "entryKey": "following",
        "entryName": "关注",
        "icon": "heart",
        "jumpType": "NONE",
        "jumpTarget": "",
        "badgeType": "NONE",
        "loginRequired": 1,
        "sort": 10
      },
      {
        "entryKey": "city",
        "entryName": "同城",
        "icon": "map-pin",
        "jumpType": "NONE",
        "jumpTarget": "",
        "badgeType": "NONE",
        "loginRequired": 1,
        "sort": 20
      },
      {
        "entryKey": "discover",
        "entryName": "发现",
        "icon": "compass",
        "jumpType": "NONE",
        "jumpTarget": "",
        "badgeType": "NONE",
        "loginRequired": 1,
        "sort": 30
      }
    ]
  }
}
```

说明：
- `interactionGateMode` 取值：`LOGIN_ONLY`（仅需登录）/ `FULL_CERT`（需三项认证，依赖 PRD-01）。
- `homeTabs` 来自 `mobile_entry_config` 中 `pageCode=COMMUNITY_HOME_TAB` 的入口配置。

## 13. 商业化枚举值说明

### 13.1 VIP

| 字段 | 枚举值 | 说明 |
| --- | --- | --- |
| `vipStatus` | `inactive` | 非 VIP |
| `vipStatus` | `active` | VIP 生效中 |
| `vipStatus` | `expired` | VIP 已过期 |
| `packageType` | `normal` | 普通购买套餐 |
| `packageType` | `subscribe` | 连续订阅套餐（预留） |
| `benefitType` | `quota` | 配额类权益（次数增加） |
| `benefitType` | `unlock` | 解锁类权益（免费查看） |
| `benefitType` | `exposure` | 曝光类权益（优先展示/VIP标识） |
| `benefitType` | `privacy` | 隐私类权益（隐藏访问） |
| `benefitType` | `message` | 消息类权益（私语次数） |
| `packageTag` | `hot` | 热销 |
| `packageTag` | `recommend` | 推荐 |
| `packageTag` | `save` | 省钱/超值 |
| `packageTag` | `budget` | 低价特惠 |
| `packageTag` | `first_choice` | 最多人选 |
| `packageTag` | `most_popular` | 精选 |
| `packageTag` | `most_save` | 节省最多 |

### 13.2 成家币

| 字段 | 枚举值 | 说明 |
| --- | --- | --- |
| `flowType` | `recharge` | 充值入账 |
| `flowType` | `consume` | 消费扣减 |
| `flowType` | `gift` | 赠送入账 |
| `flowType` | `refund` | 退款退回 |
| `bizScene` | `coin_recharge` | 成家币充值 |
| `bizScene` | `vip_purchase` | VIP 购买 |
| `bizScene` | `whisper` | 私语消费 |
| `bizScene` | `likes_unlock` | 解锁「喜欢我的」 |
| `bizScene` | `viewers_unlock` | 解锁「看过我的」 |
| `bizScene` | `ideal_unlock` | 解锁「理想型」 |
| `bizScene` | `featured_unlock` | 解锁「精选主页」 |
| `bizScene` | `promotion_reward` | 推广裂变奖励 |
| `bizScene` | `refund_return` | 退款退回 |

### 13.3 支付与订单

| 字段 | 枚举值 | 说明 |
| --- | --- | --- |
| `orderType` | `vip` | VIP 会员订单 |
| `orderType` | `coin` | 成家币充值订单 |
| `orderStatus` | `unpaid` | 待支付 |
| `orderStatus` | `success` | 支付成功 |
| `orderStatus` | `closed` | 已关闭 |
| `orderStatus` | `failed` | 支付失败 |
| `orderStatus` | `refunding` | 退款处理中 |
| `orderStatus` | `refunded` | 已退款 |

### 13.4 解锁

| 字段 | 枚举值 | 说明 |
| --- | --- | --- |
| `unlockScene` | `likes` | 喜欢我的 |
| `unlockScene` | `viewers` | 看过我的 |
| `unlockScene` | `ideal_user` | 理想型用户 |
| `unlockScene` | `featured_profile` | 精选主页 |
| `unlockMethod` | `vip` | VIP 免费解锁 |
| `unlockMethod` | `coin` | 成家币解锁 |
| `status` | `active` | 生效中 |
| `status` | `expired` | 已过期 |

## 14. 社区互动枚举值说明

### 14.1 社区内容

| 字段 | 枚举值 | 说明 |
| --- | --- | --- |
| `postType` | `community` | 普通社区动态 |
| `postType` | `sincere_post` | 诚意贴 |
| `status` | `PENDING` | 待发布（审核中） |
| `status` | `PUBLISHED` | 已发布 |
| `status` | `REJECTED` | 审核驳回 |
| `status` | `DELETED` | 用户已删除 |
| `status` | `BLOCKED` | 管理员屏蔽 |
| `auditStatus` | `PENDING` | 待审核 |
| `auditStatus` | `APPROVED` | 审核通过 |
| `auditStatus` | `REJECTED` | 审核驳回 |

### 14.2 举报

| 字段 | 枚举值 | 说明 |
| --- | --- | --- |
| `targetType` | `post` | 举报动态 |
| `targetType` | `comment` | 举报评论 |
| `targetType` | `user` | 举报用户 |
| `status` | `PENDING` | 待处理 |
| `status` | `RESOLVED` | 已处理 |
| `status` | `REJECTED` | 已驳回 |
| `handleAction` | `DISMISS` | 驳回举报 |
| `handleAction` | `BLOCK_POST` | 下架动态 |
| `handleAction` | `BLOCK_COMMENT` | 屏蔽评论 |
| `handleAction` | `WARN_USER` | 警告用户 |

### 14.3 关注

| 字段 | 枚举值 | 说明 |
| --- | --- | --- |
| `status` | `FOLLOW` | 已关注 |
| `status` | `UNFOLLOW` | 已取消关注 |

### 14.4 准入模式

| 字段 | 枚举值 | 说明 |
| --- | --- | --- |
| `interactionGateMode` | `LOGIN_ONLY` | 仅需登录（当前默认，PRD-01 未落地时的降级模式） |
| `interactionGateMode` | `FULL_CERT` | 需三项认证全部通过（依赖 PRD-01 认证模块）
