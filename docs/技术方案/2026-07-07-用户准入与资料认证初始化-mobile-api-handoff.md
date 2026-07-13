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
| `AuditStatus` | `PENDING`、`REVIEWING`、`APPROVED`、`REJECTED`、`EXPIRED` | 实名、头像、学历、资料图片、开放性文字、语音介绍统一审核状态；无记录由业务派生为未认证/未提交/不展示 |
| `VerificationStatus` | 同 `AuditStatus`，另支持无记录派生 `NOT_CERTIFIED` | 实名/学历/头像认证接口展示口径 |
| `ModerationStatus` | 同 `AuditStatus` | 资料图片/开放性文字审核接口展示口径 |
| `AccountStatus` | `NORMAL`、`FROZEN`、`CANCELLING`、`CANCELLED` | 账号状态 |
| `CoreAccessStatus` | `CORE_ALLOWED`、`CORE_BLOCKED`、`NON_CORE_ONLY` | 核心准入 |
| `MediaType` | `AVATAR`、`ALBUM`、`PROFILE_BG` | 资料媒体类型；学历材料 URL 随一次学历认证整体提交，不单独生成审核记录 |
| `VoiceIntroStatus` | 同 `AuditStatus`；无记录不返回审核记录 | 语音介绍审核状态 |
| `OpenTextField` | `ABOUT_ME`、`HOPE_THEY_KNOW`、`PROFILE_QA` | 开放性文字字段，仅指关于我、希望 TA 了解、资料问答等自由输入文本；标签字典和语音介绍不进入开放性文字审核 |
| `EducationMethod` | `STUDENT_CARD`、`CHSI`、`DIPLOMA_NO`、`MATERIAL_UPLOAD` | 在校证明、学信网验证码、证书编号、上传证书材料 |

## 3. 错误码

| 错误码 | 场景 | 前端处理 |
|--------|------|----------|
| `UNAUTHORIZED` | token 缺失/过期 | 返回登录 |
| `AUTH_PROTOCOL_REQUIRED` | 未勾选协议 | 停留登录页并提示勾选协议 |
| `AUTH_SMS_COOLDOWN` | 未到再次发送倒计时 | 禁用获取验证码按钮，按 `smsSecurity.sendCountdownSeconds` 倒计时 |
| `AUTH_SMS_DAILY_LIMIT` | 当日验证码发送次数已达上限 | 提示明日再试或联系客服 |
| `AUTH_SMS_SEND_FAILED` | 短信三方通道发送失败 | 提示稍后重试 |
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

### 4.2 发送手机号验证码

| 项 | 内容 |
|----|------|
| Method | `POST` |
| Path | `/miniapp/auth/sms-code` |
| UI 参考 | 手机号登录、获取验证码、验证码倒计时 |
| 请求 | `phone` |
| 响应 | `countdownSeconds, validMinutes, dailyLimit, dailyRemaining, providerCode` |
| 前端建议 | 点击获取验证码前先读取 `/miniapp/config/prd01` 的 `smsSecurity` 展示倒计时和有效期；发送成功后按钮进入倒计时 |

请求示例：

```json
{
  "phone": "13800138000"
}
```

响应示例：

```json
{
  "countdownSeconds": 60,
  "validMinutes": 5,
  "dailyLimit": 10,
  "dailyRemaining": 9,
  "providerCode": "MOCK"
}
```

说明：
- 验证码有效期、倒计时、每日次数从后台“准入与认证配置 / 安全策略”读取，配置键为 `prd01.security.sms.rules`。
- 当前联调默认短信 Provider 为 `MOCK`，发送接口会写入 Redis，mock 验证码固定为 `000000`；接入真实短信三方时不改变移动端接口。
- 登录成功后验证码立即消费；过期、错误、未发送均返回 `AUTH_SMS_INVALID`。

### 4.3 手机号登录

| 项 | 内容 |
|----|------|
| Method | `POST` |
| Path | `/miniapp/auth/phone-login` |
| UI 参考 | 手机号登录、手机号登录-点亮、手机号登录-错误提示 |
| 请求 | `phone, smsCode, agreeProtocol` |
| 响应 | 同微信登录 |
| 前端建议 | 必须先调用 `/miniapp/auth/sms-code`；验证码错误时只清空验证码，不清空手机号 |

### 4.4 首登资料状态

| 项 | 内容 |
|----|------|
| Method | `GET` |
| Path | `/miniapp/profile/init-status` |
| UI 参考 | 登录-性别、年龄、身份、学历、地址 |
| 请求 | 无 |
| 响应 | `currentStep, completedSteps[], savedFields, nextAction` |
| 前端建议 | 用于断点续填；不要用本地缓存覆盖服务端状态 |

### 4.5 提交首登当前步骤

| 项 | 内容 |
|----|------|
| Method | `POST` |
| Path | `/miniapp/profile/init-step` |
| UI 参考 | 性别选择、出生日期、身份选择、学历选择、现居地 |
| 请求 | `step` + 当前步骤字段 |
| 响应 | `currentStep, nextStep, completedSteps[], savedFields` |
| 前端建议 | 每页只提交当前步骤字段；页面跳转只使用响应中的 `nextStep`，不得在前端写死顺序；地址只允许中国大陆行政区 |

字段：
- `step=1`：`gender`
- `step=2`：`birthday`（UI 展示为年龄，服务端按生日计算年龄）
- `step=3`：`identity`
- `step=4`：`educationLevel`
- `step=5`：`locationProvince, locationCity, locationDistrict`

### 4.6 首登完成规则

| 项 | 内容 |
|----|------|
| 完成方式 | 最后一个可见步骤调用 `/miniapp/profile/init-step` 成功后，由后端自动完成 |
| 完成响应 | `firstLoginCompleted=true, nextStep=null, nextAction=COMPLETED` |
| 前端处理 | 根据最后一步返回的完成状态进入首页或后续认证引导 |
| 后端校验 | 统一校验所有“展示且必填”字段，并设置 `first_login_completed=1`、`first_login_next_step=NULL` |

