# PRD-06 用户安全设置与搜索主链路技术方案设计

> 日期：2026-05-29
> 关联需求：
>
> - `docs/需求文档/移动端/细化PRD-06_认证与安全设置、我的页与搜索.md`
> - `docs/需求文档/管理后台/管理后台细化PRD-06_认证与安全设置、我的页与搜索.md`
> - `docs/技术方案/2026-05-28-公共内容配置-tcdesign.md`
> - `docs/技术方案/2026-05-22-推广裂变与邀请奖励-tcdesign.md` §10.1 / §10.2

## 1. 背景与目标

PRD-06 第一阶段“公共内容与移动端配置”已经落地，覆盖公告/帮助/协议、安全内容、我的页入口、设置页入口、搜索热词、搜索违规词、搜索展示配置等底座能力。

本方案定义 PRD-06 第二阶段，补齐用户侧可写与可查询的主链路能力：

1. 我的页聚合接口：用户资料摘要、认证状态、资产占位、入口配置聚合。
2. 认证中心聚合接口：承接 PRD-01 的三项认证状态展示，不重复实现认证提交/审核。
3. 隐私设置、通知设置、账号安全设置。
4. 黑名单、不看 TA 动态、个人关键词屏蔽。
5. 反馈箱提交与后台查看/跟进。
6. 注销申请、后悔期恢复、注销状态查询。
7. 搜索结果聚合接口：用户/动态/话题三类结果的首版轻量查询框架。
8. 后台用户详情增加 PRD-06 排查 Tab：隐私设置、屏蔽关系、关键词、通知设置、反馈、注销。

成功标准：

1. 小程序端可通过 `/miniapp/profile/**`、`/miniapp/settings/**`、`/miniapp/search/results` 完成 PRD-06 第二阶段核心交互。
2. 管理后台可查询用户隐私/通知/屏蔽/反馈/注销状态，用于客服和运营排查。
3. 个人关键词屏蔽与搜索违规词职责分离：个人关键词只影响社区动态/评论展示；搜索违规词继续复用第一阶段 `search_block_word`。
4. 方案明确 PRD-07 推广联动点：资料完成、三项认证完成事件由 PRD-01/用户资料模块触发，本模块只聚合展示，不重复触发。

## 2. 范围

| 模块         | 是否涉及 | 说明                                                                 |
| ------------ | -------- | -------------------------------------------------------------------- |
| 管理后台前端 | 是       | 用户详情补充 PRD-06 Tab；新增反馈箱、注销申请轻量页面或挂靠用户详情 |
| 管理后台后端 | 是       | 用户设置/屏蔽/反馈/注销查询接口；敏感操作审计                        |
| 小程序后端   | 是       | 我的页、认证中心、隐私/通知/屏蔽、反馈、注销、搜索结果接口           |
| 小程序前端   | 否       | 本仓库不包含，输出接口契约                                           |
| 数据库       | 是       | 新增用户设置、屏蔽关系、反馈、注销、搜索日志等表                     |
| 算法/第三方  | 否       | 不做推荐算法，不接第三方实名/短信/搜索引擎                           |

### 2.1 复用已完成能力

| 已完成能力       | 承接方式                                                                 |
| ---------------- | ------------------------------------------------------------------------ |
| 公告/帮助/协议   | 复用 `content_article` 与 `/miniapp/content/**`                           |
| 我的页/设置页入口 | 复用 `mobile_entry_config` 与 `/miniapp/mobile-config/entries`             |
| 搜索热词         | 复用 `search_hot_word` 与 `/miniapp/search/hot-words`                     |
| 搜索违规词       | 复用 `search_block_word` 与 `MiniappSearchConfigService.validateKeyword` |
| 应用配置         | 复用 `app_config`                                                         |
| 操作审计         | 复用 `content_operation_log` 或新增用户安全审计后再统一查询               |
| RBAC/菜单权限    | 复用已落地 `sys_menu` / `@RequirePermission`                              |

### 2.2 本阶段不做

| 不做项                       | 原因                                                   | 后续承接                  |
| ---------------------------- | ------------------------------------------------------ | ------------------------- |
| 三项认证提交/审核/状态机     | 属于 PRD-01                                           | PRD-01 技术方案与实现     |
| 手机号短信换绑真实验证码     | 依赖短信服务商资料                                    | 第三方短信接入后补        |
| 微信重新授权真实链路         | 依赖小程序登录授权能力                                | 小程序登录模块            |
| 成家币/VIP 真实资产计算      | 属于 PRD-04                                           | 商业化模块                |
| 通知中心消息生产与红点计算   | 属于 PRD-03                                           | 消息通知模块              |
| 社区动态/话题真实全文搜索    | 依赖 PRD-05 社区内容表                                | PRD-05 后续接入           |
| 推荐排序、精选/理想型策略    | 属于 PRD-08                                           | 推荐算法模块              |
| 账号注销物理清除定时任务     | 涉及合规、备份、全表数据生命周期，首版只记录状态       | 上线前合规方案            |
| 完整客服工单系统             | PRD 本期仅要求反馈提交与后台查看/跟进                 | 后续客服工单二期          |

