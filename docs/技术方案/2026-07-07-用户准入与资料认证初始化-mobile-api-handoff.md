# 用户准入与资料认证初始化 移动端接口对接文档

> 日期：2026-07-07  
> 面向对象：移动端前端联调  
> 范围：只说明移动端后端接口，不实现移动端前端代码  
> 依据：冻结 PRD、技术方案、移动端 UI 图 OCR 对齐结果  
> 冲突规则：UI 图与需求文档不一致时，以需求文档为准。

## 1. 通用约定

| 项 | 约定 |
|----|------|
| Base URL | 以环境配置为准，本文件不写死域名 |
| Header | 登录后请求带 `X-Auth-Token: <token>` |
| 返回结构 | `R<T>`：`code, msg, data` |
| 时间格式 | `yyyy-MM-dd HH:mm:ss`，日期为 `yyyy-MM-dd` |
| 分页 | 移动端本模块主要无分页；图片/历史如后续分页，使用 `page, size` |
| 敏感字段 | 身份证号、手机号、真实姓名默认脱敏回显；提交接口使用原始值 |
| 地区范围 | 首版仅支持中国大陆省/市/区；海外/国家/港澳台返回 `REGION_NOT_SUPPORTED` |

## 2. 枚举

| 枚举 | 值 | 说明 |
|------|----|------|
| `VerificationStatus` | `NOT_CERTIFIED`、`PENDING`、`APPROVED`、`REJECTED`、`EXPIRED` | 实名/学历/头像认证 |
| `ModerationStatus` | `NOT_SUBMITTED`、`PENDING`、`APPROVED`、`REJECTED` | 资料图片/开放性文字审核 |
| `AccountStatus` | `NORMAL`、`FROZEN`、`CANCELLING`、`CANCELLED` | 账号状态 |
| `CoreAccessStatus` | `CORE_ALLOWED`、`CORE_BLOCKED`、`NON_CORE_ONLY` | 核心准入 |
| `MediaType` | `AVATAR`、`ALBUM`、`PROFILE_BG`、`EDUCATION_CERT` | 资料媒体类型 |
| `VoiceIntroStatus` | `NOT_SUBMITTED`、`VOICE_PENDING`、`VOICE_APPROVED`、`VOICE_REJECTED` | 语音介绍审核状态 |
| `OpenTextField` | `ABOUT_ME`、`HOPE_THEY_KNOW`、`PROFILE_QA` | 开放性文字字段，仅指关于我、希望 TA 了解、资料问答等自由输入文本；标签字典和语音介绍不进入开放性文字审核 |
| `EducationMethod` | `CHSI`、`ONLINE_CODE`、`DIPLOMA_NO`、`MATERIAL_UPLOAD` | 学历认证方式 |

## 3. 错误码

| 错误码 | 场景 | 前端处理 |
|--------|------|----------|
| `UNAUTHORIZED` | token 缺失/过期 | 返回登录 |
| `AUTH_PROTOCOL_REQUIRED` | 未勾选协议 | 停留登录页并提示勾选协议 |
| `AUTH_SMS_INVALID` | 验证码错误/过期 | 展示错误文案 |
| `PROFILE_STEP_INVALID` | 首登步骤不合法 | 重新拉取 `init-status` |
| `PROFILE_REQUIRED_MISSING` | 必填资料缺失 | 标记缺失字段 |
| `REGION_NOT_SUPPORTED` | 海外/国家/港澳台地区 | 提示暂不支持，引导选择中国大陆 |
| `MEDIA_LIMIT_EXCEEDED` | 相册数量超过配置 | 提示删除后再上传 |
| `MEDIA_TYPE_INVALID` | 媒体类型错误 | 阻止提交 |
| `VOICE_UPLOAD_REQUIRED` | 语音介绍缺少音频 URL | 提示重新录制或重新上传 |
| `VOICE_DURATION_INVALID` | 语音介绍时长不在 10-60 秒 | 阻止提交并提示重新录制 |
| `VOICE_SAFETY_REJECTED` | 音频内容安全机审失败 | 隐藏语音，展示失败原因并引导重录 |
| `VOICE_NOT_FOUND` | 删除语音时当前没有有效语音 | 刷新资料详情 |
| `TEXT_TOO_SHORT` / `TEXT_TOO_LONG` | 开放性文字长度不符合 | 标记文本框 |
| `REALNAME_ID_CARD_INVALID` | 身份证号格式不正确 | 提示身份证号错误 |
| `REALNAME_PHONE_REQUIRED` | 实名认证缺少绑定手机号 | 引导绑定/手机号登录 |
| `EDUCATION_REALNAME_REQUIRED` | 未实名先提交学历 | 引导先实名认证 |
| `EDUCATION_MATERIAL_REQUIRED` | 学历材料缺失 | 标记材料字段 |
| `CORE_ACCESS_BLOCKED` | 核心能力未开放 | 展示核心准入拦截页 |