### 4.7 查询基础资料完善页

| 项 | 内容 |
|----|------|
| Method | `GET` |
| Path | `/miniapp/profile/basic` |
| 鉴权 | `X-Auth-Token` |
| UI 参考 | `APP-01-PAGE-verify-basic` 基本资料页 |
| 响应 | 当前基础资料、年龄范围、资料完整度、字段展示/必填/编辑配置、缺失必填项和下一动作 |

调用规则：

1. 首登五步完成后调用本接口反显性别、生日、身份、学历和现居地，并加载其他基础资料。
2. 字段按 `fieldSettings.visible` 渲染，按 `required` 控制提交；性别可在基础资料页修改，取值为 `MALE/FEMALE`。
3. 身份、学历、行业、职业、年收入、婚姻状况的中文选项调用 `/miniapp/dict/profile-options`；省市区按 `/miniapp/dict/locations` 逐级懒加载。
4. `missingRequiredFields` 为空时 `basicProfileCompleted=true`、`nextAction=ADD_AVATAR`；否则继续停留基础资料页。

### 4.8 保存基础资料完善页

| 项 | 内容 |
|----|------|
| Method | `PUT` |
| Path | `/miniapp/profile/basic` |
| 鉴权 | `X-Auth-Token` |
| 请求 | `BasicProfileSaveReq`，提交当前页面所有展示字段 |
| 响应 | 更新后的 `BasicProfileVO` |
| 成功后 | `nextAction=ADD_AVATAR` 时进入添加头像页 |

保存语义：

- 这是基础资料完整表单保存，不是任意字段 PATCH；展示字段传 `null`/空字符串表示清空，隐藏字段即使提交也不改写数据库。
- 性别在请求中提交，只接受 `MALE/FEMALE`，后端统一规范化为大写 code。
- 展示且必填字段缺失、字典 code 无效或停用、生日/身高/体重/文本长度不合法时，整次保存失败，不写入数据库。
- `identity`、`educationLevel`、`industry`、`occupation`、`annualIncome`、`maritalStatus` 只接收 code；业务表不保存中文标签。
- 现居地、家乡只接收中国大陆地区 code，不支持海外、国家、港澳台入口。

### 4.9 查询资料详情

| 项 | 内容 |
|----|------|
| Method | `GET` |
| Path | `/miniapp/profile/detail` |
| UI 参考 | 编辑资料总页、基础资料编辑页、扩展资料页 |
| 响应 | 用户主资料、媒体、文字审核、认证状态、准入状态 |
| 前端建议 | APP-14/15/16 当前缺 UI 图，按此接口驱动后续页面 |

核心字段：
- 基础资料：`nickname, avatar, gender, birthday, height, weight, industry, occupation, company, annualIncome`
- 地区：`locationProvince, locationCity, locationDistrict, hometownProvince, hometownCity, hometownDistrict`
- 婚恋：`identity, maritalStatus, emotionalStatus, datingGoal, childrenPlan, wantChild`
- 学历：`school, major, educationLevel`
- 扩展：`aboutMe, hopeTheyKnow, voiceIntroUrl, voiceIntroDuration, voiceIntroAuditStatus, voiceIntroRejectReason, mbtiType, tags, photos, profileBgImage`

### 4.10 更新资料

| 项 | 内容 |
|----|------|
| Method | `PATCH` |
| Path | `/miniapp/profile` |
| 请求 | 任意可编辑字段，`null` 不更新 |
| 响应 | `ProfileDetailVO` |
| 前端建议 | 主头像使用 `/miniapp/profile/avatar`；资料图片、开放性文字修改后按返回状态展示审核中 |

### 4.11 添加头像并提交审核

| 项 | 内容 |
|----|------|
| Method | `POST` |
| Path | `/miniapp/profile/avatar` |
| Content-Type | `application/json` |
| UI 参考 | 添加头像、选择相册、裁剪照片、头像审核 |
| 请求 | `avatarSource, avatarUrl, thumbUrl` |
| 响应 | `auditRecordId, auditStatus, auditSource` |
| 前端建议 | 页面初始化先查询当前头像和审核状态；客户端完成拍照/相册选择、裁剪和文件上传后调用本接口，成功后刷新头像与审核状态并进入自我介绍页 |

#### 当前头像查询与页面调用顺序

| 用途 | Method | Path | 关键响应字段 | 说明 |
|------|--------|------|--------------|------|
| 查询本人当前头像 | `GET` | `/miniapp/profile/detail` | `avatar` | 返回当前登录用户本人侧头像 URL；未上传时为 `null`，审核中的新头像也用于本人预览 |
| 查询头像审核状态 | `GET` | `/miniapp/verify/status` | `avatarVerifyStatus, avatarVerifyRejectReason, avatarVerifySubmitTime, avatarCanSubmit` | 移动端根据最新头像审核记录展示状态、原因和提交权限 |

添加头像页面调用顺序：

1. 页面初始化调用 `GET /miniapp/profile/detail`，使用 `avatar` 展示本人当前头像。
2. 同时调用 `GET /miniapp/verify/status`，获取头像审核状态和 `avatarCanSubmit`。
3. `avatarCanSubmit=true` 时，用户选择拍照或相册、完成裁剪，并通过现有文件上传链路取得公网 URL。
4. 调用 `POST /miniapp/profile/avatar` 提交新头像并生成审核记录。
5. 提交成功后重新调用资料详情和认证状态接口，刷新头像及“审核中”状态。

展示口径：`/miniapp/profile/detail` 只用于当前登录用户本人查看资料；本人可以预览刚提交的审核中头像。其他用户头像展示和头像认证生效判断只认最新 `AVATAR（头像认证）` 审核记录，最新记录不是 `APPROVED（已通过）` 时不得对外展示，也不得回退旧的已通过头像。

