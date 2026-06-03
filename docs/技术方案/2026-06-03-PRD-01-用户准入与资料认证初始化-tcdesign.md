# PRD-01 用户准入与资料认证初始化 技术方案设计

> 日期：2026-06-03
> 作者：A 同学
> 关联需求：
> - `docs/需求文档/移动端/细化PRD-01_用户准入与资料认证初始化.md`
> - `docs/需求文档/管理后台/管理后台细化PRD-01_用户准入与资料认证初始化.md`

## 1. 背景与目标

PRD-01 是整个产品的准入层与身份建立层，决定用户是否能进入后续核心婚恋链路。

| 目标 | 技术承接 |
| --- | --- |
| 微信授权登录与自动注册 | 新增小程序登录接口，调用微信 code2Session，自动创建 `app_user` |
| 首登资料完善的 3 步流程 | 首登资料读写接口，分步提交与草稿保存 |
| 个人资料编辑 | `app_user` 字段的增量更新 |
| 认证中心（实名/学历/头像） | 认证状态机 + 第三方 API stub + 异步回写 |
| 资料内容审核（照片/文字） | 独立审核状态字段，与认证状态隔离 |
| 资料完整度计算 | 基于配置权重的 profile_score 动态计算 |
| 核心准入判定 | 基于 profile + verification 的组合条件判定 |
| 管理后台用户管理与审核 | 用户列表/详情补充 PRD-01 字段，认证审核视图 |

## 2. 范围

| 模块 | 是否涉及 | 说明 |
| --- | --- | --- |
| 管理后台前端 | 是 | 用户列表/详情增加 PRD-01 字段，新增认证审核页、资料内容审核页 |
| 管理后台后端 | 是 | 新增用户准入查询、认证审核、内容审核、参数配置接口 |
| 小程序后端 | 是 | 新增微信登录、首登资料、个人资料编辑、认证提交/查询接口 |
| 小程序前端 | 否 | 本仓库不包含，仅输出接口契约 |
| 数据库 | 是 | 新增 `app_user`、`app_user_verification` 表 |
| 微信支付 | 否 | 不涉及 |
| 微信人脸核身 | 部分 | 预留接口骨架，首版返回 mock 结果 |
| 第三方学历认证 | 部分 | 预留抽象层，首版返回 mock 结果 |
| 第三方头像核验 | 部分 | 预留抽象层，首版返回 mock 结果 |

## 3. 关键决策与待确认项

| 类型 | 内容 | 决策/状态 | 来源 |
| --- | --- | --- | --- |
| 已确认 | 用户表设计 | 新建 `app_user` 表（账户+资料合一），与 `sys_user` 独立 | PRD-01 数据模型 |
| 已确认 | 认证与审核分离 | `app_user_verification` 独立表，5 类状态字段分离存储 | PRD-01 §11.9 |
| 已确认 | 性别不可修改 | 首登提交后锁定，仅后台客服可改 | PRD-01 §11.2.5 |
| 已确认 | 学校字典 | 首版接入完整学校字典，支持搜索联想 | PRD-01 §11.4.2 |
| 已确认 | 微信人脸核身 | 首版预留接口骨架，返回 mock 通过结果 | PRD-01 §11.6.9 |
| 已确认 | 第三方学历认证 | 抽象层预留，首版返回 mock 审核中 | PRD-01 §11.7.5 |
| 已确认 | 第三方头像核验 | 上传即自动提交审核，首版返回 mock 通过 | PRD-01 §11.8.2 |
| 已确认 | 实名认证为曝光与匹配准入条件 | 学历/头像认证为增强信任项，非强制 | PRD-01 §10.4 |
| 已确认 | 未实名→仅浏览卡片，禁止喜欢/匹配/曝光 | 前端按钮置灰 + 后端接口校验 | PRD-01 §13.2 |
| 待联动 | 成家币流水（PRD-04/07） | 不依赖，PRD-01 不涉及成家币 | - |
| 待联动 | 通知中心（PRD-03） | 认证通过/驳回时不发通知，预留通知写入点 | - |
| 待联动 | 推荐候选池（PRD-08） | 依赖 `app_user` + verification 数据作为推荐输入 | - |
| 待联动 | 社区动态发布（PRD-05） | 依赖实名认证状态判定 | - |

## 4. 总体架构与调用链

### 4.1 微信授权登录链路

```text
小程序启动
  → wx.login() 获取 code
  → POST /miniapp/auth/wechat-login { code }
  → 后端处理：
      1. 调微信 code2Session 获取 openId/unionId
      2. 根据 openId 查找 app_user
      3. 不存在 → INSERT app_user（account_status=NORMAL, first_login_completed=0）
      4. 存在 → UPDATE last_login_time
      5. 生成 token，写入 Redis（miniapp:token:{uuid}）
      6. 返回 token + firstLoginCompleted + userId
  → 前端存 token，根据 firstLoginCompleted 决定跳转
```

### 4.2 首登资料完善链路

```text
小程序首登资料页
  → GET /miniapp/profile/init-status  查询当前步骤
  → POST /miniapp/profile/init-save  保存当前步骤（支持草稿）
  → POST /miniapp/profile/init-complete  最后一步提交，标记 first_login_completed=1
  → 后端处理：
      - 校验必填字段
      - 计算 profile_score
      - 若头像已上传，自动触发头像认证（创建 verification 记录）
  → 返回 profileScore + nextStep
```

### 4.3 个人资料编辑链路

```text
小程序编辑资料页
  → GET /miniapp/profile/detail  获取完整资料
  → PATCH /miniapp/profile  增量更新字段
  → 后端处理：
      - 校验字段规则
      - 若修改头像，重置头像认证状态并重新触发
      - 若修改开放文字，重置文字审核状态
      - 重新计算 profile_score
  → 返回更新后的 profile
```

### 4.4 认证中心链路