## 3. 关键决策与待确认项

| 类型   | 内容                         | 决策/状态                                                                 | 来源 |
| ------ | ---------------------------- | ------------------------------------------------------------------------- | ---- |
| 已确认 | 搜索排序口径                 | 首版 `综合相关度 + 后台基础排序`，不接推荐算法                            | PRD-06 |
| 已确认 | 历史搜索记录                 | 小程序本地账号维度保存最近 10 条，后端仅可选记录搜索日志                  | PRD-06 |
| 已确认 | 关键词屏蔽作用范围           | 仅作用于社区动态与评论，不作用于私信、系统通知、搜索结果                  | PRD-06 |
| 已确认 | 只接受异性互动作用范围       | 只约束成家关系链与推荐展示，不影响公开社区浏览                            | PRD-06 |
| 已确认 | 注销前校验                   | 至少校验处罚、未完成退款、付费争议、未到期 VIP                            | PRD-06 |
| 本次固化 | 用户设置建表方式             | `app_user_privacy_setting`、`app_user_notification_setting` 分表，避免 JSON 黑盒 | 技术设计 |
| 本次固化 | 屏蔽关系建表方式             | 黑名单与不看 TA 动态共用 `app_user_relation_block`，用 `block_type` 区分  | 技术设计 |
| 本次固化 | 搜索结果接口首版数据来源     | 用户结果先基于用户基础表；动态/话题结果接口先定义契约，待 PRD-05 表落地后接入 | 代码现状 |
| 待联动 | 小程序用户基础表             | 当前代码尚未落 `app_user/app_user_auth`；本方案按表存在设计，实施前需与 PRD-01 对齐 | 代码现状 |
| 待联动 | PRD-03/04 数据               | 通知红点、VIP、成家币余额只做占位或透传，真实值待对应模块提供             | 代码现状 |

## 4. 总体架构与调用链

```text
小程序端
  → /miniapp/profile/** /miniapp/settings/** /miniapp/search/results
  → Miniapp Profile/Setting/Search Controller
  → Miniapp Service
  → common DAO
  → MySQL

管理后台
  → frontend/src/api/userSafety.ts
  → /admin/user-security/**
  → Admin UserSecurityController / FeedbackController
  → Admin Service
  → common DAO
  → MySQL
```

分层约束：

1. `admin/` 与 `miniapp/` 不互相 import。
2. 设置、屏蔽、反馈、注销 Entity/DAO/Mapper 放 `common/`。
3. Controller 精确返回 `R<T>`。
4. 管理后台接口必须加 `@RequirePermission`。
5. 小程序接口除搜索热词/公共内容外均需要 `X-Auth-Token`，通过 `miniapp:token:` 用户上下文取 `userId`。

## 5. 后端设计

### 5.1 小程序接口清单

| 功能               | URL                                         | Method | 登录 | 入参                         | 出参                              | 备注 |
| ------------------ | ------------------------------------------- | ------ | ---- | ---------------------------- | --------------------------------- | ---- |
| 我的页聚合         | `/miniapp/profile/home`                     | GET    | 是   | 无                           | `MiniappProfileHomeVO`            | 聚合用户摘要、认证状态、入口 |
| 认证中心聚合       | `/miniapp/profile/certification-center`     | GET    | 是   | 无                           | `MiniappCertificationCenterVO`    | 承接 PRD-01 状态 |
| 设置页聚合         | `/miniapp/settings/home`                    | GET    | 是   | 无                           | `MiniappSettingsHomeVO`           | 入口 + 账号绑定状态 |
| 隐私设置详情       | `/miniapp/settings/privacy`                 | GET    | 是   | 无                           | `MiniappPrivacySettingVO`         | 没有记录时按默认值初始化 |
| 保存隐私设置       | `/miniapp/settings/privacy`                 | PUT    | 是   | `MiniappPrivacySettingReq`   | `Void`                            | 写设置审计 |
| 通知设置详情       | `/miniapp/settings/notifications`           | GET    | 是   | 无                           | `MiniappNotificationSettingVO`    | 按 PRD-03 类型预留 |
| 保存通知设置       | `/miniapp/settings/notifications`           | PUT    | 是   | `MiniappNotificationSettingReq` | `Void`                          | 不直接生成/删除通知 |
| 黑名单列表         | `/miniapp/settings/blocks/blacklist`        | GET    | 是   | `page,size`                  | `Page<MiniappBlockedUserVO>`      | |
| 加入黑名单         | `/miniapp/settings/blocks/blacklist`        | POST   | 是   | `targetUserId, sourceScene`  | `Long`                            | 幂等 |
| 解除黑名单         | `/miniapp/settings/blocks/blacklist/{id}`   | DELETE | 是   | `id`                         | `Void`                            | 不恢复历史关系 |
| 不看 TA 动态列表   | `/miniapp/settings/blocks/hidden-dynamics`  | GET    | 是   | `page,size`                  | `Page<MiniappBlockedUserVO>`      | |
| 加入不看 TA 动态   | `/miniapp/settings/blocks/hidden-dynamics`  | POST   | 是   | `targetUserId, sourceScene`  | `Long`                            | |
| 移除不看 TA 动态   | `/miniapp/settings/blocks/hidden-dynamics/{id}` | DELETE | 是 | `id`                         | `Void`                            | |
| 个人关键词列表     | `/miniapp/settings/keyword-blocks`          | GET    | 是   | 无                           | `List<MiniappUserKeywordVO>`      | |
| 保存个人关键词     | `/miniapp/settings/keyword-blocks`          | POST   | 是   | `keyword`                    | `Long`                            | 校验数量/长度 |
| 删除个人关键词     | `/miniapp/settings/keyword-blocks/{id}`     | DELETE | 是   | `id`                         | `Void`                            | |
| 提交反馈           | `/miniapp/feedback`                         | POST   | 是   | `MiniappFeedbackSubmitReq`   | `Long`                            | 支持截图 URL 列表 |
| 注销状态           | `/miniapp/account/cancel-status`            | GET    | 是   | 无                           | `MiniappAccountCancelStatusVO`    | |
| 提交注销申请       | `/miniapp/account/cancel`                   | POST   | 是   | `confirm, reason`            | `Long`                            | 进入后悔期 |
| 撤销注销申请       | `/miniapp/account/cancel/revoke`            | POST   | 是   | 无                           | `Void`                            | 后悔期内 |
| 退出登录           | `/miniapp/logout`                           | POST   | 是   | 无                           | `Void`                            | 删除 `miniapp:token:` |
| 搜索结果聚合       | `/miniapp/search/results`                   | GET    | 是   | `keyword,type,page,size`     | `MiniappSearchResultPageVO`       | 命中违规词直接返回提示 |