请求示例：

```json
{
  "avatarSource": "ALBUM",
  "avatarUrl": "https://static.example.com/avatar/cropped.jpg",
  "thumbUrl": "https://static.example.com/avatar/cropped-thumb.jpg"
}
```

响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "auditRecordId": 101,
    "auditStatus": "PENDING",
    "auditSource": "MACHINE"
  }
}
```

处理规则：

1. 本接口不接收本地临时文件；`avatarUrl` 必须是客户端裁剪并上传成功后的 `http/https` 地址。
2. `avatarSource` 只允许 `CAMERA（拍照）`、`ALBUM（相册）`。
3. 一次调用只新增一条 `AVATAR（头像认证）/PENDING（待审核）` 审核记录和一条 `SUBMIT（提交审核）` 历史；本人侧当前头像由最新审核记录实时返回，不写 `app_user.avatar` 快照。
4. 最新头像记录为 `PENDING（待审核）` 或 `REVIEWING（审核中）` 时禁止重复提交；移动端统一展示“审核中”。
5. 新记录不会修改旧审核记录。头像认证和对外生效只判断最新头像记录，最新记录未通过时不得按旧通过记录兜底。
6. 审核状态后续统一通过 `GET /miniapp/verify/status` 查询。

### 4.11.1 上传/提交其他资料媒体

| 项 | 内容 |
|----|------|
| Method | `POST` |
| Path | `/miniapp/profile/media` |
| UI 参考 | 相册照片、资料背景图 |
| 请求 | `mediaType, mediaUrl, thumbUrl, sortOrder` |
| 响应 | `mediaId, mediaType, mediaUrl, auditStatus, auditSource, rejectReason` |
| 前端建议 | 仅支持 `ALBUM`、`PROFILE_BG`；主头像和学历认证使用各自专用提交接口 |

### 4.12 删除资料媒体

| 项 | 内容 |
|----|------|
| Method | `DELETE` |
| Path | `/miniapp/profile/media/{id}` |
| 响应 | `R<Void>` |
| 前端建议 | 删除当前有效图后重新拉取详情 |

### 4.13 提交自我介绍

| 项 | 内容 |
|----|------|
| Method | `POST` |
| Path | `/miniapp/profile/introduction` |
| UI 参考 | 认证-自我介绍、认证-自我介绍-填写内容 |
| 请求 | `aboutMe` |
| 响应 | `fieldName=ABOUT_ME, auditStatus, auditSource, rejectReason` |
| 前端建议 | 20-300 字才允许提交；提交成功后进入三重认证页；待审核/审核中不允许重复提交；驳回或失效后反显原文和原因并允许重提 |

```json
{
  "aboutMe": "我是一个认真真诚的人，平时喜欢阅读、徒步和做饭，也愿意倾听和分享生活。"
}
```

新内容只有审核通过后才更新对外资料；已有旧的通过内容时，新内容待审或驳回不覆盖旧内容。

### 4.13.1 提交其他开放性文字

| 项 | 内容 |
|----|------|
| Method | `POST` |
| Path | `/miniapp/profile/open-text` |
| UI 参考 | 希望 TA 了解、资料问答开放回答 |
| 请求 | `fieldName, contentText` |
| 响应 | `fieldName, auditStatus, auditSource, rejectReason` |
| 前端建议 | `PENDING` 时显示审核中；`REJECTED` 展示驳回原因并允许重填 |

### 4.13.2 提交语音介绍

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
  "voiceIntroAuditStatus": "REVIEWING",
  "voiceIntroRejectReason": null,
  "visibleToPublic": false
}
```

状态展示规则：
- `PENDING` / `REVIEWING`：本人侧显示“审核中”，对外隐藏新语音；如果已有旧的 `APPROVED` 语音，则对外继续展示旧语音。
- `APPROVED`：对外展示语音播放器、`voiceIntroUrl` 和 `voiceIntroDuration`。
- `REJECTED` / `EXPIRED`：对外隐藏新语音，展示 `voiceIntroRejectReason` 或失效原因，允许重新录制/上传。
- 本期不接语音转文字能力，不返回、不展示语音转写文本。

### 4.13.3 删除语音介绍

| 项 | 内容 |
|----|------|
| Method | `DELETE` |
| Path | `/miniapp/profile/voice-intro` |
| 响应 | `R<Void>` |
| 前端建议 | 删除成功后重新拉取 `/miniapp/profile/detail`；资料页不再展示语音介绍 |

### 4.14 三重认证状态

| 项 | 内容 |
|----|------|
| Method | `GET` |
| Path | `/miniapp/verify/status` |
| UI 参考 | 三重认证、顺序提示、未认证 |
| 响应 | 三项认证状态、原因、提交时间、提交权限、学历阻断原因、`verifyLevel`、`coreAccessStatus` |
| 前端建议 | `PENDING/REVIEWING` 统一显示“审核中”；学历入口严格使用 `educationCanSubmit` 和 `educationBlockedReason` |

### 4.15 实名认证

| 项 | 内容 |
|----|------|
| Method | `POST` |
| Path | `/miniapp/verify/real-name` |
| UI 参考 | 实名认证-身份证、身份证点亮 |
| 请求 | `realName, idCardNo, singleCommitmentChecked`；手机号由后端读取当前账号绑定手机号，不允许客户端传入 |
| 响应 | `VerificationStatusVO` |
| 前端建议 | 字段文案统一“身份证号”；UI 中“证件号码”后续待调整，不影响接口 |

```json
{
  "realName": "张三",
  "idCardNo": "110101199001011234",
  "singleCommitmentChecked": true
}
```

### 4.16 学历认证