## 4. 接口清单

### 4.1 微信登录

| 项 | 内容 |
|----|------|
| Method | `POST` |
| Path | `/miniapp/auth/wechat-login` |
| UI 参考 | 登录、微信授权登录、授权说明、拒绝授权 |
| 请求 | `code, encryptedData, iv, agreeProtocol` |
| 响应 | `token, userId, isNewUser, firstLoginCompleted, nextStep, accessStatus` |
| 前端建议 | 协议未勾选不发请求；授权失败展示登录错误态 |

```json
{
  "code": "wx-code",
  "encryptedData": "encrypted",
  "iv": "iv",
  "agreeProtocol": true
}
```

### 4.2 手机号登录

| 项 | 内容 |
|----|------|
| Method | `POST` |
| Path | `/miniapp/auth/phone-login` |
| UI 参考 | 手机号登录、手机号登录-点亮、手机号登录-错误提示 |
| 请求 | `phone, smsCode, agreeProtocol` |
| 响应 | 同微信登录 |
| 前端建议 | 验证码错误时只清空验证码，不清空手机号 |

### 4.3 首登资料状态

| 项 | 内容 |
|----|------|
| Method | `GET` |
| Path | `/miniapp/profile/init-status` |
| UI 参考 | 登录-性别、年龄、身份、学历、地址 |
| 请求 | 无 |
| 响应 | `currentStep, completedSteps[], savedFields, nextAction` |
| 前端建议 | 用于断点续填；不要用本地缓存覆盖服务端状态 |

### 4.4 保存首登轻量资料

| 项 | 内容 |
|----|------|
| Method | `POST` |
| Path | `/miniapp/profile/init-save` |
| UI 参考 | 性别选择、出生日期、身份选择、学历选择、现居地 |
| 请求 | `step` + 当前步骤字段 |
| 响应 | `currentStep, nextStep, completedSteps[], savedFields` |
| 前端建议 | 非必填字段可传空；地址只允许中国大陆行政区 |

字段：
- `step=1`：`gender`
- `step=2`：`birthday`
- `step=3`：`identity`
- `step=4`：`educationLevel`
- `step=5`：`locationProvince, locationCity, locationDistrict`

### 4.5 完成首登资料

| 项 | 内容 |
|----|------|
| Method | `POST` |
| Path | `/miniapp/profile/init-complete` |
| UI 参考 | 基本资料页 |
| 请求 | 首登最终字段 |
| 响应 | `ProfileDetailVO` |
| 前端建议 | 成功后进入头像/自我介绍/三重认证强引导 |

### 4.6 查询资料详情

| 项 | 内容 |
|----|------|
| Method | `GET` |
| Path | `/miniapp/profile/detail` |
| UI 参考 | 编辑资料总页、基础资料编辑页、扩展资料页 |
| 响应 | 用户主资料、媒体、文字审核、认证状态、准入状态 |
| 前端建议 | APP-14/15/16 当前缺 UI 图，按此接口驱动后续页面 |