### 5.2 管理后台接口清单

| 功能                 | URL                                              | Method | 权限码                         | 入参                         | 出参                              |
| -------------------- | ------------------------------------------------ | ------ | ------------------------------ | ---------------------------- | --------------------------------- |
| 用户安全摘要         | `/admin/user-security/users/{userId}/summary`    | GET    | `user:security:view`           | `userId`                     | `AdminUserSecuritySummaryVO`      |
| 用户隐私设置         | `/admin/user-security/users/{userId}/privacy`    | GET    | `user:security:view`           | `userId`                     | `AdminPrivacySettingVO`           |
| 用户通知设置         | `/admin/user-security/users/{userId}/notifications` | GET | `user:security:view`           | `userId`                     | `AdminNotificationSettingVO`      |
| 用户黑名单记录       | `/admin/user-security/users/{userId}/blacklist`  | GET    | `user:security:view`           | `page,size`                  | `Page<AdminRelationBlockVO>`      |
| 用户动态屏蔽记录     | `/admin/user-security/users/{userId}/hidden-dynamics` | GET | `user:security:view`        | `page,size`                  | `Page<AdminRelationBlockVO>`      |
| 用户关键词屏蔽记录   | `/admin/user-security/users/{userId}/keyword-blocks` | GET | `user:security:view`        | 无                           | `List<AdminUserKeywordVO>`        |
| 反馈列表             | `/admin/user-security/feedback/list`             | GET    | `user:feedback:list`           | `FeedbackPageReq`            | `Page<AdminFeedbackVO>`           |
| 反馈详情             | `/admin/user-security/feedback/{id}`             | GET    | `user:feedback:list`           | `id`                         | `AdminFeedbackVO`                 |
| 更新反馈状态         | `/admin/user-security/feedback/{id}/status`      | PUT    | `user:feedback:handle`         | `status, remark`             | `Void`                            |
| 注销申请列表         | `/admin/user-security/cancel-requests/list`      | GET    | `user:cancel:list`             | `CancelRequestPageReq`       | `Page<AdminCancelRequestVO>`      |
| 注销申请详情         | `/admin/user-security/cancel-requests/{id}`      | GET    | `user:cancel:list`             | `id`                         | `AdminCancelRequestVO`            |
| 标记注销阻断/备注    | `/admin/user-security/cancel-requests/{id}/remark` | PUT  | `user:cancel:handle`           | `remark, blockReason`        | `Void`                            |

说明：

1. 本期后台不代用户修改隐私/通知/黑名单等敏感设置，只提供查询与客服排查。
2. 若后续要求后台代操作，需新增超级管理员权限和二次确认。

### 5.3 DTO/VO 核心字段