| 项 | 内容 |
|----|------|
| Method | `POST` |
| Path | `/miniapp/verify/education` |
| UI 参考 | 学历认证在校学生、中国大陆、学信网验证码、毕业证编号、上传证书 |
| 请求 | `educationUserType, educationMethod, schoolName, educationLevel, chsiCode, diplomaNo, certificateName, materialUrls[], educationAgreementChecked` |
| 响应 | `VerificationStatusVO` |
| 前端建议 | 先读取 `/miniapp/verify/status`；实名待审核/审核中/已通过才允许提交；材料 URL 随本次学历认证整体提交，不要逐图生成学历审核记录 |

调用顺序：

1. 进入三重认证页调用 `GET /miniapp/verify/status`。
2. 实名未提交、已驳回或已失效时，先调用 `POST /miniapp/verify/real-name`；手机号由服务端取登录账号绑定值。
3. 实名状态为 `PENDING`、`REVIEWING` 或 `APPROVED`，且 `educationCanSubmit=true` 时，进入学历认证。
4. 在校生使用 `STUDENT + STUDENT_CARD`；中国大陆毕业生从 `CHSI`、`DIPLOMA_NO`、`MATERIAL_UPLOAD` 中选择一种。
5. 学历提交成功后重新调用状态接口；待审核/审核中期间禁止重复提交，驳回或失效后允许重提。
6. 三项认证均通过时 `verifyLevel=3`、`coreAccessStatus=CORE_ALLOWED`。

### 4.17 核心准入状态

| 项 | 内容 |
|----|------|
| Method | `GET` |
| Path | `/miniapp/profile/access-status` |
| UI 参考 | 核心准入拦截态、未认证 |
| 响应 | `canBrowseCards, canMatch, canMessage, canCommunity, coreAccessStatus, blockReasons[]` |
| 前端建议 | 核心功能入口前调用；`NON_CORE_ONLY` 只允许白名单/非核心能力 |

### 4.18 PRD-01 配置

| 项 | 内容 |
|----|------|
| Method | `GET` |
| Path | `/miniapp/config/prd01` |
| 响应 | `initFields, requiredFields, uploadLimits, regionScope, auditPolicy, smsSecurity, openTextFields` |
| 前端建议 | 不要硬编码相册张数、验证码倒计时、验证码有效期、每日次数、地区字典入口、文字长度、字段必填规则 |

响应字段示例：

```json
{
  "initFields": [
    {
      "step": 1,
      "fieldId": "gender",
      "label": "性别",
      "visible": true,
      "required": true,
      "allowEmpty": false,
      "submitFields": ["gender"]
    },
    {
      "step": 2,
      "fieldId": "birthday",
      "label": "年龄",
      "visible": true,
      "required": true,
      "allowEmpty": false,
      "submitFields": ["birthday"]
    },
    {
      "step": 3,
      "fieldId": "identity",
      "label": "身份",
      "visible": true,
      "required": false,
      "allowEmpty": true,
      "submitFields": ["identity"]
    },
    {
      "step": 4,
      "fieldId": "educationLevel",
      "label": "学历",
      "visible": true,
      "required": false,
      "allowEmpty": true,
      "submitFields": ["educationLevel"]
    },
    {
      "step": 5,
      "fieldId": "location",
      "label": "地址",
      "visible": true,
      "required": false,
      "allowEmpty": true,
      "submitFields": ["locationProvince", "locationCity", "locationDistrict"]
    }
  ],
  "requiredFields": ["gender", "birthday"],
  "uploadLimits": {
    "educationMaterialMaxCount": 4,
    "educationMaterialMaxMb": 10,
    "albumMaxCount": 9,
    "albumMaxMb": 10,
    "profileBgMaxCount": 1,
    "profileBgMaxMb": 10,
    "imageFormats": ["jpg", "jpeg", "png"],
    "voiceMinDuration": 10,
    "voiceMaxDuration": 60
  },
  "regionScope": {
    "supportsOverseas": false,
    "supportsLocation": true,
    "locationDictPath": "/miniapp/dict/locations"
  },
  "auditPolicy": {
    "educationSlaHours": 24,
    "educationSlaText": "学历材料审核预计 24 小时内完成"
  },
  "smsSecurity": {
    "sendCountdownSeconds": 60,
    "validMinutes": 5,
    "dailySendLimit": 10,
    "providerCode": "MOCK"
  },
  "openTextFields": ["ABOUT_ME", "HOPE_THEY_KNOW", "PROFILE_QA"]
}
```

### 4.20 中国大陆地区字典

| 项 | 内容 |
|----|------|
| Method | `GET` |
| Path | `/miniapp/dict/locations` |
| 鉴权 | 公开接口，和 `/miniapp/config/prd01` 一样不要求登录 |
| 查询参数 | `parentCode`，非必填；不传返回省，传省编码返回市，传市编码返回区县 |
| 响应 | `RegionOptionVO[]`，每次只返回当前一级，不嵌套返回完整地区树 |
| 前端建议 | 打开地址选择器先查省，用户选择后再按编码查下一级；定位授权和逆地理解析由小程序前端完成 |

响应示例：

```json
[{"code":"410000","name":"河南省","level":"PROVINCE","hasChildren":true}]
```

选择河南省后请求 `GET /miniapp/dict/locations?parentCode=410000`：

```json
[{"code":"410100","name":"郑州市","level":"CITY","hasChildren":true}]
```

选择郑州市后请求 `GET /miniapp/dict/locations?parentCode=410100`：

```json
[{"code":"410105","name":"金水区","level":"DISTRICT","hasChildren":false}]
```

说明：
- 字典来源为 `sys_dict_type/sys_dict_data`，字典类型 `china_region`。
- 接口按父级编码懒加载，任何一次请求都不会返回全部省市区数据。
- 首版只返回中国大陆省市区，不返回海外、国家、港澳台入口。
- 后端保存资料时仍会做海外/国家/港澳台兜底拦截，避免前端绕过。

### 4.21 用户资料业务字典