```text
小程序认证中心
  → GET /miniapp/verify/status  查询当前所有认证状态
  → POST /miniapp/verify/real-name/submit  提交实名认证（姓名+身份证号）
  → POST /miniapp/verify/education/submit  提交学历认证
  → POST /miniapp/verify/avatar/check  头像认证（上传头像时自动触发，也可手动触发）
  → 后端处理：
      - 实名：mock 调用微信 getVerifyId → 返回 verify_id（首版直接标记 APPROVED）
      - 学历：mock 调用第三方 API → 标记 PENDING（异步）
      - 头像：上传即触发，mock 核验 → 首版直接标记 APPROVED
```

### 4.5 管理后台链路

```text
frontend/src/pages/admin/UserManagement.tsx  用户管理（增加认证/准入筛选）
frontend/src/pages/admin/VerificationManagement.tsx  认证审核（实名/学历/头像）
frontend/src/pages/admin/ProfileModeration.tsx  资料内容审核（照片/文字）
  → frontend/src/api/user.ts, verification.ts
  → /admin/user/**, /admin/verify/**
  → *Controller → *Service → *ServiceImpl → *Dao → *DaoImpl → *Mapper → MySQL
```

## 5. 方案选择

| 方案 | 说明 | 优点 | 缺点 | 结论 |
| --- | --- | --- | --- | --- |
| 最小方案 | app_user 表存所有数据，认证为表内列，不建独立审核页 | 交付快 | 状态混在一起，审核无流水，扩展性差 | 不选 |
| 平衡方案 | app_user + app_user_verification 分表，5 类状态独立，后台有审核视图 | 满足 PRD 全量需求，架构清晰 | 表多 2 张 | **选择** |
| 完整方案 | 接入真实微信人脸核身、第三方学信/头像 API、审核工作流 | 生产可用的认证能力 | 超出首版范围，第三方 API 需要商务对接 | 后续再做 |

本方案采用**平衡方案**：`app_user` 账户+资料合一表，`app_user_verification` 独立认证表，首版认证 mock 返回通过结果，预留真实 API 切换能力。

## 6. 数据库设计

### 6.1 表清单

| 表名 | 说明 |
| --- | --- |
| `app_user` | 小程序用户主表（账户 + 资料合一） |
| `app_user_verification` | 用户认证与审核状态表（每用户一条） |

### 6.2 关键 DDL

> 所有表包含通用字段：`create_time/update_time/created_by/updated_by/deleted`（TINYINT DEFAULT 0）。
> Java 实体统一继承 `BaseEntity`。下仅列业务字段与索引。

```sql
-- 小程序用户主表（账户 + 资料合一）
CREATE TABLE app_user (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    -- 账户字段
    openid VARCHAR(128) DEFAULT NULL COMMENT '小程序openid',
    unionid VARCHAR(128) DEFAULT NULL COMMENT '微信unionid',
    register_source VARCHAR(30) DEFAULT 'WECHAT' COMMENT '注册来源: WECHAT/AGENT_CODE',
    register_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
    last_login_time DATETIME DEFAULT NULL COMMENT '最近登录时间',
    account_status VARCHAR(20) DEFAULT 'NORMAL' COMMENT '账号状态: NORMAL/FROZEN/CANCELLING/CANCELLED @see AccountStatusEnum',
    first_login_completed TINYINT DEFAULT 0 COMMENT '是否完成首登资料初始化',
    -- 基础资料字段
    avatar VARCHAR(500) DEFAULT NULL COMMENT '主头像URL',
    nickname VARCHAR(50) DEFAULT NULL COMMENT '昵称',
    gender VARCHAR(10) DEFAULT NULL COMMENT '性别: MALE/FEMALE @see GenderEnum',
    birthday DATE DEFAULT NULL COMMENT '出生日期',
    age INT DEFAULT NULL COMMENT '年龄（系统计算）',
    height INT DEFAULT NULL COMMENT '身高cm',
    location_province VARCHAR(50) DEFAULT NULL COMMENT '居住省',
    location_city VARCHAR(50) DEFAULT NULL COMMENT '居住市',
    location_district VARCHAR(50) DEFAULT NULL COMMENT '居住区县',
    hometown_province VARCHAR(50) DEFAULT NULL COMMENT '家乡省',
    hometown_city VARCHAR(50) DEFAULT NULL COMMENT '家乡市',
    dating_goal VARCHAR(30) DEFAULT NULL COMMENT '脱单目标 @see DatingGoalEnum',
    marital_status VARCHAR(30) DEFAULT NULL COMMENT '婚姻状态 @see MaritalStatusEnum',
    emotional_status VARCHAR(30) DEFAULT NULL COMMENT '感情状态 @see EmotionalStatusEnum',
    school VARCHAR(100) DEFAULT NULL COMMENT '学校全称',
    major VARCHAR(100) DEFAULT NULL COMMENT '专业',
    education_level VARCHAR(30) DEFAULT NULL COMMENT '最高学历 @see EducationLevelEnum',
    -- 扩展资料字段
    about_me VARCHAR(500) DEFAULT NULL COMMENT '关于我',
    hope_they_know VARCHAR(500) DEFAULT NULL COMMENT '希望TA了解',
    voice_intro_url VARCHAR(500) DEFAULT NULL COMMENT '语音介绍URL',
    voice_intro_duration INT DEFAULT NULL COMMENT '语音时长秒',
    tags JSON DEFAULT NULL COMMENT '标签列表 JSON: [{"id":1,"name":"摄影"},...]',
    photos JSON DEFAULT NULL COMMENT '相册 JSON: ["url1","url2",...]',
    profile_bg_image VARCHAR(500) DEFAULT NULL COMMENT '资料页背景图',
    mbti_type VARCHAR(10) DEFAULT NULL COMMENT 'MBTI类型',
    zodiac VARCHAR(10) DEFAULT NULL COMMENT '星座（系统计算）',
    profile_score INT DEFAULT 0 COMMENT '资料完整度分（系统计算）',
    -- 通用字段
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_openid (openid),
    INDEX idx_account_status (account_status),
    INDEX idx_first_login (first_login_completed),
    INDEX idx_gender (gender),
    INDEX idx_school (school),
    INDEX idx_profile_score (profile_score),
    INDEX idx_register_time (register_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='小程序用户主表';

-- 用户认证与审核状态表（每用户一条记录）
CREATE TABLE app_user_verification (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    -- 实名认证
    real_name_status VARCHAR(20) DEFAULT 'NOT_CERTIFIED' COMMENT '实名认证状态 @see VerificationStatusEnum',
    real_name VARCHAR(50) DEFAULT NULL COMMENT '真实姓名（加密存储）',
    id_card VARCHAR(20) DEFAULT NULL COMMENT '身份证号（加密存储）',
    real_name_submit_time DATETIME DEFAULT NULL COMMENT '实名认证提交时间',
    real_name_result_time DATETIME DEFAULT NULL COMMENT '实名认证结果时间',
    real_name_reject_reason VARCHAR(200) DEFAULT NULL COMMENT '实名驳回原因',
    -- 学历认证
    education_status VARCHAR(20) DEFAULT 'NOT_CERTIFIED' COMMENT '学历认证状态 @see VerificationStatusEnum',
    education_method VARCHAR(30) DEFAULT NULL COMMENT '认证方式: CHSI/ONLINE_CODE/DIPLOMA_NO',
    education_submit_time DATETIME DEFAULT NULL COMMENT '学历认证提交时间',
    education_result_time DATETIME DEFAULT NULL COMMENT '学历认证结果时间',
    education_reject_reason VARCHAR(200) DEFAULT NULL COMMENT '学历驳回原因',
    -- 头像认证
    avatar_verify_status VARCHAR(20) DEFAULT 'NOT_CERTIFIED' COMMENT '头像认证状态 @see VerificationStatusEnum',
    avatar_verify_submit_time DATETIME DEFAULT NULL COMMENT '头像认证提交时间',
    avatar_verify_result_time DATETIME DEFAULT NULL COMMENT '头像认证结果时间',
    avatar_verify_reject_reason VARCHAR(200) DEFAULT NULL COMMENT '头像驳回原因',
    -- 资料附加照片审核
    profile_photo_audit_status VARCHAR(20) DEFAULT 'NOT_SUBMITTED' COMMENT '资料照片审核状态 @see ModerationStatusEnum',
    profile_photo_submit_time DATETIME DEFAULT NULL COMMENT '照片审核提交时间',
    profile_photo_reject_reason VARCHAR(200) DEFAULT NULL COMMENT '照片驳回原因',
    -- 开放性文字审核
    open_text_audit_status VARCHAR(20) DEFAULT 'NOT_SUBMITTED' COMMENT '文字审核状态 @see ModerationStatusEnum',
    open_text_submit_time DATETIME DEFAULT NULL COMMENT '文字审核提交时间',
    open_text_reject_reason VARCHAR(200) DEFAULT NULL COMMENT '文字驳回原因',
    -- 汇总
    verify_level INT DEFAULT 0 COMMENT '已完成认证数量 0-3',
    -- 通用字段
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户认证与审核状态表';
```