| 对象 | 字段 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- | ---- |
| `MiniappProfileHomeVO` | userId/nickname/avatar/gender/age/school/city | 基础类型 | 是 | 用户卡片 |
| | profileCompletion | Integer | 是 | 资料完成度，PRD-01/资料模块计算 |
| | realNameStatus/avatarStatus/educationStatus | String | 是 | 三项认证状态 |
| | vipStatus/coinBalance | String/Decimal | 否 | PRD-04 提供前可为空 |
| | entries | List\<MiniappEntryConfigVO\> | 是 | 复用入口配置 |
| `MiniappPrivacySettingReq` | showDistance/hideActiveTime/showMaritalStatus/profileUpdateVisible/onlyOppositeInteraction/personalizedPush/matchChatHint/smartReply | Boolean | 否 | 未传字段保持原值 |
| `MiniappNotificationSettingReq` | interaction/community/dailyRecommend/appExit/matchSuccess/chat/whisper/certification/report/asset/bannerInApp | Boolean | 否 | 按 PRD-03 类型预留 |
| `MiniappFeedbackSubmitReq` | feedbackType/content/imageUrls/contact | String/List | 是/否 | content 必填，图片最多 9 张 |
| `MiniappSearchResultPageVO` | keyword/type/tabs/items/hasMore/violation/message | 复合类型 | 是 | type=all/user/post/topic |

## 6. 数据库设计

### 6.1 新增表清单

| 表名 | 用途 |
| ---- | ---- |
| `app_user_privacy_setting` | 用户隐私与个性化开关 |
| `app_user_notification_setting` | 用户通知开关 |
| `app_user_relation_block` | 黑名单、不看 TA 动态 |
| `app_user_keyword_block` | 个人关键词屏蔽 |
| `app_user_feedback` | 用户反馈箱 |
| `app_user_cancel_request` | 注销申请与后悔期 |
| `app_user_search_log` | 搜索日志，便于后台排查与后续热词分析 |
| `app_user_security_audit_log` | 用户安全设置审计 |

### 6.2 表结构草案

```sql
CREATE TABLE IF NOT EXISTS app_user_privacy_setting (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '小程序用户ID',
    show_distance TINYINT DEFAULT 1 COMMENT '允许展示距离',
    hide_active_time TINYINT DEFAULT 0 COMMENT '隐藏活跃时间',
    show_marital_status TINYINT DEFAULT 1 COMMENT '婚况对外展示',
    profile_update_visible TINYINT DEFAULT 1 COMMENT '资料更新动态可见',
    dynamic_channel_visible TINYINT DEFAULT 1 COMMENT '动态在频道展示',
    hide_visit_record TINYINT DEFAULT 0 COMMENT '隐藏访问记录，真实权益由PRD-04校验',
    only_opposite_interaction TINYINT DEFAULT 1 COMMENT '只接受异性互动',
    personalized_push TINYINT DEFAULT 1 COMMENT '接收个性化推送',
    match_chat_hint TINYINT DEFAULT 1 COMMENT '个性化配对聊天提示',
    smart_reply TINYINT DEFAULT 1 COMMENT '智能灵感回复',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_privacy_user (user_id, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户隐私设置表';

CREATE TABLE IF NOT EXISTS app_user_notification_setting (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    interaction_notice TINYINT DEFAULT 1,
    community_notice TINYINT DEFAULT 1,
    daily_recommend_notice TINYINT DEFAULT 1,
    app_exit_notice TINYINT DEFAULT 1,
    match_success_notice TINYINT DEFAULT 1,
    chat_notice TINYINT DEFAULT 1,
    whisper_notice TINYINT DEFAULT 1,
    certification_notice TINYINT DEFAULT 1,
    report_notice TINYINT DEFAULT 1,
    asset_notice TINYINT DEFAULT 1,
    banner_in_app TINYINT DEFAULT 1,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_notice_user (user_id, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户通知设置表';

CREATE TABLE IF NOT EXISTS app_user_relation_block (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '发起用户',
    target_user_id BIGINT NOT NULL COMMENT '目标用户',
    block_type VARCHAR(30) NOT NULL COMMENT 'BLACKLIST/HIDE_DYNAMIC',
    source_scene VARCHAR(50) DEFAULT NULL COMMENT '来源场景',
    status VARCHAR(20) DEFAULT 'ENABLED',
    release_time DATETIME DEFAULT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_user_target_type (user_id, target_user_id, block_type, deleted),
    INDEX idx_target_type (target_user_id, block_type, status, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户屏蔽关系表';

CREATE TABLE IF NOT EXISTS app_user_keyword_block (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    keyword VARCHAR(50) NOT NULL,
    match_type VARCHAR(20) DEFAULT 'FUZZY',
    status VARCHAR(20) DEFAULT 'ENABLED',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_user_keyword (user_id, keyword, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户个人关键词屏蔽表';

CREATE TABLE IF NOT EXISTS app_user_feedback (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    feedback_type VARCHAR(50) NOT NULL,
    content VARCHAR(1000) NOT NULL,
    image_urls TEXT DEFAULT NULL COMMENT 'JSON数组',
    contact VARCHAR(100) DEFAULT NULL,
    status VARCHAR(30) DEFAULT 'PENDING' COMMENT 'PENDING/PROCESSING/DONE/IGNORED',
    handle_remark VARCHAR(500) DEFAULT NULL,
    handled_by BIGINT DEFAULT NULL,
    handled_time DATETIME DEFAULT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_feedback_user (user_id, deleted),
    INDEX idx_feedback_status (status, create_time, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户反馈表';

CREATE TABLE IF NOT EXISTS app_user_cancel_request (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    status VARCHAR(30) DEFAULT 'APPLIED' COMMENT 'APPLIED/COOLING_OFF/REVOKED/CANCELLED/BLOCKED',
    reason VARCHAR(500) DEFAULT NULL,
    block_reason VARCHAR(500) DEFAULT NULL,
    apply_time DATETIME NOT NULL,
    cooling_end_time DATETIME NOT NULL,
    revoke_time DATETIME DEFAULT NULL,
    final_cancel_time DATETIME DEFAULT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_cancel_user (user_id, status, deleted),
    INDEX idx_cancel_status_time (status, cooling_end_time, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户注销申请表';

CREATE TABLE IF NOT EXISTS app_user_search_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    keyword VARCHAR(100) NOT NULL,
    search_type VARCHAR(20) DEFAULT 'ALL',
    result_count INT DEFAULT 0,
    violation_hit TINYINT DEFAULT 0,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_search_user_time (user_id, create_time, deleted),
    INDEX idx_search_keyword (keyword, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户搜索日志表';

CREATE TABLE IF NOT EXISTS app_user_security_audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    biz_type VARCHAR(50) NOT NULL COMMENT 'PRIVACY/NOTICE/BLOCK/KEYWORD/CANCEL/FEEDBACK',
    biz_id BIGINT DEFAULT NULL,
    action VARCHAR(50) NOT NULL,
    before_value TEXT DEFAULT NULL,
    after_value TEXT DEFAULT NULL,
    operator_type VARCHAR(20) DEFAULT 'USER' COMMENT 'USER/ADMIN/SYSTEM',
    operator_id BIGINT DEFAULT NULL,
    remark VARCHAR(500) DEFAULT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_security_audit_user (user_id, biz_type, create_time, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户安全设置审计日志';
```