| 项 | 内容 |
|----|------|
| Method | `GET` |
| Path | `/miniapp/dict/profile-options` |
| 鉴权 | 公开接口，不要求登录 |
| 响应 | 身份、学历、行业、职业、年收入、婚姻状况六类选项；每项包含 `code` 和 `label` |
| 前端要求 | 页面展示 `label`，提交及本地选中值使用 `code`；禁止提交中文标签 |

响应示例：

```json
{
  "identity": [{"code":"STUDENT","label":"在校生"},{"code":"WORKER","label":"职场人"}],
  "educationLevel": [{"code":"BACHELOR","label":"本科"}],
  "industry": [{"code":"IT_INTERNET","label":"IT/互联网"}],
  "occupation": [{"code":"ENGINEER","label":"工程师"}],
  "annualIncome": [{"code":"FROM_150K_TO_300K","label":"15-30万"}],
  "maritalStatus": [{"code":"SINGLE","label":"未婚"}]
}
```

字典类型与业务字段：

| 业务字段 | 字典类型 | code 示例 |
|---------|----------|-----------|
| `identity` | `app_identity` | `STUDENT`、`WORKER` |
| `educationLevel` | `app_education_level` | `DOCTOR`、`MASTER`、`BACHELOR`、`COLLEGE`、`HIGH_SCHOOL`、`JUNIOR_OR_BELOW`、`OTHER` |
| `industry` | `app_industry` | `IT_INTERNET`、`FINANCE`、`EDUCATION_RESEARCH`、`HEALTHCARE`、`MANUFACTURING`、`REAL_ESTATE_CONSTRUCTION`、`GOVERNMENT_PUBLIC`、`CULTURE_MEDIA`、`RETAIL_SERVICE`、`OTHER` |
| `occupation` | `app_occupation` | `PRODUCT_MANAGER`、`ENGINEER`、`TEACHER`、`DESIGNER`、`DOCTOR`、`FINANCE`、`OTHER` |
| `annualIncome` | `app_annual_income` | `BELOW_100K`、`FROM_100K_TO_150K`、`FROM_150K_TO_300K`、`FROM_300K_TO_500K`、`ABOVE_500K`、`OTHER` |
| `maritalStatus` | `app_marital_status` | `SINGLE`、`DIVORCED`、`WIDOWED` |

## 5. 出入参字段说明

### 5.1 通用返回 `R<T>`

| 字段 | 类型 | 必返 | 说明 |
|------|------|------|------|
| `code` | Number | 是 | 业务状态码，`200` 表示成功 |
| `msg` | String | 是 | 成功或失败提示 |
| `data` | Object / Array / null | 否 | 具体业务数据；`R<Void>` 返回时可为空 |

### 5.2 登录与验证码

`POST /miniapp/auth/wechat-login` 请求：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `loginCode` | String | 是 | 微信 `wx.login` 返回的临时 code |
| `phoneCode` | String | 是 | 微信 `getPhoneNumber` 返回的手机号授权 code |
| `agreeProtocol` | Boolean | 是 | 是否勾选登录协议；非 `true` 返回 `AUTH_PROTOCOL_REQUIRED` |

`POST /miniapp/auth/sms-code` 请求：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `phone` | String | 是 | 中国大陆手机号，格式 `^1[3-9]\d{9}$` |

`/miniapp/auth/sms-code` 响应 `PhoneSmsCodeVO`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `countdownSeconds` | Integer | 获取验证码按钮倒计时秒数，取后台安全策略 |
| `validMinutes` | Integer | 验证码有效期分钟数，取后台安全策略 |
| `dailyLimit` | Integer | 每日发送上限，取后台安全策略 |
| `dailyRemaining` | Integer | 当日剩余可发送次数 |
| `providerCode` | String | 当前短信通道编码；联调默认为 `MOCK` |

`POST /miniapp/auth/phone-login` 请求：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `phone` | String | 是 | 中国大陆手机号，必须先调用 `/miniapp/auth/sms-code` |
| `smsCode` | String | 是 | Redis 中未过期验证码；登录成功后立即消费 |
| `agreeProtocol` | Boolean | 是 | 是否勾选登录协议；非 `true` 返回 `AUTH_PROTOCOL_REQUIRED` |

登录响应 `WechatLoginVO`，微信登录和手机号登录共用：

| 字段 | 类型 | 说明 |
|------|------|------|
| `token` | String | 登录 token，后续请求放入 `X-Auth-Token` |
| `userId` | Long | App 用户 ID |
| `openid` | String | 微信 openid；手机号登录为服务端生成的登录标识 |
| `phone` | String | 绑定手机号原值 |
| `maskedPhone` | String | 脱敏手机号 |
| `nickname` | String | 昵称，未填写时为空 |
| `avatar` | String | 头像 URL，未填写时为空 |
| `isNewUser` | Boolean | 本次登录是否创建新用户 |
| `firstLoginCompleted` | Boolean | 是否已完成首登资料初始化 |
| `nextStep` | Integer | 下一步首登步骤；已完成首登时为空 |
| `accessStatus` | Object | 登录后准入能力状态，结构见 `AccessStatusVO` |

### 5.3 首登资料、基础资料与资料详情

`ProfileInitStepReq`，仅用于 `POST /miniapp/profile/init-step`：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `step` | Integer | 是 | 首登步骤号，范围 `1-5` |
| `gender` | String | 按配置 | 性别，`MALE/FEMALE`；首登保存后仍可在基础资料页修改 |
| `birthday` | String | 按配置 | 出生日期，格式 `yyyy-MM-dd`；UI 可展示为年龄选择，服务端计算 `age` |
| `identity` | String | 按配置 | 身份 code，必须命中 `app_identity`，禁止提交中文 |
| `educationLevel` | String | 按配置 | 学历 code，必须命中 `app_education_level`，禁止提交中文 |
| `locationProvince` | String | 按配置 | 现居省，仅支持中国大陆 |
| `locationCity` | String | 按配置 | 现居市，仅支持中国大陆 |
| `locationDistrict` | String | 否 | 现居区县，仅支持中国大陆 |