核心字段：
- 基础资料：`nickname, avatar, gender, birthday, height, weight, occupation, annualIncome`
- 地区：`locationProvince, locationCity, locationDistrict, hometownProvince, hometownCity, hometownDistrict`
- 婚恋：`identity, maritalStatus, emotionalStatus, datingGoal, childrenPlan, wantChild`
- 学历：`school, major, educationLevel`
- 扩展：`aboutMe, hopeTheyKnow, voiceIntroUrl, voiceIntroDuration, voiceIntroAuditStatus, voiceIntroRejectReason, mbtiType, tags, photos, profileBgImage`

### 4.7 更新资料

| 项 | 内容 |
|----|------|
| Method | `PATCH` |
| Path | `/miniapp/profile` |
| 请求 | 任意可编辑字段，`null` 不更新 |
| 响应 | `ProfileDetailVO` |
| 前端建议 | 修改头像/资料图片/开放性文字后，按返回状态展示审核中 |

### 4.8 上传/提交资料媒体

| 项 | 内容 |
|----|------|
| Method | `POST` |
| Path | `/miniapp/profile/media` |
| UI 参考 | 添加头像、选择相册、裁剪照片、资料背景图 |
| 请求 | `mediaType, mediaUrl, thumbUrl, sortOrder` |
| 响应 | `mediaId, mediaType, mediaUrl, auditStatus, auditSource, rejectReason` |
| 前端建议 | `PROFILE_BG` 进入资料图片审核，但不计入相册张数 |

### 4.9 删除资料媒体

| 项 | 内容 |
|----|------|
| Method | `DELETE` |
| Path | `/miniapp/profile/media/{id}` |
| 响应 | `R<Void>` |
| 前端建议 | 删除当前有效图后重新拉取详情 |

### 4.10 提交开放性文字

| 项 | 内容 |
|----|------|
| Method | `POST` |
| Path | `/miniapp/profile/open-text` |
| UI 参考 | 自我介绍、开放性文字相关区域 |
| 请求 | `fieldName, contentText` |
| 响应 | `fieldName, auditStatus, auditSource, rejectReason` |
| 前端建议 | `PENDING` 时显示审核中；`REJECTED` 展示驳回原因并允许重填 |

### 4.10.1 提交语音介绍

| 项 | 内容 |
|----|------|
| Method | `POST` |
| Path | `/miniapp/profile/voice-intro` |
| UI 参考 | 语音介绍、扩展资料 |
| 请求 | `voiceUrl, duration` |
| 响应 | `voiceIntroUrl, voiceIntroDuration, voiceIntroAuditStatus, voiceIntroRejectReason, visibleToPublic` |
| 前端建议 | 只允许提交 10-60 秒语音；提交成功但未机审通过时本人侧显示处理中，对外资料页隐藏新语音；通过后展示播放器和时长；失败时展示原因并引导重录；本期不展示语音转文字 |

```json
{
  "voiceUrl": "https://asset.example.com/voice/user-1-intro.m4a",
  "duration": 32
}
```

响应示例：

```json
{
  "voiceIntroUrl": null,
  "voiceIntroDuration": 32,
  "voiceIntroAuditStatus": "VOICE_PENDING",
  "voiceIntroRejectReason": null,
  "visibleToPublic": false
}
```

状态展示规则：
- `VOICE_PENDING`：本人侧显示“处理中”，对外隐藏新语音；如果已有旧的 `VOICE_APPROVED` 语音，则对外继续展示旧语音。
- `VOICE_APPROVED`：对外展示语音播放器、`voiceIntroUrl` 和 `voiceIntroDuration`。
- `VOICE_REJECTED`：对外隐藏，展示 `voiceIntroRejectReason`，允许重新录制/上传。
- 本期不接语音转文字能力，不返回、不展示语音转写文本。

### 4.10.2 删除语音介绍

| 项 | 内容 |
|----|------|
| Method | `DELETE` |
| Path | `/miniapp/profile/voice-intro` |
| 响应 | `R<Void>` |
| 前端建议 | 删除成功后重新拉取 `/miniapp/profile/detail`；资料页不再展示语音介绍 |

### 4.11 三重认证状态