### 6.3 枚举

| 枚举 | 值 |
| ---- | -- |
| `RelationBlockTypeEnum` | `BLACKLIST`、`HIDDEN_DYNAMIC` |
| `FeedbackStatusEnum` | `PENDING`、`PROCESSING`、`RESOLVED`、`CLOSED` |
| `CancelRequestStatusEnum` | `COOLING_OFF`、`REVOKED`、`CANCELLED`、`BLOCKED` |
| `SearchResultTypeEnum` | `ALL`、`USER`、`POST`、`TOPIC` |
| `SecurityAuditBizTypeEnum` | `PRIVACY`、`NOTICE`、`BLOCK`、`KEYWORD`、`CANCEL`、`FEEDBACK` |

## 7. Service/DAO 设计

| 层 | 类/接口 | 方法 | 职责 |
| ---- | ---- | ---- | ---- |
| Miniapp Service | `MiniappProfileService` | `getHome`、`getCertificationCenter` | 聚合我的页与认证中心 |
| Miniapp Service | `MiniappSettingService` | `getPrivacy`、`savePrivacy`、`getNotifications`、`saveNotifications` | 设置读写 |
| Miniapp Service | `MiniappRelationBlockService` | `list`、`add`、`remove`、`isBlocked` | 黑名单/动态屏蔽 |
| Miniapp Service | `MiniappKeywordBlockService` | `list`、`create`、`delete`、`matchForUser` | 个人关键词 |
| Miniapp Service | `MiniappFeedbackService` | `submit` | 反馈提交 |
| Miniapp Service | `MiniappAccountSecurityService` | `status`、`applyCancel`、`revokeCancel`、`logout` | 注销与退出 |
| Miniapp Service | `MiniappSearchResultService` | `search` | 搜索结果聚合 |
| Admin Service | `UserSecurityAdminService` | `summary`、`privacy`、`notifications`、`blocks`、`keywords` | 后台排查 |
| Admin Service | `FeedbackAdminService` | `list`、`detail`、`updateStatus` | 反馈处理 |
| Admin Service | `CancelRequestAdminService` | `list`、`detail`、`remark` | 注销申请排查 |
| Common DAO | `UserPrivacySettingDao` 等 | CRUD/query | 数据访问 |

## 8. 核心流程

### 8.1 我的页

```text
GET /miniapp/profile/home
  → 读取当前 userId
  → 查询用户基础资料与三项认证状态（PRD-01 表）
  → 查询隐私/通知设置是否存在，缺省不强制建表
  → 读取 mobile_entry_config(MY_PAGE)
  → 组装 MiniappProfileHomeVO
```

当前代码尚未落 `app_user/app_user_auth`，实施时需先与 PRD-01 对齐字段，或临时用用户基础表占位。

### 8.2 隐私/通知设置

1. 首次查询没有记录时，按 `app_config` 默认值返回。
2. 用户保存时 upsert 设置表。
3. 写 `app_user_security_audit_log`，记录变更前后摘要。
4. 不直接修改推荐、消息、社区数据；由对应模块读取设置后生效。

### 8.3 黑名单/不看 TA 动态

1. 新增时校验 `targetUserId != userId`。
2. 对相同 `userId + targetUserId + blockType` 幂等处理。
3. 黑名单生效判断由关系链、消息、推荐、主页等模块调用 `MiniappRelationBlockService.isBlocked` 或 common 查询服务。
4. 解除后只将状态置为 `DISABLED` 或逻辑删除，不恢复历史关系状态。