### 6.3 枚举定义

| 枚举类 | 值 | 说明 |
| --- | --- | --- |
| `AccountStatusEnum` | `NORMAL / FROZEN / CANCELLING / CANCELLED` | 账号状态 |
| `GenderEnum` | `MALE / FEMALE` | 性别（提交后不可改） |
| `DatingGoalEnum` | 待字典配置 | 脱单目标 |
| `MaritalStatusEnum` | `UNMARRIED / DIVORCED / WIDOWED` | 婚姻状态 |
| `EmotionalStatusEnum` | 待字典配置 | 感情状态 |
| `EducationLevelEnum` | `JUNIOR_COLLEGE / BACHELOR / MASTER / DOCTOR` | 最高学历 |
| `VerificationStatusEnum` | `NOT_CERTIFIED / PENDING / APPROVED / REJECTED / EXPIRED` | 认证状态（实名/学历/头像共用） |
| `ModerationStatusEnum` | `NOT_SUBMITTED / PENDING / APPROVED / REJECTED` | 内容审核状态（照片/文字共用） |
| `RegisterSourceEnum` | `WECHAT / AGENT_CODE` | 注册来源 |

### 6.4 资料完整度评分规则（首版硬编码 → 后续迁移到配置表）

| 字段 | 分值 | 字段 | 分值 |
| --- | --- | --- | --- |
| nickname | 5 | gender | 5 |
| avatar | 10 | birthday/age | 5 |
| height | 5 | location (province+city) | 5 |
| hometown (province+city) | 5 | dating_goal | 5 |
| emotional_status | 5 | marital_status | 5 |
| school | 10 | education_level | 5 |
| about_me (>=20字) | 10 | photos (>=3张) | 10 |
| tags (>=3个) | 5 | hope_they_know | 5 |

总分 100 分。评分逻辑放在 Service 层，首版硬编码，后续迁移到 `app_config` 配置。

## 7. 后端设计

### 7.1 包与类规划