首登接口不接收昵称、头像、身高、体重、职业、收入、家乡、学校、专业、婚恋资料或开放性文字。基本资料页统一使用 `GET/PUT /miniapp/profile/basic`；扩展资料仍使用独立的 `PATCH /miniapp/profile`。

`ProfileInitStatusVO`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `firstLoginCompleted` | Boolean | 是否已完成首登资料初始化 |
| `currentStep` | Integer | 当前停留步骤 |
| `nextStep` | Integer | 下一步步骤；完成时为空 |
| `completedSteps` | Integer[] | 已完成步骤列表 |
| `nextAction` | String | `CONTINUE_STEP_N` 或 `COMPLETED` |
| `savedFields` | Object | 已保存资料，结构同 `ProfileDetailVO` |

`BasicProfileSaveReq`，仅用于 `PUT /miniapp/profile/basic`：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `nickname` | String | 按配置 | 昵称，2-12 个字符 |
| `gender` | String | 按配置 | 性别，`MALE` 或 `FEMALE`，允许修改 |
| `birthday` | String | 按配置 | `yyyy-MM-dd`，年龄必须在后台 `minAge-maxAge` 范围内 |
| `height` | Integer | 按配置 | 身高，140-220 cm |
| `weight` | Integer | 按配置 | 体重，30-200 kg |
| `identity` | String | 按配置 | 身份字典 code：`app_identity` |
| `educationLevel` | String | 按配置 | 学历字典 code：`app_education_level` |
| `industry` | String | 按配置 | 行业字典 code：`app_industry` |
| `locationProvince` | String | 按配置 | 现居省级地区 code |
| `locationCity` | String | 按配置 | 现居市级地区 code |
| `locationDistrict` | String | 按配置 | 现居区县地区 code |
| `hometownProvince` | String | 按配置 | 家乡省级地区 code |
| `hometownCity` | String | 按配置 | 家乡市级地区 code |
| `hometownDistrict` | String | 按配置 | 家乡区县地区 code |
| `occupation` | String | 按配置 | 职业字典 code：`app_occupation` |
| `company` | String | 按配置 | 公司名称，2-50 个字符 |
| `annualIncome` | String | 按配置 | 年收入字典 code：`app_annual_income` |
| `school` | String | 按配置 | 学校名称，2-50 个字符 |
| `major` | String | 按配置 | 专业名称，最多 100 个字符 |
| `maritalStatus` | String | 按配置 | 婚姻状况字典 code：`app_marital_status` |

> 字段是否必填以本次查询返回的 `fieldSettings` 为准，不以客户端缓存为准。性别可修改，但只接受 `MALE/FEMALE`。

`BasicProfileVO`，用于 `GET/PUT /miniapp/profile/basic`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `userId` | Long | 当前用户 ID |
| `nickname/gender/birthday/age/height/weight` | 对应类型 | 当前基础值；`gender` 可修改，`age` 由服务端计算 |
| `identity/educationLevel/industry/occupation/annualIncome/maritalStatus` | String | 当前字典 code |
| `locationProvince/locationCity/locationDistrict` | String | 当前现居省市区 code |
| `hometownProvince/hometownCity/hometownDistrict` | String | 当前家乡省市区 code |
| `company/school/major` | String | 当前公司、学校、专业 |
| `minAge/maxAge` | Integer | 后台准入年龄配置，缺省为 18/60 |
| `profileScore` | Integer | 保存后重新计算的资料完整度 |
| `basicProfileCompleted` | Boolean | 所有展示且必填字段是否已填写 |
| `nextAction` | String | `COMPLETE_BASIC_PROFILE` 或 `ADD_AVATAR` |
| `missingRequiredFields` | String[] | 当前缺失的必填字段 ID |
| `fieldSettings` | `BasicProfileFieldVO[]` | 字段展示、必填、编辑和校验配置 |

`BasicProfileFieldVO`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `fieldId` | String | 与查询/保存 DTO 一致的字段名 |
| `label` | String | 中文显示名 |
| `fieldType` | String | `input`、`date`、`number`、`region`、`dict`、`select`、`readonly` |
| `visible` | Boolean | 是否展示；为 `false` 时前端不渲染，后端不改写该字段 |
| `required` | Boolean | 是否必填；只有展示字段才可能为 `true` |
| `editable` | Boolean | 是否允许移动端编辑；性别固定为 `false` |
| `dictType` | String | 字典字段对应类型，非字典字段为空 |
| `minValue/maxValue` | Integer | 数字范围，没有时为空 |
| `minLength/maxLength` | Integer | 文本长度范围，没有时为空 |

`ProfileDetailVO`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `userId` | Long | 用户 ID |
| `avatar` | String | 当前头像 URL |
| `nickname` | String | 昵称 |
| `gender` | String | 性别 |
| `birthday` | String | 出生日期，`yyyy-MM-dd` |
| `age` | Integer | 年龄，服务端计算 |
| `height` | Integer | 身高 cm |
| `weight` | Integer | 体重 kg |
| `identity` | String | 身份 code，展示名从 `app_identity` 解析 |
| `industry` | String | 行业 code，展示名从 `app_industry` 解析 |
| `occupation` | String | 职业 code，展示名从 `app_occupation` 解析 |
| `company` | String | 公司名称 |
| `annualIncome` | String | 年收入 code，展示名从 `app_annual_income` 解析 |
| `locationProvince/locationCity/locationDistrict` | String | 现居省/市/区县 |
| `hometownProvince/hometownCity/hometownDistrict` | String | 家乡省/市/区县 |
| `school` | String | 学校 |
| `major` | String | 专业 |
| `educationLevel` | String | 学历 code，展示名从 `app_education_level` 解析 |
| `emotionalStatus` | String | 感情状态 |
| `datingGoal` | String | 脱单目标 |
| `maritalStatus` | String | 婚姻状况 code，展示名从 `app_marital_status` 解析 |
| `childrenPlan` | String | 子女计划 |
| `wantChild` | String | 是否想要孩子 |
| `aboutMe` | String | 关于我 |
| `hopeTheyKnow` | String | 希望 TA 了解 |
| `voiceIntroUrl` | String | 当前可对外展示的语音 URL；未通过时为空 |
| `voiceIntroDuration` | Integer | 语音时长秒 |
| `voiceIntroAuditStatus` | String | 语音审核状态；无记录为 `NOT_SUBMITTED` |
| `voiceIntroRejectReason` | String | 语音驳回/失效原因 |
| `tags` | String | 标签 JSON |
| `photos` | String | 相册 JSON；后续建议按审核记录派生 |
| `profileBgImage` | String | 资料背景图 URL |
| `mbtiType` | String | MBTI |
| `zodiac` | String | 星座，服务端计算 |
| `profileScore` | Integer | 资料完整度分 |
| `firstLoginCompleted` | Boolean | 是否已完成首登 |
| `accessStatus` | Object | 准入状态，结构见 `AccessStatusVO` |