### 8.4 个人关键词屏蔽

1. 保存前校验单用户数量上限和单词长度，默认从 `app_config` 读取。
2. 生效点不在本模块主动推送；PRD-05 社区列表/评论查询时调用 `MiniappKeywordBlockService.matchForUser`。
3. 不影响搜索结果，避免和搜索违规词库混淆。

### 8.5 搜索结果

```text
GET /miniapp/search/results?keyword=xx&type=all
  → validateKeyword(keyword)
  → 命中 search_block_word(SEARCH_VIOLATION) 则返回 violation=true
  → 记录 app_user_search_log
  → 用户结果：按昵称/学校/城市模糊查询用户基础表，过滤黑名单/封禁/隐私限制
  → 动态/话题结果：PRD-05 表落地后接入；未落地前返回空列表和配置空态文案
```

### 8.6 注销申请

1. 用户提交注销申请，校验确认标记。
2. 查询阻断项：处罚、退款、付费争议、未到期 VIP。
3. 命中阻断则创建或更新 `BLOCKED` 记录并返回阻断原因。
4. 未命中则创建 `APPLIED/COOLING_OFF` 记录，`cooling_end_time = now + config.account_cancel.cooling_days`。
5. 后悔期内可撤销，状态转 `REVOKED`。
6. 物理清除任务不在本阶段实现，只预留 `final_cancel_time`。

## 9. 管理后台前端设计

### 9.1 页面/路由

| 页面 | 路由 | 权限 | 说明 |
| ---- | ---- | ---- | ---- |
| 用户安全详情 Tab | `/system/user` 内用户详情弹窗/抽屉 | `user:security:view` | 隐私、通知、黑名单、动态屏蔽、关键词 |
| 反馈箱 | `/user-security/feedback` | `user:feedback:list` | 列表、详情、处理状态 |
| 注销申请 | `/user-security/cancel-requests` | `user:cancel:list` | 列表、详情、备注 |

### 9.2 交互要求

1. 用户安全详情只读为主，不提供后台代改设置。
2. 反馈处理必须填写处理备注。
3. 注销申请备注/阻断原因变更需记录审计。
4. 手机号、联系方式等敏感字段默认脱敏，具备特殊权限后再显示完整值。

## 10. 权限与安全

### 10.1 权限码

| 权限码 | 含义 |
| ---- | ---- |
| `user:security:view` | 查看用户安全设置与屏蔽记录 |
| `user:feedback:list` | 查看反馈列表与详情 |
| `user:feedback:handle` | 处理反馈 |
| `user:cancel:list` | 查看注销申请 |
| `user:cancel:handle` | 备注/处理注销申请 |

### 10.2 安全约束

1. 小程序所有用户设置写接口从 token 上下文取 `userId`，禁止前端传 `userId`。
2. 黑名单/动态屏蔽不允许操作自己。
3. 反馈截图只接收 OSS URL，不在本接口上传文件。
4. 搜索关键词写日志前限制长度，避免超长输入污染日志。
5. 管理后台仅查询敏感设置，代操作能力需后续单独审批。

## 11. PRD-07 推广裂变联动影响

| 项 | 结论 |
| ---- | ---- |
| 是否触发 PRD-07 推广事件 | 本方案大部分接口不触发；若后续资料编辑/三项认证状态由本模块承接，则需触发 |
| 是否调用 `PromotionInviteEventService.handleInviteEvent` | 我的页聚合、隐私/通知/屏蔽、反馈、搜索、注销均不调用 |
| 可能触发点 | 资料首次完善：`profile_complete_reward`；三项认证首次全部通过：`verify_complete_reward` |
| 当前方案处理 | 认证中心只读展示 PRD-01 状态，不改变认证状态，因此不触发推广事件 |
| 幂等键 | 若未来由本模块触发资料/认证事件，应以 `userId + eventType` 或 `relationId + eventType` 幂等 |
| 失败处理 | 本模块自己的设置保存失败只影响设置；未来资料/认证事件触发失败不得导致资料/认证主状态错误，应记录补偿日志 |
| 数据反查 | 仅资料/认证事件需要能反查 `promotion_invite_relation`、`promotion_reward_log` |
| 测试覆盖 | 本阶段新增“设置保存不触发推广事件”；未来 PRD-01 接入后补“认证完成触发邀请奖励”跨模块用例 |

## 12. 测试方案

| 层级 | 覆盖 |
| ---- | ---- |
| L1 cURL | 隐私/通知设置 CRUD、黑名单/动态屏蔽、关键词、反馈、注销、搜索结果、后台反馈/注销查询 |
| L2 Controller | 小程序 Settings/Profile/Search/Feedback/Account Controller；后台 UserSecurity/Feedback/Cancel Controller |
| L3 Service | 默认设置初始化、黑名单幂等、关键词数量限制、注销阻断、搜索违规词拦截 |
| L4 Playwright | 管理后台反馈箱、注销申请、用户详情安全 Tab 页面加载和处理弹窗 |
| 手动 | 小程序端交互、隐私设置对 PRD-05/08/03 的实际生效联调 |