| 层 | 路径/类 | 说明 |
| --- | --- | --- |
| Entity | `common/entity/AppUser.java` | 小程序用户实体 |
| Entity | `common/entity/AppUserVerification.java` | 认证与审核状态实体 |
| Enum | `common/enums/AccountStatusEnum.java` | 账号状态 |
| Enum | `common/enums/GenderEnum.java` | 性别 |
| Enum | `common/enums/VerificationStatusEnum.java` | 认证状态 |
| Enum | `common/enums/ModerationStatusEnum.java` | 审核状态 |
| Enum | `common/enums/RegisterSourceEnum.java` | 注册来源 |
| Enum | `common/enums/DatingGoalEnum.java` | 脱单目标 |
| Enum | `common/enums/MaritalStatusEnum.java` | 婚姻状态 |
| Enum | `common/enums/EmotionalStatusEnum.java` | 感情状态 |
| Enum | `common/enums/EducationLevelEnum.java` | 最高学历 |
| Mapper | `common/mapper/AppUserMapper.java` | MyBatis-Plus Mapper |
| Mapper | `common/mapper/AppUserVerificationMapper.java` | MyBatis-Plus Mapper |
| DAO | `common/dao/AppUserDao.java` | 数据访问接口 |
| DAO | `common/dao/AppUserVerificationDao.java` | 数据访问接口 |
| DAOImpl | `common/dao/impl/AppUserDaoImpl.java` | 数据访问实现 |
| DAOImpl | `common/dao/impl/AppUserVerificationDaoImpl.java` | 数据访问实现 |
| Config | `common/config/ProfileScoreConfig.java` | 资料完整度评分规则配置类 |
| Constant | `common/constant/ProfileConfigKeys.java` | 配置键常量 |
| Miniapp Controller | `miniapp/controller/AuthMiniappController.java` | 小程序微信登录 |
| Miniapp Controller | `miniapp/controller/ProfileController.java` | 小程序资料管理（重构现有 MiniappProfileController） |
| Miniapp Controller | `miniapp/controller/VerificationController.java` | 小程序认证中心 |
| Miniapp Service | `miniapp/service/AuthMiniappService.java` + impl | 微信登录业务 |
| Miniapp Service | `miniapp/service/ProfileService.java` + impl | 资料管理业务（重构现有） |
| Miniapp Service | `miniapp/service/VerificationService.java` + impl | 认证业务 |
| Miniapp DTO | `miniapp/dto/request/WechatLoginReq.java` | 微信登录入参 |
| Miniapp DTO | `miniapp/dto/request/ProfileInitSaveReq.java` | 首登资料保存入参 |
| Miniapp DTO | `miniapp/dto/request/ProfileUpdateReq.java` | 资料增量更新入参 |
| Miniapp DTO | `miniapp/dto/request/RealNameSubmitReq.java` | 实名认证提交入参 |
| Miniapp DTO | `miniapp/dto/request/EducationSubmitReq.java` | 学历认证提交入参 |
| Miniapp VO | `miniapp/dto/response/WechatLoginVO.java` | 微信登录出参 |
| Miniapp VO | `miniapp/dto/response/ProfileDetailVO.java` | 用户资料详情出参 |
| Miniapp VO | `miniapp/dto/response/ProfileInitStatusVO.java` | 首登状态出参 |
| Miniapp VO | `miniapp/dto/response/VerificationStatusVO.java` | 认证中心状态出参 |
| Admin Controller | `admin/controller/AppUserController.java` | 后台用户管理（PRD-01 字段扩展） |
| Admin Controller | `admin/controller/VerificationAdminController.java` | 后台认证审核 |
| Admin Controller | `admin/controller/ModerationAdminController.java` | 后台资料内容审核 |
| Admin Service | `admin/service/AppUserAdminService.java` + impl | 用户管理业务 |
| Admin Service | `admin/service/VerificationAdminService.java` + impl | 认证审核业务 |
| Admin Service | `admin/service/ModerationAdminService.java` + impl | 内容审核业务 |
| Admin DTO | `admin/dto/request/AppUserPageReq.java` | 用户分页查询 |
| Admin DTO | `admin/dto/request/VerificationPageReq.java` | 认证审核分页查询 |
| Admin DTO | `admin/dto/request/ModerationAuditReq.java` | 内容审核操作 |
| Admin VO | `admin/dto/response/AppUserDetailVO.java` | 用户详情出参 |
| Admin VO | `admin/dto/response/AppUserListVO.java` | 用户列表出参 |
| Admin VO | `admin/dto/response/VerificationVO.java` | 认证审核出参 |
| Admin VO | `admin/dto/response/ModerationVO.java` | 内容审核出参 |

### 7.2 小程序接口

| 功能 | URL | Method | 权限 | 入参 | 出参 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| 微信授权登录 | `/miniapp/auth/wechat-login` | POST | 无 | `WechatLoginReq` | `WechatLoginVO` | code换token，新用户自动注册 |
| 首登状态 | `/miniapp/profile/init-status` | GET | 登录 | 无 | `ProfileInitStatusVO` | 当前步骤+已填字段 |
| 首登保存 | `/miniapp/profile/init-save` | POST | 登录 | `ProfileInitSaveReq` | `ProfileInitStatusVO` | 分步保存，支持草稿 |
| 首登完成 | `/miniapp/profile/init-complete` | POST | 登录 | `ProfileInitSaveReq` | `ProfileDetailVO` | 最后一步，标记完成 |
| 资料详情 | `/miniapp/profile/detail` | GET | 登录 | 无 | `ProfileDetailVO` | 获取自己的完整资料 |
| 更新资料 | `/miniapp/profile` | PATCH | 登录 | `ProfileUpdateReq` | `ProfileDetailVO` | 增量更新，含头像 |
| 认证状态 | `/miniapp/verify/status` | GET | 登录 | 无 | `VerificationStatusVO` | 所有认证状态 |
| 提交实名认证 | `/miniapp/verify/real-name` | POST | 登录 | `RealNameSubmitReq` | `VerificationStatusVO` | mock通过 |
| 提交学历认证 | `/miniapp/verify/education` | POST | 登录 | `EducationSubmitReq` | `VerificationStatusVO` | mock PENDING→APPROVED |
| 头像认证检查 | `/miniapp/verify/avatar` | POST | 登录 | 无 | `VerificationStatusVO` | 以当前主头像触发认证 |
| 准入状态 | `/miniapp/profile/access-status` | GET | 登录 | 无 | `AccessStatusVO` | 核心链路准入判定 |

### 7.3 管理后台接口

#### 7.3.1 用户管理（PRD-01 扩展）

| 功能 | URL | Method | 权限码 | 入参 | 出参 |
| --- | --- | --- | --- | --- | --- |
| 用户列表 | `/admin/users/app/list` | GET | `user:app:list` | `AppUserPageReq` | `Page<AppUserListVO>` |
| 用户详情 | `/admin/users/app/{id}` | GET | `user:app:list` | `id` | `AppUserDetailVO` |
| 冻结/解冻 | `/admin/users/app/{id}/status` | PUT | `user:app:freeze` | `StatusUpdateReq` | `Void` |
| 导出用户 | `/admin/users/app/export` | GET | `user:app:export` | `AppUserPageReq` | 文件流 |