### 5.4 头像、其他媒体、开放文字、语音

`AvatarSubmitReq`：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `avatarSource` | String | 是 | 头像来源：`CAMERA（拍照）`、`ALBUM（相册）` |
| `avatarUrl` | String | 是 | 客户端裁剪并上传后的头像公网 URL，只支持 `http/https` |
| `thumbUrl` | String | 否 | 头像缩略图公网 URL，只支持 `http/https` |

`AvatarSubmitVO`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `auditRecordId` | Long | 本次新增的头像审核记录 ID |
| `auditStatus` | String | 首次提交为 `PENDING（待审核）`，移动端展示“审核中” |
| `auditSource` | String | 首次提交为 `MACHINE（机审）`；后台人工操作后按实际来源更新 |

`ProfileMediaSubmitReq`：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `mediaType` | String | 是 | `ALBUM`、`PROFILE_BG`；头像和学历材料不走本接口 |
| `mediaUrl` | String | 是 | 原图或原始文件 URL |
| `thumbUrl` | String | 否 | 缩略图 URL |
| `sortOrder` | Integer | 否 | 展示顺序 |

`ProfileMediaVO`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `mediaId` | Long | 其他资料媒体审核记录 ID，后续删除或学历材料提交可引用 |
| `mediaType` | String | 媒体类型 |
| `mediaUrl` | String | 原图或原始文件 URL |
| `thumbUrl` | String | 缩略图 URL |
| `sortOrder` | Integer | 展示顺序 |
| `auditStatus` | String | 审核状态 |
| `auditSource` | String | 审核来源：`MACHINE`、`MANUAL` |
| `rejectReason` | String | 驳回原因 |

`OpenTextSubmitReq` 与 `OpenTextAuditVO`：

| 字段 | 类型 | 方向 | 必填 | 说明 |
|------|------|------|------|------|
| `fieldName` | String | 请求/响应 | 是 | `ABOUT_ME`、`HOPE_THEY_KNOW`、`PROFILE_QA` |
| `contentText` | String | 请求 | 是 | 开放性文字内容，2-500 字 |
| `auditStatus` | String | 响应 | 是 | 审核状态 |
| `auditSource` | String | 响应 | 是 | 审核来源 |
| `rejectReason` | String | 响应 | 否 | 驳回原因 |

`IntroductionSubmitReq`：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `aboutMe` | String | 是 | 自我介绍，20-300 字；服务端固定映射为 `ABOUT_ME` 审核类型 |

`VoiceIntroSubmitReq` 与 `VoiceIntroVO`：

| 字段 | 类型 | 方向 | 必填 | 说明 |
|------|------|------|------|------|
| `voiceUrl` | String | 请求 | 是 | 语音文件 URL |
| `duration` | Integer | 请求 | 是 | 语音时长秒，范围 10-60 |
| `voiceIntroUrl` | String | 响应 | 否 | 审核通过后可展示的语音 URL；待审/驳回为空 |
| `voiceIntroDuration` | Integer | 响应 | 是 | 语音时长秒 |
| `voiceIntroAuditStatus` | String | 响应 | 是 | 语音审核状态 |
| `voiceIntroRejectReason` | String | 响应 | 否 | 驳回/失效原因 |
| `visibleToPublic` | Boolean | 响应 | 是 | 是否允许公开资料页展示播放器 |

### 5.5 三重认证

`RealNameSubmitReq`：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `realName` | String | 是 | 真实姓名，数据库按明文存储，展示由业务脱敏 |
| `idCardNo` | String | 是 | 身份证号，18 位中国大陆身份证格式 |
| `singleCommitmentChecked` | Boolean | 是 | 单身承诺和认证协议确认；非 `true` 不允许提交 |
| `phone` | String | 否 | 不作为请求字段；后端从当前登录账号读取绑定手机号并参与三要素核验 |

`EducationSubmitReq`：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `educationUserType` | String | 是 | `STUDENT（在校生）`、`MAINLAND_GRADUATE（中国大陆毕业生）`；海外/港澳台暂不支持 |
| `educationMethod` | String | 是 | 在校生固定 `STUDENT_CARD`；毕业生使用 `CHSI`、`DIPLOMA_NO`、`MATERIAL_UPLOAD` |
| `schoolName` | String | 是 | 学校名称，2-100 字符 |
| `educationLevel` | String | 是 | 学历字典 code，必须命中 `app_education_level` |
| `chsiCode` | String | `CHSI` 必填 | 学信网在线验证码，12-18 位字母或数字 |
| `diplomaNo` | String | 按方式 | 毕业证书编号 |
| `certificateName` | String | 证书编号/上传证书必填 | 与证书一致的姓名 |
| `materialUrls` | String[] | 学生材料/上传证书必填 | 学生证、在读证明、毕业证或学位证公网 URL，最多 4 张 |
| `educationAgreementChecked` | Boolean | 是 | 学历认证协议确认，必须为 `true` |