测试产物：

1. `docs/测试文档/用户安全设置与搜索主链路-testcase.md`
2. `docs/测试文档/用户安全设置与搜索主链路-test-l1.sh`
3. `docs/测试文档/用户安全设置与搜索主链路-testreport.md`

## 13. 变更文件清单

| 类型 | 文件 |
| ---- | ---- |
| SQL | `backend/docs/sql/schema-user-security.sql` |
| Entity | `common/entity/AppUserPrivacySetting.java` 等 8 个实体 |
| Enum | `common/enums/RelationBlockTypeEnum.java` 等 |
| Mapper | `common/mapper/*Mapper.java` |
| DAO | `common/dao/*Dao.java` 与 `common/dao/impl/*DaoImpl.java` |
| Miniapp Controller | `miniapp/controller/MiniappProfileController.java`、`MiniappSettingController.java`、`MiniappFeedbackController.java`、`MiniappAccountSecurityController.java`、`MiniappSearchResultController.java` |
| Admin Controller | `admin/controller/UserSecurityController.java`、`FeedbackAdminController.java`、`CancelRequestAdminController.java` |
| Frontend API | `frontend/src/api/userSecurity.ts` |
| Frontend Pages | `frontend/src/pages/user-security/FeedbackPage.tsx`、`CancelRequestPage.tsx`，用户详情安全 Tab |

## 14. 实施顺序

1. 建 `schema-user-security.sql`，先落设置/屏蔽/反馈/注销/搜索日志/审计表。
2. 实现 common Entity/Enum/Mapper/DAO。
3. 实现小程序隐私/通知/屏蔽/关键词/反馈/注销接口。
4. 实现搜索结果接口，先接用户结果与违规词拦截，动态/话题按空列表占位。
5. 实现后台反馈箱、注销申请、用户安全摘要查询接口。
6. 增加后台菜单权限和 React 页面。
7. 编写测试用例、L1 脚本、L2/L3 单测、L4 Playwright。
8. 与 PRD-01/03/04/05/08 联调时补跨模块测试。

## 15. 自检清单

| 检查项 | 结果 |
| ---- | ---- |
| 是否复用公共内容配置第一阶段能力 | 是 |
| 是否避免 admin/miniapp 互相 import | 是 |
| 是否遵守六层结构 | 是 |
| 是否新增 PRD-07 推广联动影响 | 是 |
| 是否暴露当前代码缺少 app_user/app_user_auth 风险 | 是 |
| 是否区分个人关键词屏蔽与搜索违规词 | 是 |
| 是否避免把 PRD-03/04/05/08 逻辑写进本模块 | 是 |

## 16. 交叉验证与补缺（2026-05-29 核验）

> 核验人：皮林雄
> 核验依据：移动端 PRD-06、管理后台 PRD-06、TEAM_STANDARDS.md、现有代码结构

### 16.1 必须修正项（6 项）

#### 修正 1：注销状态枚举 `APPLIED` 与 `COOLING_OFF` 语义重叠

**问题：** PRD §11.2.4 明确"提交注销申请即进入 30 天后悔期"，但方案 §8.6 步骤 4 写 `APPLIED/COOLING_OFF` 两个状态，DDL 默认值为 `APPLIED`，未说明何时转 `COOLING_OFF`。

**修正：** 合并为单一初始状态 `COOLING_OFF`（提交校验通过即进入后悔期），去掉 `APPLIED`。最终状态机如下：

```text
提交 → [校验通过] → COOLING_OFF
                      ├─ 用户撤销 → REVOKED
                      ├─ 后悔期到期 → CANCELLED
                      └─ 后台阻断 → BLOCKED
       [校验不通过] → 直接返回阻断原因，不创建记录
```

对应 DDL 修改：`status VARCHAR(30) DEFAULT 'COOLING_OFF'`

对应枚举修改：`CancelRequestStatusEnum` 去掉 `APPLIED`，保留 `COOLING_OFF`、`REVOKED`、`CANCELLED`、`BLOCKED`。

#### 修正 2：补充 `MiniappSettingsHomeVO` 字段定义

**问题：** PRD §11.1 设置页包含手机号绑定状态、微信绑定状态，方案 §5.1 有该接口但 §5.3 DTO 表未列出字段。

**修正：** 在 §5.3 补充：

| 对象 | 字段 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- | ---- |
| `MiniappSettingsHomeVO` | phoneBindStatus | String | 是 | 手机号绑定状态：BOUND/UNBOUND，展示脱敏号码 |
| | wechatBindStatus | String | 是 | 微信绑定状态：BOUND/UNBOUND |
| | entries | List\<MiniappEntryConfigVO\> | 是 | 设置页入口列表，复用 mobile_entry_config(SETTINGS_PAGE) |
| | currentVersion | String | 否 | 当前小程序版本号，用于"软件更新"展示 |