#### 7.3.2 认证审核

| 功能 | URL | Method | 权限码 | 入参 | 出参 |
| --- | --- | --- | --- | --- | --- |
| 实名认证审核列表 | `/admin/verify/real-name/list` | GET | `verify:realname:list` | `VerificationPageReq` | `Page<VerificationVO>` |
| 实名认证审核 | `/admin/verify/real-name/{id}/audit` | PUT | `verify:realname:audit` | `ModerationAuditReq` | `Void` |
| 学历认证审核列表 | `/admin/verify/education/list` | GET | `verify:education:list` | `VerificationPageReq` | `Page<VerificationVO>` |
| 学历认证审核 | `/admin/verify/education/{id}/audit` | PUT | `verify:education:audit` | `ModerationAuditReq` | `Void` |
| 头像认证审核列表 | `/admin/verify/avatar/list` | GET | `verify:avatar:list` | `VerificationPageReq` | `Page<VerificationVO>` |
| 头像认证审核 | `/admin/verify/avatar/{id}/audit` | PUT | `verify:avatar:audit` | `ModerationAuditReq` | `Void` |

#### 7.3.3 资料内容审核

| 功能 | URL | Method | 权限码 | 入参 | 出参 |
| --- | --- | --- | --- | --- | --- |
| 照片审核列表 | `/admin/moderation/photos/list` | GET | `moderation:photo:list` | `VerificationPageReq` | `Page<ModerationVO>` |
| 照片审核 | `/admin/moderation/photos/{id}/audit` | PUT | `moderation:photo:audit` | `ModerationAuditReq` | `Void` |
| 文字审核列表 | `/admin/moderation/texts/list` | GET | `moderation:text:list` | `VerificationPageReq` | `Page<ModerationVO>` |
| 文字审核 | `/admin/moderation/texts/{id}/audit` | PUT | `moderation:text:audit` | `ModerationAuditReq` | `Void` |

### 7.4 关键 DTO/VO 字段

| 对象 | 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `WechatLoginReq` | `code` | String | 是 | 微信 wx.login() 返回的 code |
| `WechatLoginVO` | `token` | String | 是 | 登录令牌 |
| `WechatLoginVO` | `userId` | Long | 是 | 用户ID |
| `WechatLoginVO` | `firstLoginCompleted` | Boolean | 是 | 是否已完成首登资料 |
| `ProfileInitSaveReq` | `step` | Integer | 是 | 当前步骤 1/2/3 |
| `ProfileInitSaveReq` | `nickname` | String | 否 | 昵称 |
| `ProfileInitSaveReq` | `gender` | String | 否 | 性别 |
| `ProfileInitSaveReq` | `birthday` | String | 否 | 出生日期 |
| `ProfileInitSaveReq` | `...` | ... | ... | 包含所有 Profile 字段 |
| `ProfileUpdateReq` | `nickname` | String | 否 | 增量更新，null 不更新 |
| `ProfileUpdateReq` | `...` | ... | ... | 同上 |
| `ProfileDetailVO` | `all profile fields` | ... | 是 | 完整资料 + profileScore + accessStatus |
| `VerificationStatusVO` | `realNameStatus` | String | 是 | 实名认证状态 |
| `VerificationStatusVO` | `educationStatus` | String | 是 | 学历认证状态 |
| `VerificationStatusVO` | `avatarVerifyStatus` | String | 是 | 头像认证状态 |
| `VerificationStatusVO` | `verifyLevel` | Integer | 是 | 认证等级 0-3 |
| `VerificationStatusVO` | `unlockMateRecommend` | Boolean | 是 | 是否可进入觅缘核心链路 |
| `AccessStatusVO` | `canBrowseCards` | Boolean | 是 | 是否可浏览觅缘卡片 |
| `AccessStatusVO` | `canMatch` | Boolean | 是 | 是否可匹配操作 |
| `AccessStatusVO` | `canBeExposed` | Boolean | 是 | 是否可进入曝光 |
| `AccessStatusVO` | `blockReason` | String | 否 | 不可用原因文案 |
| `AppUserPageReq` | extends PageReq | + keyword/nickname/school/accountStatus/realNameStatus/educationStatus/avatarVerifyStatus/firstLoginCompleted | 多条件筛选 |
| `AppUserListVO` | id/avatar/nickname/phone(脱敏)/school/realNameStatus/educationStatus/avatarVerifyStatus/firstLoginCompleted/profileScore/accessStatus/accountStatus/registerTime |

### 7.5 微信登录设计

```
POST /miniapp/auth/wechat-login { code }

流程：
1. 调用微信 code2Session: GET https://api.weixin.qq.com/sns/jscode2session?appid={appid}&secret={secret}&js_code={code}&grant_type=authorization_code
2. 若微信返回 errcode != 0 → 返回登录失败
3. 拿到 openId + unionId
4. 根据 openId 查询 app_user
5. 新用户（不存在）：
   a. INSERT app_user (openid, unionid, register_source='WECHAT', register_time=now, last_login_time=now, account_status='NORMAL', first_login_completed=0)
   b. INSERT app_user_verification (user_id=新id)
6. 老用户（存在）：
   a. UPDATE last_login_time=now
   b. 校验 account_status 不为 FROZEN/CANCELLED
7. 生成 token = UUID，写入 Redis: miniapp:token:{token} → UserContext JSON，设置过期时间 (7天)
8. 返回 WechatLoginVO { token, userId, firstLoginCompleted }
```

### 7.6 资料完整度计算逻辑