`VerificationStatusVO`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `realNameStatus` | String | 实名认证最新记录状态；无记录为 `NOT_SUBMITTED` |
| `realNameRejectReason` | String | 实名驳回/失效原因 |
| `realNameSubmitTime` | String | 实名提交时间 |
| `realNameCanSubmit` | Boolean | 无记录、已驳回、已失效时为 `true`；审核中或已通过为 `false` |
| `educationStatus` | String | 学历认证最新记录状态；无记录为 `NOT_SUBMITTED` |
| `educationRejectReason` | String | 学历驳回/失效原因 |
| `educationSubmitTime` | String | 学历提交时间 |
| `educationCanSubmit` | Boolean | 实名已提审且学历不在审核中时为 `true` |
| `educationBlockedReason` | String | `请先提交实名认证`、`学历认证审核中`，可提交时为空 |
| `avatarVerifyStatus` | String | 头像认证最新记录状态；无记录为 `NOT_SUBMITTED` |
| `avatarVerifyRejectReason` | String | 头像驳回/失效原因 |
| `avatarVerifySubmitTime` | String | 头像提交时间 |
| `avatarCanSubmit` | Boolean | 头像待审核/审核中为 `false`，其他状态为 `true` |
| `profilePhotoAuditStatus` | String | 资料图片最新审核状态 |
| `openTextAuditStatus` | String | 开放性文字最新审核状态 |
| `verifyLevel` | Integer | 三重认证通过数量，范围 0-3 |
| `unlockMateRecommend` | Boolean | 是否解锁配对推荐 |
| `coreAccessStatus` | String | 核心准入状态 |

### 5.6 准入与配置

`AccessStatusVO`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `canBrowseCards` | Boolean | 是否可浏览卡片 |
| `canMatch` | Boolean | 是否可发起匹配 |
| `canMessage` | Boolean | 是否可发起私信或匹配会话 |
| `canCommunity` | Boolean | 是否可进入非核心社区能力 |
| `canBeExposed` | Boolean | 是否可被其他用户曝光 |
| `coreAccessStatus` | String | `CORE_ALLOWED`、`CORE_BLOCKED`、`NON_CORE_ONLY` |
| `blockReasons` | String[] | 多条阻断原因 |

`GET /miniapp/config/prd01` 响应：

| 字段 | 类型 | 说明 |
|------|------|------|
| `initFields` | Object[] | 首登基础字段配置，固定 5 类：性别、年龄、身份、学历、地址 |
| `initFields.step` | Integer | 首登步骤号，范围 `1-5` |
| `initFields.fieldId` | String | 业务字段 ID：`gender`、`birthday`、`identity`、`educationLevel`、`location` |
| `initFields.label` | String | 移动端展示名 |
| `initFields.visible` | Boolean | 是否展示该首登步骤 |
| `initFields.required` | Boolean | 是否必填；`false` 时可空值下一步 |
| `initFields.allowEmpty` | Boolean | 当前页面是否允许空值点击下一步，等于 `visible && !required`；页面不单独展示“跳过”按钮 |
| `initFields.submitFields` | String[] | 该业务字段提交到 `/miniapp/profile/init-step` 的实际字段 |
| `requiredFields` | String[] | 后端当前会校验的原子字段 ID，由 `initFields` 和后台字段配置派生 |
| `uploadLimits.educationMaterialMaxCount` | Integer | 学历材料最多张数 |
| `uploadLimits.educationMaterialMaxMb` | Integer | 学历材料单张大小 MB |
| `uploadLimits.albumMaxCount` | Integer | 相册最多张数 |
| `uploadLimits.albumMaxMb` | Integer | 相册单张大小 MB |
| `uploadLimits.profileBgMaxCount` | Integer | 资料背景图最多张数 |
| `uploadLimits.profileBgMaxMb` | Integer | 资料背景图单张大小 MB |
| `uploadLimits.imageFormats` | String[] | 支持图片格式 |
| `uploadLimits.voiceMinDuration` | Integer | 语音最短秒数，固定 10 |
| `uploadLimits.voiceMaxDuration` | Integer | 语音最长秒数，固定 60 |
| `regionScope.supportsOverseas` | Boolean | 是否支持海外/国家入口；首版固定 `false` |
| `regionScope.supportsLocation` | Boolean | 是否支持定位入口；当前为 `true`，定位实现由小程序前端完成 |
| `regionScope.locationDictPath` | String | 中国大陆地区树接口路径 |
| `auditPolicy.educationSlaHours` | Integer | 学历审核承诺小时数 |
| `auditPolicy.educationSlaText` | String | 学历审核承诺展示文案 |
| `smsSecurity.sendCountdownSeconds` | Integer | 短信验证码发送倒计时秒数 |
| `smsSecurity.validMinutes` | Integer | 短信验证码有效期分钟数 |
| `smsSecurity.dailySendLimit` | Integer | 每日发送上限 |
| `smsSecurity.providerCode` | String | 当前短信 Provider 编码 |
| `openTextFields` | String[] | 开放性文字字段清单 |

`GET /miniapp/dict/locations` 请求：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `parentCode` | String | 否 | 父级行政区划编码；不传查省，传省查市，传市查区县 |

响应 `RegionOptionVO[]`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | String | 中国大陆行政区划编码 |
| `name` | String | 地区展示名 |
| `level` | String | 地区层级：`PROVINCE`、`CITY`、`DISTRICT` |
| `hasChildren` | Boolean | 是否还有下一级；为 `true` 时选择后继续请求该编码 |

`GET /miniapp/dict/profile-options` 无请求参数。响应中的六个数组均使用 `DictOptionVO`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | String | 接口提交值及业务库存储值 |
| `label` | String | 页面展示中文，不提交到业务接口 |

## 6. 完整度评分清单

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