#### 修正 3：搜索结果接口补充 `RESULT_BLOCK` 过滤逻辑

**问题：** 已有 `SearchBlockTypeEnum.RESULT_BLOCK`，方案 §8.5 只处理了 `SEARCH_VIOLATION` 拦截，未说明搜索结果命中 `RESULT_BLOCK` 时如何处理。

**修正：** 在 §8.5 搜索结果流程中，用户结果返回前增加一步：

```text
GET /miniapp/search/results?keyword=xx&type=all
  → validateKeyword(keyword)
  → 命中 SEARCH_VIOLATION 则返回 violation=true
  → 记录 app_user_search_log
  → 用户结果：按昵称/学校/城市模糊查询用户基础表，过滤黑名单/封禁/隐私限制
  → [新增] 结果过滤：加载 RESULT_BLOCK 类型屏蔽词，对用户昵称命中的记录剔除
  → 动态/话题结果：PRD-05 表落地后接入；未落地前返回空列表和配置空态文案
```

实现方式：复用 `SearchBlockWordDao.selectEnabledList()` 筛选 `blockType = RESULT_BLOCK` 的词，对搜索结果集做内存过滤。后续数据量大时可改为 SQL `NOT LIKE` 或 ES 过滤。

#### 修正 4：后台前端路由与现有目录结构对齐

**问题：** 方案 §9.1 写 `/system/user` 和 `/user-security/feedback`，但现有前端 `pages/` 目录按 `admin/`、`content/`、`promotion/` 等模块组织，TEAM_STANDARDS 路由规范也是按模块分。

**修正：** 前端路由和目录调整为：

| 页面 | 路由 | 目录 | 权限 |
| ---- | ---- | ---- | ---- |
| 反馈箱 | `/user-security/feedback` | `pages/user-security/FeedbackPage.tsx` | `user:feedback:list` |
| 注销申请 | `/user-security/cancel-requests` | `pages/user-security/CancelRequestPage.tsx` | `user:cancel:list` |
| 用户安全详情 Tab | 挂靠现有 `/system` 用户详情弹窗 | `pages/admin/UserManagement.tsx` 内新增 Tab 组件 | `user:security:view` |

路由配置在 `router/` 中新增 `/user-security` 一级路径，与现有 `/content`、`/promotion` 平级。

#### 修正 5：`app_user_cancel_request` 补充幂等约束

**问题：** 一个用户同时只能有一个有效注销申请，但表只有普通索引 `idx_cancel_user`，无法防止并发重复提交。

**修正：** Service 层幂等校验 + 数据库兜底：

1. `MiniappAccountSecurityService.applyCancel` 方法内先查询是否存在 `status = COOLING_OFF` 的记录，存在则直接返回已有申请信息。
2. DDL 补充注释说明幂等策略：

```sql
-- 幂等说明：同一用户同时只允许一条 COOLING_OFF 状态记录，
-- 由 Service 层校验保证；不加唯一索引是因为用户可能有历史 REVOKED/CANCELLED 记录
INDEX idx_cancel_user (user_id, status, deleted)
```

#### 修正 6：补充权限码与角色映射表

**问题：** 方案 §10.1 定义了权限码，但未说明哪些角色拥有这些权限，与管理后台 PRD §5 的角色建议脱节。

**修正：** 在 §10.1 后补充角色映射：

| 角色 | 拥有权限码 |
| ---- | ---- |
| 客服 | `user:security:view`、`user:feedback:list` |
| 运营 | `user:security:view`、`user:feedback:list`、`user:feedback:handle`、`user:cancel:list` |
| 安全/风控 | `user:security:view`、`user:cancel:list`、`user:cancel:handle` |
| 超级管理员 | 全部权限码 |

### 16.2 建议优化项（非阻塞）

| # | 位置 | 建议 |
| ---- | ---- | ---- |
| 1 | §5.3 `MiniappProfileHomeVO.vipStatus/coinBalance` | 标注改为"占位必返回，值可为 null"，前端据此展示空态而非隐藏入口 |
| 2 | §6.2 `app_user_search_log` | `update_time`/`updated_by` 对只写不改的日志表无实际意义，保留但加注释"仅为 BaseEntity 统一字段，本表不做 UPDATE" |
| 3 | §13 变更文件清单 | Admin Controller 命名建议统一：`UserSecurityController` 负责 `/admin/user-security/users/**`，`UserSecurityFeedbackController` 负责 `/admin/user-security/feedback/**`，`UserSecurityCancelController` 负责 `/admin/user-security/cancel-requests/**`，URL 前缀与类名对应更清晰 |
| 4 | §5.3 `MiniappSearchResultPageVO` | 补充 `totalCount`（总命中数）字段，前端分页需要 |

### 16.3 核验结论

方案整体质量 **8/10**，需求覆盖完整、分层设计合规、与第一阶段衔接清晰。上述 6 项修正中，**修正 1（注销状态机）** 和 **修正 3（RESULT_BLOCK 过滤）** 是实施时最容易踩坑的，建议优先在编码前对齐。其余修正可在实施过程中同步落地。