```java
// ProfileScoreConfig.java — 首版硬编码权重
public class ProfileScoreConfig {
    private static final Map<String, Integer> WEIGHTS = Map.of(
        "nickname", 5, "avatar", 10, "gender", 5,
        "birthday", 5, "height", 5, "location_city", 5,
        "hometown_city", 5, "dating_goal", 5, "emotional_status", 5,
        "marital_status", 5, "school", 10, "education_level", 5,
        "about_me", 10, "photos_3", 10, "tags_3", 5, "hope_they_know", 5
    );

    public int calculate(AppUser user) {
        int score = 0;
        if (StrUtil.isNotBlank(user.getNickname())) score += 5;
        if (StrUtil.isNotBlank(user.getAvatar())) score += 10;
        if (StrUtil.isNotBlank(user.getGender())) score += 5;
        // ...etc
        if (user.getPhotos() != null && user.getPhotos().size() >= 3) score += 10;
        if (user.getTags() != null && user.getTags().size() >= 3) score += 5;
        return score;
    }
}
```

### 7.7 核心准入判定逻辑

```java
// ProfileService 内
public AccessStatusVO getAccessStatus(Long userId) {
    AppUser user = appUserDao.selectById(userId);
    AppUserVerification verification = verificationDao.selectByUserId(userId);

    AccessStatusVO vo = new AccessStatusVO();

    // 1. 未完成首登资料 → 仅可停留在资料/认证页
    if (user.getFirstLoginCompleted() == 0) {
        vo.setCanBrowseCards(false);
        vo.setCanMatch(false);
        vo.setCanBeExposed(false);
        vo.setBlockReason("请先完成资料初始化");
        return vo;
    }

    // 2. 账号状态检查
    if (!"NORMAL".equals(user.getAccountStatus())) {
        vo.setCanBrowseCards(false);
        vo.setCanMatch(false);
        vo.setCanBeExposed(false);
        vo.setBlockReason("账号状态异常");
        return vo;
    }

    // 3. 已完成首登资料 + 账号正常 → 至少可浏览
    vo.setCanBrowseCards(true);

    // 4. 实名认证通过 → 开放完整能力
    boolean realNamePassed = "APPROVED".equals(verification.getRealNameStatus());
    vo.setCanMatch(realNamePassed);
    vo.setCanBeExposed(realNamePassed);
    if (!realNamePassed) {
        vo.setBlockReason("完成实名认证后，才可曝光和匹配");
    }

    return vo;
}
```

## 8. 前端设计

### 8.1 路由与页面

| 页面 | 路由 | 组件 | 权限 |
| --- | --- | --- | --- |
| 用户管理（扩展） | `/customers` | `pages/customers/CustomersPage.tsx` | `user:app:list` |
| 实名认证审核 | `/verify/real-name` | `pages/verify/RealNameVerificationPage.tsx` | `verify:realname:list` |
| 学历认证审核 | `/verify/education` | `pages/verify/EducationVerificationPage.tsx` | `verify:education:list` |
| 头像认证审核 | `/verify/avatar` | `pages/verify/AvatarVerificationPage.tsx` | `verify:avatar:list` |
| 资料照片审核 | `/moderation/photos` | `pages/moderation/PhotoModerationPage.tsx` | `moderation:photo:list` |
| 文字内容审核 | `/moderation/texts` | `pages/moderation/TextModerationPage.tsx` | `moderation:text:list` |

路由更新 `frontend/src/router/index.tsx`，新增 5 个审核相关路由。移除原有 `system` 占位路由中与认证审核重叠的部分。

### 8.2 页面组件设计

#### 用户管理（CustomersPage 扩展）

在现有 CustomersPage 基础上：
1. 列表增加：实名认证状态、学历认证状态、头像认证状态、首登完成、资料完整度、核心准入状态
2. 搜索条件增加：学校、认证状态、首登完成状态、核心准入状态
3. 用户详情 Tab：基本资料、认证信息、准入信息、关联信息

#### 认证审核页（VerificationManagementPage）

统一用 Tab 切换 3 个子页面（实名/学历/头像），参考 CommunityManagementPage 模式：
- 列表展示用户信息 + 认证状态 + 提交时间 + 驳回原因
- 操作：通过/驳回（带驳回原因输入）
- 筛选：状态（待审核/已通过/已驳回）

#### 资料内容审核页（ModerationPage）

同样 Tab 切换 2 个子页面（照片/文字）：
- 照片审核：缩略图 + 用户信息 + 提交时间 + 状态
- 文字审核：文本摘要 + 用户信息 + 字段类型 + 状态
- 操作：通过/驳回

### 8.3 API 模块

新增前端 API 模块：
- `frontend/src/api/userApp.ts` — 后台用户管理接口（app_user）
- `frontend/src/api/verification.ts` — 后台认证审核接口

## 9. 权限与菜单

### 9.1 菜单树

| 菜单 | 类型 | 路由 | 组件 | 权限 |
| --- | --- | --- | --- | --- |
| 认证审核 | M | - | - | - |
| 实名认证审核 | C | `/verify/real-name` | `verify/VerificationManagementPage` | `verify:realname:list` |
| 学历认证审核 | C | `/verify/education` | `verify/VerificationManagementPage` | `verify:education:list` |
| 头像认证审核 | C | `/verify/avatar` | `verify/VerificationManagementPage` | `verify:avatar:list` |
| 内容审核 | M | - | - | - |
| 资料照片审核 | C | `/moderation/photos` | `moderation/ModerationPage` | `moderation:photo:list` |
| 文字内容审核 | C | `/moderation/texts` | `moderation/ModerationPage` | `moderation:text:list` |

### 9.2 按钮权限

| 权限码 | 说明 |
| --- | --- |
| `user:app:list` | 查看用户列表 |
| `user:app:detail` | 查看用户详情（含完整身份证/姓名） |
| `user:app:freeze` | 冻结/解冻用户 |
| `user:app:export` | 导出用户列表 |
| `verify:realname:list` | 查看实名认证审核列表 |
| `verify:realname:audit` | 实名认证审核操作 |
| `verify:education:list` | 查看学历认证审核列表 |
| `verify:education:audit` | 学历认证审核操作 |
| `verify:avatar:list` | 查看头像认证审核列表 |
| `verify:avatar:audit` | 头像认证审核操作 |
| `moderation:photo:list` | 查看照片审核列表 |
| `moderation:photo:audit` | 照片审核操作 |
| `moderation:text:list` | 查看文字审核列表 |
| `moderation:text:audit` | 文字审核操作 |