| 项 | 内容 |
|----|------|
| Method | `GET` |
| Path | `/miniapp/verify/status` |
| UI 参考 | 三重认证、顺序提示、未认证 |
| 响应 | 三项认证状态、驳回原因、提交时间、`verifyLevel`、`coreAccessStatus` |
| 前端建议 | 学历认证入口在实名提交/通过规则满足后再点亮 |

### 4.12 头像认证

| 项 | 内容 |
|----|------|
| Method | `POST` |
| Path | `/miniapp/verify/avatar` |
| 请求 | `mediaId` |
| 响应 | `VerificationStatusVO` |
| 前端建议 | 上传头像成功后提交；返回 `PENDING` 展示审核中 |

### 4.13 实名认证

| 项 | 内容 |
|----|------|
| Method | `POST` |
| Path | `/miniapp/verify/real-name` |
| UI 参考 | 实名认证-身份证、身份证点亮 |
| 请求 | `realName, idCard, singlePromise` |
| 响应 | `VerificationStatusVO` |
| 前端建议 | 字段文案统一“身份证号”；UI 中“证件号码”后续待调整，不影响接口 |

```json
{
  "realName": "张三",
  "idCard": "110101199001011234",
  "singlePromise": true
}
```

### 4.14 学历认证

| 项 | 内容 |
|----|------|
| Method | `POST` |
| Path | `/miniapp/verify/education` |
| UI 参考 | 学历认证在校学生、中国大陆、学信网验证码、毕业证编号、上传证书 |
| 请求 | `educationMethod, school, studentStatus, verificationCode, diplomaNo, materialIds[]` |
| 响应 | `VerificationStatusVO` |
| 前端建议 | 未实名时先跳实名认证；材料不足时保留已填表单 |

### 4.15 核心准入状态

| 项 | 内容 |
|----|------|
| Method | `GET` |
| Path | `/miniapp/profile/access-status` |
| UI 参考 | 核心准入拦截态、未认证 |
| 响应 | `canBrowseCards, canMatch, canMessage, canCommunity, coreAccessStatus, blockReasons[]` |
| 前端建议 | 核心功能入口前调用；`NON_CORE_ONLY` 只允许白名单/非核心能力 |

### 4.16 PRD-01 配置

| 项 | 内容 |
|----|------|
| Method | `GET` |
| Path | `/miniapp/config/prd01` |
| 响应 | `requiredFields, uploadLimits, regionScope, auditPolicy, openTextFields` |
| 前端建议 | 不要硬编码相册张数、文字长度、字段必填规则 |

响应字段示例：

```json
{
  "requiredFields": ["gender", "birthday", "height", "datingGoal", "emotionalStatus", "educationLevel", "locationProvince", "locationCity"],
  "uploadLimits": {
    "albumMaxCount": 6,
    "voiceMinDuration": 10,
    "voiceMaxDuration": 60
  },
  "regionScope": {
    "supportsOverseas": false
  },
  "auditPolicy": {
    "voiceProvider": "MOCK",
    "textProvider": "MOCK"
  },
  "openTextFields": ["ABOUT_ME", "HOPE_THEY_KNOW", "PROFILE_QA"]
}
```

## 5. 完整度评分清单

| 场景 | 必须覆盖 |
|------|----------|
| 登录 | 微信、手机号、协议未勾选、授权失败、验证码错误 |
| 轻量资料 | 5 步保存、断点续填、非必填空值、海外/国家拦截 |
| 强引导资料 | 基本资料、头像、自我介绍、资料图片、背景图、扩展资料 |
| 语音介绍 | 10-60 秒提交、机审中、通过展示、失败重录、删除、Provider 不可用时 pending |
| 三重认证 | 头像、实名、学历、顺序限制、驳回重提、审核中 |
| 核心准入 | 未认证拦截、部分完成、三项通过、冻结账号、稍后再说 |
| 异常 | token 过期、参数错误、第三方失败、重复提交、材料缺失 |
| 文档证据 | 每个接口有请求、响应、错误码、UI 参考和前端建议 |

移动端接口完整度目标：`通过场景数 / 场景总数 * 100% >= 95%`。任一 P0 主链路缺失时不得达标。