## 10. 与其他模块联动

| 模块 | 联动点 | 设计 |
| --- | --- | --- |
| PRD-02 关系反馈 | 依赖 app_user 表 + 认证状态 | app_user.id 作为外键，accessStatus 作为关系操作前置校验 |
| PRD-03 消息通知 | 认证通过/驳回通知 | 预留 `notify_after_verification` 写入点，PRD-03 实现后接入 |
| PRD-04 商业化 | 用户资产查询 | app_user.id 关联 UserAsset，PRD-04 已实现，无需改动 |
| PRD-05 社区互动 | 动态发布需实名认证 | 校验 `getAccessStatus().canMatch` 作为发帖前置条件 |
| PRD-08 推荐算法 | 用户资料作为推荐输入 | app_user 标签/学校/资料完整度作为推荐特征 |
| C 同学 字典管理 | 学校/标签/学历/感情状态字典 | 复用 `sys_dict_data`，通过字典 type 区分 |

### 10.1 跨 PRD 联调契约

| 提供方 | 能力 | 消费方 |
| --- | --- | --- |
| PRD-01 | `AccessStatusVO getAccessStatus(userId)` — 核心准入判定 | PRD-02/05/08 调用 |
| PRD-01 | `app_user` 表结构 — userId/nickname/avatar/gender/school/tags | PRD-02/04/05/08 查询 |
| C 同学 | `sys_dict_data` — 学校/标签/学历/感情状态/脱单目标字典 | PRD-01 引用 |
| B 同学 | `UserAsset` — VIP 状态/余额 | PRD-01 用户详情展示（只读引用） |

## 11. 测试方案

| 层级 | 覆盖内容 | 产物 |
| --- | --- | --- |
| L1 cURL | 微信登录、首登资料、资料编辑、认证提交/查询、准入判定、后台审核列表/操作 | `docs/测试文档/用户准入-PRD01-test-l1.sh` |
| L3 JUnit | 资料完整度计算、准入判定逻辑、认证状态机、首登流程、字段校验 | `backend/src/test/java/com/spacetime/miniapp/service/ProfileServiceTest.java` 等 |
| L4 Playwright | 后台用户列表筛选、认证审核页操作、内容审核页操作 | `frontend/e2e-tests/tests/prd01-user.spec.ts` |

### 11.1 必测用例

| 场景 | 预期 |
| --- | --- |
| 微信登录-新用户 | 自动创建 app_user + verification 记录，返回 firstLoginCompleted=false |
| 微信登录-老用户 | 更新 lastLoginTime，返回 firstLoginCompleted=true |
| 微信登录-已冻结 | 返回 403 错误 |
| 首登资料-第1步 | 保存成功，返回 nextStep=2 |
| 首登资料-第3步完成 | firstLoginCompleted=1，profileScore 计算正确 |
| 首登资料-性别提交后不可改 | PATCH 性别字段返回错误 |
| 资料编辑-修改头像 | 重置 avatarVerifyStatus 为 PENDING，触发认证 |
| 资料编辑-修改 aboutMe | 重置 openTextAuditStatus 为 PENDING |
| 资料完整度-全填满 | profileScore=100 |
| 资料完整度-空用户 | profileScore=0 |
| 认证-提交实名 | mock 返回 APPROVED |
| 认证-提交学历 | mock 返回 PENDING→APPROVED |
| 准入-未完成首登 | canBrowseCards=false |
| 准入-完成首登未实名 | canBrowseCards=true, canMatch=false |
| 准入-完成首登且实名通过 | canBrowseCards=true, canMatch=true, canBeExposed=true |
| 准入-账号冻结 | 全部 false |
| 后台-用户列表按认证状态筛选 | 筛选结果正确 |
| 后台-实名认证审核通过 | verification 状态更新为 APPROVED |
| 后台-照片审核驳回 | moderation 状态更新为 REJECTED + 驳回原因 |
| 后台-无权限访问审核页 | 返回 403 |

## 12. 变更文件清单

### 12.1 后端

| 类型 | 文件路径 | 新增/修改 | 说明 |
| --- | --- | --- | --- |
| SQL | `backend/docs/sql/schema-prd01-user.sql` | 新增 | app_user + app_user_verification DDL + 菜单权限种子数据 |
| Entity | `common/entity/AppUser.java` | 新增 | 小程序用户实体 |
| Entity | `common/entity/AppUserVerification.java` | 新增 | 认证审核状态实体 |
| Enum | `common/enums/AccountStatusEnum.java` | 新增 | 账号状态枚举 |
| Enum | `common/enums/GenderEnum.java` | 新增 | 性别枚举 |
| Enum | `common/enums/VerificationStatusEnum.java` | 新增 | 认证状态枚举 |
| Enum | `common/enums/ModerationStatusEnum.java` | 新增 | 审核状态枚举 |
| Enum | `common/enums/RegisterSourceEnum.java` | 新增 | 注册来源枚举 |
| Config | `common/config/ProfileScoreConfig.java` | 新增 | 资料评分规则 |
| Constant | `common/constant/ProfileConfigKeys.java` | 新增 | 配置键常量 |
| Constant | `common/constant/AuthConstant.java` | 修改 | 新增 MINIAPP_TOKEN_PREFIX |
| Mapper | `common/mapper/AppUserMapper.java` | 新增 | - |
| Mapper | `common/mapper/AppUserVerificationMapper.java` | 新增 | - |
| DAO | `common/dao/AppUserDao.java` + impl | 新增 | - |
| DAO | `common/dao/AppUserVerificationDao.java` + impl | 新增 | - |
| Miniapp Controller | `miniapp/controller/AuthMiniappController.java` | 新增 | 微信登录 |
| Miniapp Controller | `miniapp/controller/ProfileController.java` | 修改 | 重构 MiniappProfileController |
| Miniapp Controller | `miniapp/controller/VerificationController.java` | 新增 | 认证中心 |
| Miniapp Service | `miniapp/service/AuthMiniappService.java` + impl | 新增 | - |
| Miniapp Service | `miniapp/service/ProfileService.java` + impl | 修改 | 替换 MiniappProfileService stub |
| Miniapp Service | `miniapp/service/VerificationService.java` + impl | 新增 | - |
| Miniapp DTO | `miniapp/dto/request/WechatLoginReq.java` | 新增 | - |
| Miniapp DTO | `miniapp/dto/request/ProfileInitSaveReq.java` | 新增 | - |
| Miniapp DTO | `miniapp/dto/request/ProfileUpdateReq.java` | 新增 | - |
| Miniapp DTO | `miniapp/dto/request/RealNameSubmitReq.java` | 新增 | - |
| Miniapp DTO | `miniapp/dto/request/EducationSubmitReq.java` | 新增 | - |
| Miniapp VO | `miniapp/dto/response/WechatLoginVO.java` | 新增 | - |
| Miniapp VO | `miniapp/dto/response/ProfileDetailVO.java` | 新增 | - |
| Miniapp VO | `miniapp/dto/response/ProfileInitStatusVO.java` | 新增 | - |
| Miniapp VO | `miniapp/dto/response/VerificationStatusVO.java` | 新增 | - |
| Miniapp VO | `miniapp/dto/response/AccessStatusVO.java` | 新增 | - |
| Admin Controller | `admin/controller/AppUserController.java` | 新增 | 后台用户管理 |
| Admin Controller | `admin/controller/VerificationAdminController.java` | 新增 | 认证审核 |
| Admin Controller | `admin/controller/ModerationAdminController.java` | 新增 | 内容审核 |
| Admin Service | `admin/service/AppUserAdminService.java` + impl | 新增 | - |
| Admin Service | `admin/service/VerificationAdminService.java` + impl | 新增 | - |
| Admin Service | `admin/service/ModerationAdminService.java` + impl | 新增 | - |
| Admin DTO | `admin/dto/request/AppUserPageReq.java` | 新增 | - |
| Admin DTO | `admin/dto/request/VerificationPageReq.java` | 新增 | - |
| Admin DTO | `admin/dto/request/ModerationAuditReq.java` | 新增 | - |
| Admin VO | `admin/dto/response/AppUserDetailVO.java` | 新增 | - |
| Admin VO | `admin/dto/response/AppUserListVO.java` | 新增 | - |
| Admin VO | `admin/dto/response/VerificationVO.java` | 新增 | - |
| Admin VO | `admin/dto/response/ModerationVO.java` | 新增 | - |
| Config | `miniapp/config/WechatConfig.java` | 新增 | 微信 appid/secret 配置 |

### 12.2 前端

| 类型 | 文件路径 | 新增/修改 | 说明 |
| --- | --- | --- | --- |
| API | `frontend/src/api/userApp.ts` | 新增 | 后台用户管理接口 |
| API | `frontend/src/api/verification.ts` | 新增 | 后台认证审核接口 |
| 路由 | `frontend/src/router/index.tsx` | 修改 | 新增认证审核/内容审核路由 |
| 页面 | `frontend/src/pages/customers/CustomersPage.tsx` | 修改 | 增加 PRD-01 字段展示与筛选 |
| 页面 | `frontend/src/pages/verify/VerificationManagementPage.tsx` | 新增 | 认证审核（实名/学历/头像 Tab） |
| 页面 | `frontend/src/pages/moderation/ModerationPage.tsx` | 新增 | 内容审核（照片/文字 Tab） |

## 13. 风险与回滚

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| 微信 code2Session 不可用 | 登录链路中断 | 首版先 mock 微信接口，返回固定 openId |
| app_user 表与现有 app_user_* 表不统一 | 关联查询复杂 | 首版 app_user 先独立建表，后续统一 user_id 外键 |
| 认证 mock 与真实 API 差异大 | 后续切换需改造 | 预留 VerificationService 抽象接口，mock 实现可替换为真实实现 |
| 资料完整度权重调整 | 需改代码 | 后续迁移到 app_config 配置 |
| 性别修改锁死 | 用户无法改性别 | 后台提供客服操作入口 |

回滚策略：
1. 新路由和新页面不影响已有功能，可直接移除路由注册
2. app_user 表独立，删除后不影响 sys_user 和现有业务
3. 新增 Controller 不 import 已有模块，路由前缀独立

## 14. 实施顺序

1. **SQL**: 编写 DDL + 菜单权限种子数据
2. **common 层**: Entity → Enum → Mapper → DAO → DAOImpl → Config → Constant
3. **miniapp 层**: AuthMiniappService → ProfileService（重构 stub）→ VerificationService
4. **miniapp Controller 层**: AuthMiniappController → ProfileController → VerificationController
5. **admin 层**: AppUserAdminService → VerificationAdminService → ModerationAdminService
6. **admin Controller 层**: AppUserController → VerificationAdminController → ModerationAdminController
7. **前端**: API 模块 → 路由 → CustomersPage 扩展 → 认证审核页 → 内容审核页
8. **测试**: L1 cURL → L3 JUnit → L4 Playwright（前端页面完成后）

## 15. 自检清单

- [ ] 未引入超出本期范围的基础设施（无微信支付、无真实第三方 API 调用）
- [ ] 后端遵守 Controller → Service → ServiceImpl → DAO → DAOImpl → Mapper 六层架构
- [ ] `admin/` 与 `miniapp/` 没有互相 import
- [ ] 接口统一返回 `R<T>`，后台接口带 `@RequirePermission`
- [ ] 所有实体继承 `BaseEntity`，表使用逻辑删除 `deleted TINYINT DEFAULT 0`
- [ ] 5 类认证/审核状态字段独立存储，不混用
- [ ] 性别字段首登提交后不可修改
- [ ] 前端页面只调用 `frontend/src/api/` 模块，不直接 axios
- [ ] 资料完整度计算逻辑封装在独立配置类，便于后续迁移
- [ ] 核心准入判定封装为独立方法，供 PRD-02/05/08 调用
- [ ] 测试覆盖：登录、首登流程、资料编辑、认证状态机、准入判定、后台审核
