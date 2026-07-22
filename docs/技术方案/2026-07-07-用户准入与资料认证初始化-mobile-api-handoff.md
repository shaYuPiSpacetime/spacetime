# 用户准入与资料认证初始化 - 小程序接口对接文档

> 本文是小程序前端对接唯一口径。新小程序页面只接本文列出的接口；未列出的旧兼容接口不要新接入。

## 1. 通用约定

| 项 | 约定 |
| --- | --- |
| Base URL | 以当前环境网关为准 |
| 登录态 Header | `X-Auth-Token: {token}` |
| 响应结构 | `{"code":200,"msg":"success","data":...}`，业务字段都在 `data` |
| 时间格式 | `yyyy-MM-dd HH:mm:ss` |
| 字典字段 | 业务接口只传/只存 `code`，中文展示从字典接口取 `label` |
| 地区字段 | 省/市/区存中国大陆行政区 `code`；定位可由小程序前端完成，提交时仍传地区 `code` |
| 审核状态 | `NOT_SUBMITTED` 无记录；`PENDING` 待审核；`REVIEWING` 审核中；`APPROVED` 已通过；`REJECTED` 已驳回；`EXPIRED` 已失效 |
| 审核来源 | `MACHINE` 机审；`MANUAL` 人工审核 |

## 2. 全局配置与字典

### 2.1 PRD01 配置

| 项 | 内容 |
| --- | --- |
| Method | `GET` |
| Path | `/miniapp/config/prd01` |
| 鉴权 | 不需要 |
| 用途 | 登录、首登、基础资料、上传、审核 SLA、文案、短信频控的统一配置源 |

`data` 字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `accessPolicy.minAge/maxAge` | Number | 年龄准入范围，后端按出生日期二次校验 |
| `accessPolicy.tripleCertificationRequired` | Boolean | 固定为 `true` |
| `initFields` | Array | 首登 5 步字段配置，控制是否展示、必填、可跳过 |
| `requiredFields` | Array | 当前必填字段 ID |
| `fieldSettings` | Array | 我的主页/基础资料字段展示、必填、计分配置 |
| `profileCompleteness` | Object | 资料完整度计分项和总分，分数由后端实时计算 |
| `copywriting` | Object | 文案配置，`enabled=false` 时前端不展示该文案 |
| `uploadLimits.education/album/profileBg/voice` | Object | 上传数量、大小、格式限制 |
| `uploadLimits.voiceMinDuration/voiceMaxDuration` | Number | 语音介绍时长限制，当前 10-60 秒 |
| `auditPolicy.educationSlaHours` | Number | 学历审核承诺小时数 |
| `auditPolicy.educationSlaText` | String | 学历审核展示文案 |
| `smsSecurity.sendCountdownSeconds` | Number | 获取验证码按钮倒计时 |
| `smsSecurity.validMinutes` | Number | 验证码有效期 |
| `smsSecurity.dailySendLimit` | Number | 每日发送上限 |
| `smsSecurity.providerCode` | String | 短信通道，当前 `MOCK` |
| `regionScope.locationDictPath` | String | 地区懒加载接口路径 |
| `configUpdatedAt` | String | 配置最后更新时间，可用于本地缓存刷新 |

#### 2.1.1 字段配置清单

以下只列后台可配置“展示/隐藏”的字段。固定展示字段不放入本表，前端按接口返回的 `fieldSettings.visible` 决定是否渲染，按 `fieldSettings.required` 决定是否必填。

| 分组 | 字段及中文 | 展示配置 | 必填配置 |
| --- | --- | --- | --- |
| 基础资料 | `nickname` 昵称、`residence` 户口所在地、`industry` 行业、`occupation` 职业、`company` 公司、`annualIncomeRange` 年收入、`school` 学校、`major` 专业、`maritalStatus` 婚姻状况 | 可配 | 可配 |
| 扩展资料 | `datingGoal` 脱单目标、`emotionalStatus` 感情状态、`aboutMe` 关于我/自我描述、`tags` 个人标签、`photos` 相册/附加照片、`profileBgImage` 资料背景图、`voiceIntroUrl` 语音介绍文件、`voiceIntroDuration` 语音介绍时长、`favoriteSong` 爱听的歌曲 | 可配 | 可配 |
| 扩展资料 | `meetingPreference` 见面偏好、`preferredActivities` 喜欢的见面活动、`housingStatus` 住房情况、`carStatus` 购车情况、`childrenPlan` 是否想要孩子、`hasChild` 有无子女、`marriagePlan` 结婚计划、`religion` 宗教信仰、`smoking` 吸烟情况、`drinking` 饮酒情况、`pets` 宠物态度 | 可配 | 可配 |
| 联系方式 | `wechatId` 微信号 | 可配 | 可配 |

#### 2.1.2 字段长度、大小、范围校验

本表只列长度、大小、数量、格式、范围等校验；是否必填以上方 `fieldSettings.required` 为准。

| 字段/配置 | 校验规则 |
| --- | --- |
| 年龄/出生日期 | 按 `accessPolicy.minAge/maxAge` 校验，配置值必须为正整数，最大年龄不能小于最小年龄 |
| `nickname` 昵称 | 2-12 个字符 |
| `height` 身高 | 140-220 cm |
| `weight` 体重 | 30-200 kg |
| `company` 公司 | 2-50 个字符 |
| `school` 基础资料学校 | 2-50 个字符 |
| `major` 专业 | 最长 100 个字符 |
| 地区字段 | 现居地、家乡只允许中国大陆省/市/区县 code，校验父子层级 |
| 字典类字段 | 性别、身份、学历、行业、职业、年收入、婚姻状况、脱单目标、感情状态、标签等必须是启用的字典 code |
| `wechatId` 微信号 | 字母开头，6-20 位，允许字母/数字/下划线/横线 |
| 标签 | 最多选择 16 个 |
| 实名身份证号 | 中国大陆二代身份证格式 |
| 学历认证学校 `schoolName` | 2-100 个字符 |
| 学信网验证码 `chsiCode` | 12-18 位字母或数字 |
| 证书编号 `diplomaNo` | 最长 64 个字符 |
| 证书姓名 `certificateName` | 最长 50 个字符 |
| 学历材料 | 数量、单张大小、格式取 `uploadLimits.education`；URL 必须是公网 URL 或受保护凭证路径 |
| 相册图片 | 数量、单张大小、格式取 `uploadLimits.album` |
| 资料背景图 | 固定最多 1 张；大小、格式取 `uploadLimits.profileBg` |
| 语音介绍 | 提交审核时校验时长，取 `uploadLimits.voiceMinDuration/voiceMaxDuration`；上传凭证接口校验大小、格式，取 `uploadLimits.voice.maxMb/formats` |
| 自我介绍 `aboutMe` | 当前后端硬校验 20-300 字 |
| 关于我资料问答 | 当前后端硬校验 2-500 字 |
| 短信验证码 | 倒计时、有效期、每日次数取 `smsSecurity`，均为正整数 |

#### 2.1.3 小程序展示文案配置

文案来自 `copywriting`，由后台配置 `prd01.copy.rules` 和 `prd01.text.length.rules` 下发。小程序按 `copyKey` 读取；`enabled=false` 时不展示该文案。

| 分组 | 可配置文案 |
| --- | --- |
| 准入拦截文案 | 未完成资料、三重认证未通过、账号异常 |
| 认证通用文案 | 认证页标题、认证中心标题/说明、进入认证、头像/实名/学历标题和说明、提交、上传中、加载中、加载失败、重试、确认、取消、返回认证中心 |
| 认证强引导 | 主标题、说明、基本资料/添加头像/自我介绍/三重认证步骤名、下一步 |
| 认证拦截页 | 初始态标题/说明、部分完成态说明、基本资料/头像简介/三重认证卡片标题和说明、主按钮、稍后再说 |
| 头像认证 | 页面标题、页面说明、头像规则、不可通过示例、选择照片按钮、裁剪说明、来源异常提示 |
| 实名认证 | 页面标题、页面说明、姓名标签/占位、身份证标签/占位、承诺必选提示 |
| 学历认证 | 页面说明、上传说明、认证人群、学校/学历/验证码/证书编号/证书姓名标签和占位、上传操作、上传数量已满、认证方式说明、协议必选 |
| 自我介绍认证 | 区域标题、输入提示、最少字数提示 |
| 三重认证 | 安全说明 |
| 协议文案 | 用户协议、隐私政策、单身承诺函、学历认证协议 |
| 驳回模板 | 头像驳回、实名驳回、学历驳回、资料图片驳回、开放文字驳回 |
| 异常文案 | 年龄不符、定位失败、上传失败、第三方不可用 |
| 内容安全文案 | 文本安全不通过、图片安全不通过、语音安全不通过 |
| 开放文本长度提示 | 关于我、资料问答长度提示 |

### 2.2 资料字典

| 项 | 内容 |
| --- | --- |
| Method | `GET` |
| Path | `/miniapp/dict/profile-options` |
| 鉴权 | 不需要 |

返回对象包含基础资料字典列表和标签分组。普通字典项结构：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `code` | String | 提交给业务接口的值 |
| `label` | String | 页面展示中文 |
| `sort` | Number | 排序 |

当前需要使用的 key：

| key | 用途 |
| --- | --- |
| `identity` | 身份：在校生、职场人 |
| `educationLevel` | 最高学历 |
| `industry` | 行业 |
| `occupation` | 职业 |
| `annualIncome` | 年收入 |
| `maritalStatus` | 婚姻状况 |
| `datingGoal` | 脱单目标 |
| `emotionalStatus` | 感情状态 |
| `profileTag` | 我的标签扁平列表，含 `categoryCode/categoryLabel`，保存时仍只传 code |
| `profileTagGroups` | 我的标签分组列表，用于 `全部 / MBTI / 性格 / 爱好 / 运动 / 足迹` Tab |

### 2.3 地区字典懒加载

| 项 | 内容 |
| --- | --- |
| Method | `GET` |
| Path | `/miniapp/dict/locations?parentCode={parentCode}` |
| 鉴权 | 不需要 |

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `parentCode` | 否 | 空值查省级；传省级 code 查市；传市级 code 查区县 |

返回字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `code` | String | 地区 code，提交时使用 |
| `name` | String | 地区名称 |
| `level` | String | `PROVINCE` 省、`CITY` 市、`DISTRICT` 区县 |
| `hasChildren` | Boolean | 是否还有下一级 |

### 2.4 地区字典两级树（小程序省市选择器）

| 项 | 内容 |
| --- | --- |
| Method | `GET` |
| Path | `/miniapp/dict/locations/two-level` |
| 鉴权 | 不需要 |
| 用途 | 小程序需要一次性拿省市两级数据做省市选择器时使用 |

返回 `data` 为省级数组，每个省节点下只有市级 `children`，不返回区县。需要区县时继续使用 `GET /miniapp/dict/locations?parentCode={cityCode}` 懒加载。

节点字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `code` | String | 地区 code，提交业务接口时使用 |
| `name` | String | 地区名称 |
| `level` | String | `PROVINCE` 省、`CITY` 市 |
| `children` | Array | 下级地区；城市节点固定为空数组 |

示例：

```json
[
  {
    "code": "410000",
    "name": "河南省",
    "level": "PROVINCE",
    "children": [
      {
        "code": "410100",
        "name": "郑州市",
        "level": "CITY",
        "children": []
      }
    ]
  }
]
```

### 2.4 资料文件上传

交接稿原有业务提交接口只接收 URL，但未提供临时文件转 OSS URL 的入口。为保证真机链路可用，小程序采用 OSS 直传：先向后端申请 5 分钟短时表单凭证，再由小程序直接调用 `Taro.uploadFile` 上传到凭证中的 `uploadUrl`。长期 AccessKey Secret 只保留在后端，禁止下发或写入小程序源码。

| 场景 | Method | 凭证 Path | 上传后 URL 用途 |
| --- | --- | --- | --- |
| 头像 | `POST` | `/miniapp/file/upload-ticket/avatar` | 公有 CDN URL |
| 学历材料 | `POST` | `/miniapp/file/upload-ticket/education` | 登录态凭证代理 URL |
| 相册 | `POST` | `/miniapp/file/upload-ticket/album` | 公有 CDN URL |
| 资料背景 | `POST` | `/miniapp/file/upload-ticket/background` | 公有 CDN URL |
| 语音介绍 | `POST` | `/miniapp/file/upload-ticket/voice` | 公有 CDN URL |

凭证请求：`{"fileName":"avatar.jpg","fileSizeBytes":102400}`。后端按对应 `uploadLimits` 校验扩展名和大小，并在 OSS policy 中再次限制唯一对象 Key 与最大字节数。

响应 `data`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `uploadUrl` | String | OSS Bucket 表单上传地址 |
| `key` | String | 本次凭证唯一允许写入的 OSS 对象 Key |
| `formData` | Object | 直传表单字段，原样传给 `Taro.uploadFile` |
| `expiresAt` | Number | 凭证过期 Unix 时间戳（秒） |
| `fileUrl` | String | 上传成功后提交给业务接口的稳定地址 |
| `protectedFile` | Boolean | 是否必须通过登录态凭证代理访问 |

小程序拿到凭证后，直接上传 `uploadUrl`，字段名为 `file`，`formData` 原样携带；OSS 返回 200/204 后，才把 `fileUrl` 提交给头像、学历、相册、背景图或语音介绍业务接口。前端不得把小程序本地临时路径提交给业务接口。微信公众平台必须把响应中的 OSS Bucket Host 加入 `uploadFile` 合法域名；不同环境使用各自 Bucket Host，不在客户端写死域名。

## 3. 登录流程

### 3.1 手机号登录

调用顺序：

1. `GET /miniapp/config/prd01`，读取 `smsSecurity` 展示倒计时、有效期、每日次数。
2. `POST /miniapp/auth/sms-code` 发送验证码。
3. 用户输入验证码并勾选协议后，`POST /miniapp/auth/phone-login`。
4. 保存返回的 `token`，后续登录态接口放到 `X-Auth-Token`。
5. 如果 `firstLoginCompleted=false`，进入首登基础信息流程；否则进入主页。

#### 发送验证码

| 项 | 内容 |
| --- | --- |
| Method | `POST` |
| Path | `/miniapp/auth/sms-code` |
| 鉴权 | 不需要 |

请求：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `phone` | String | 是 | 中国大陆手机号，正则 `^1[3-9]\d{9}$` |

响应 `data`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `countdownSeconds` | Number | 获取验证码按钮倒计时 |
| `validMinutes` | Number | 验证码有效期 |
| `dailyLimit` | Number | 每日发送上限 |
| `dailyRemaining` | Number | 当日剩余次数 |
| `providerCode` | String | 当前短信通道，当前为 `MOCK` |

#### 手机号验证码登录

| 项 | 内容 |
| --- | --- |
| Method | `POST` |
| Path | `/miniapp/auth/phone-login` |
| 鉴权 | 不需要 |

请求：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `phone` | String | 是 | 手机号 |
| `smsCode` | String | 是 | 短信验证码 |
| `agreeProtocol` | Boolean | 是 | 是否勾选登录协议 |

响应 `data`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `token` | String | 后续请求头 `X-Auth-Token` |
| `userId` | Number | 当前 App 用户 ID |
| `phone/maskedPhone` | String | 明文手机号/脱敏手机号 |
| `nickname` | String | 昵称 |
| `avatar` | String | 本人当前头像，取头像审核记录派生值 |
| `isNewUser` | Boolean | 本次是否创建新用户 |
| `firstLoginCompleted` | Boolean | 是否完成首登基础资料 |
| `nextStep` | Number | 下一步首登步骤，完成后为空 |
| `accessStatus` | Object | 准入能力状态 |

### 3.2 微信授权登录

| 项 | 内容 |
| --- | --- |
| Method | `POST` |
| Path | `/miniapp/auth/wechat-login` |
| 鉴权 | 不需要 |

请求：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `loginCode` | String | 否 | `wx.login` 临时 code |
| `phoneCode` | String | 是 | `getPhoneNumber` 手机号授权 code |
| `agreeProtocol` | Boolean | 是 | 是否勾选协议 |

响应同手机号登录。

## 4. 首次登录基础信息流程

首次登录只录入 5 个字段：性别、出生日期/年龄、身份、学历、现居地。是否展示、是否必填、是否可跳过，以 `/miniapp/config/prd01` 的 `initFields` 为准。

调用顺序：

1. 登录成功后调用 `GET /miniapp/profile/init-status`。
2. 根据 `nextStep` 渲染当前步骤；如果该步骤 `required=false`，前端可空值提交跳过。
3. 每一步调用 `POST /miniapp/profile/init-step`，后端直接写入 `app_user` 并返回下一步。
4. 最后一个可见步骤保存成功后，后端置 `firstLoginCompleted=true`。

### 查询首登状态

| 项 | 内容 |
| --- | --- |
| Method | `GET` |
| Path | `/miniapp/profile/init-status` |
| 鉴权 | 需要 |

响应 `data`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `firstLoginCompleted` | Boolean | 是否完成首登 |
| `currentStep/nextStep` | Number | 当前/下一步 |
| `completedSteps` | Array | 已完成步骤 |
| `nextAction` | String | `CONTINUE_STEP_{n}` 或 `COMPLETED` |
| `savedFields` | Object | 已保存资料快照 |

### 保存首登步骤

| 项 | 内容 |
| --- | --- |
| Method | `POST` |
| Path | `/miniapp/profile/init-step` |
| 鉴权 | 需要 |

请求字段：

| step | 页面 | 提交字段 |
| --- | --- | --- |
| 1 | 性别 | `step=1, gender`，值 `MALE/FEMALE` |
| 2 | 出生日期 | `step=2, birthday`，格式 `yyyy-MM-dd` |
| 3 | 身份 | `step=3, identity`，取字典 `identity[].code` |
| 4 | 学历 | `step=4, educationLevel`，取字典 `educationLevel[].code` |
| 5 | 现居地 | `step=5, locationProvince, locationCity, locationDistrict` |

后端校验：

| 校验 | 说明 |
| --- | --- |
| 步骤字段隔离 | 每一步只允许提交本步骤字段 |
| 年龄范围 | 按配置 `accessPolicy.minAge/maxAge` 校验 |
| 字典 code | 身份、学历必须命中字典 |
| 地区范围 | 首版只支持中国大陆地区 code |

## 5. 我的主页统一详情

### 5.1 查询主页详情

| 项 | 内容 |
| --- | --- |
| Method | `GET` |
| Path | `/miniapp/profile/home-detail` |
| 鉴权 | 需要 |
| 用途 | 编辑资料页、主页预览页的统一数据源 |

响应 `data`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `profile` | Object | 当前用户资料值 |
| `fieldSettings` | Array | 字段展示、必填、可编辑配置 |
| `verificationStatus` | Object | 三重认证轻量状态 |
| `accessStatus` | Object | 当前准入状态 |
| `profileOptionsPath` | String | 字典接口路径 |
| `locationOptionsPath` | String | 地区接口路径 |
| `runtimeConfig` | Object | 当前配置摘要 |

`profile` 主要字段：

| 字段 | 说明 |
| --- | --- |
| `avatar` | 本人头像预览，取最新头像审核记录；最新未通过时本人仍可看提交内容 |
| `nickname, gender, birthday, age, height, weight` | 基础资料 |
| `identity, educationLevel, industry, occupation, annualIncome, maritalStatus` | 字典 code |
| `locationProvince/locationCity/locationDistrict` | 现居地 code |
| `hometownProvince/hometownCity/hometownDistrict` | 家乡 code |
| `school, major, company` | 文本字段 |
| `datingGoal, emotionalStatus` | 字典 code |
| `tags` | JSON 字符串数组，内容是 `profileTag` code |
| `aboutMe` | 本人可见自我介绍最新内容 |
| `voiceIntroUrl/voiceIntroDuration/voiceIntroAuditStatus` | 语音介绍回显 |
| `photos` | JSON 字符串数组，本人相册未失效图片 |
| `profileBgImage` | 本人资料背景图 |
| `favoriteSongId/favoriteSongName/favoriteSongArtist/favoriteSongCoverUrl` | 爱听歌曲 |
| `wechatId` | 微信号，仅本人资料页展示 |
| `profileScore` | 后端按当前配置实时计算的资料完整度分数 |

### 5.2 查询/保存基础资料

| 项 | 内容 |
| --- | --- |
| 查询 | `GET /miniapp/profile/basic` |
| 保存 | `PUT /miniapp/profile/basic` |
| 鉴权 | 需要 |

保存请求字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `nickname` | String | 2-12 字 |
| `gender` | String | `MALE/FEMALE`，允许修改 |
| `birthday` | String | `yyyy-MM-dd`，按年龄配置校验 |
| `height` | Number | 140-220 cm |
| `weight` | Number | 30-200 kg |
| `identity` | String | 字典 `identity` code |
| `educationLevel` | String | 字典 `educationLevel` code |
| `industry` | String | 字典 `industry` code |
| `occupation` | String | 字典 `occupation` code |
| `annualIncome` | String | 字典 `annualIncome` code |
| `maritalStatus` | String | 字典 `maritalStatus` code |
| `locationProvince/locationCity/locationDistrict` | String | 现居地 code |
| `hometownProvince/hometownCity/hometownDistrict` | String | 家乡 code |
| `company` | String | 公司名称 |
| `school` | String | 学校 |
| `major` | String | 专业 |

保存规则：

| 规则 | 说明 |
| --- | --- |
| 字段展示 | 后台关闭展示的字段，后端忽略，不写库 |
| 字段必填 | 后台配置必填且展示时，空值保存失败 |
| 字典字段 | 只能传 code，后端校验字典 |
| 地区字段 | 只支持中国大陆 code |

## 6. 认证中心

认证中心首页只调用轻量状态接口；进入具体页面再调用该模块详情接口。

| 页面 | 进入时调用 | 提交接口 |
| --- | --- | --- |
| 三重认证首页 | `GET /miniapp/verify/status` | 无 |
| 添加头像 | `GET /miniapp/profile/avatar` | `POST /miniapp/profile/avatar` |
| 实名认证 | `GET /miniapp/verify/real-name` | `POST /miniapp/verify/real-name` |
| 学历认证 | `GET /miniapp/verify/education` | `POST /miniapp/verify/education` |

### 6.1 认证状态总览

| 项 | 内容 |
| --- | --- |
| Method | `GET` |
| Path | `/miniapp/verify/status` |
| 鉴权 | 需要 |

响应 `data`：

| 字段 | 说明 |
| --- | --- |
| `realNameStatus/educationStatus/avatarVerifyStatus` | 三重认证最新状态 |
| `realNameRejectReason/educationRejectReason/avatarVerifyRejectReason` | 驳回或失效原因 |
| `realNameCanSubmit/educationCanSubmit/avatarCanSubmit` | 按最新记录判断是否可提交 |
| `educationSlaHours/educationSlaText/educationEstimatedCompleteTime` | 学历审核时长展示 |
| `profilePhotoAuditStatus` | 相册/背景图最新审核状态 |
| `openTextAuditStatus` | 自我介绍/关于我最新审核状态 |
| `verifyLevel` | 三重认证已通过数量 |
| `unlockMateRecommend` | 是否解锁配对推荐 |
| `accessStatus` | 准入能力 |

状态展示规则：

| 模块 | 本人看到 | 他人端/业务生效 |
| --- | --- | --- |
| 头像 | 看最新头像审核记录状态 | 只看最新头像记录；最新不是 `APPROVED` 时头像不对外生效 |
| 实名 | 看最新实名记录；已通过后不能再改 | 通过后计入三重认证 |
| 学历 | 看最新学历记录；驳回/失效可重提 | 有最近通过记录则继续生效 |
| 相册/背景图/自我介绍/关于我/语音 | 本人看最新提交和原因 | 他人端看最近已通过内容；新内容审核通过前旧内容继续展示 |

### 6.2 添加头像

| 项 | 内容 |
| --- | --- |
| 查询 | `GET /miniapp/profile/avatar` |
| 提交 | `POST /miniapp/profile/avatar` |
| 鉴权 | 需要 |

提交请求：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `avatarSource` | String | 是 | `CAMERA` 拍照；`ALBUM` 相册 |
| `avatarUrl` | String | 是 | 裁剪后图片公网 URL |
| `thumbUrl` | String | 否 | 缩略图 URL |

提交后生成 `AVATAR` 审核记录，并走图片安全 Provider；当前 Provider 为 mock，结果会写审核历史。

### 6.3 实名认证

| 项 | 内容 |
| --- | --- |
| 查询 | `GET /miniapp/verify/real-name` |
| 提交 | `POST /miniapp/verify/real-name` |
| 鉴权 | 需要 |

查询响应：

| 字段 | 说明 |
| --- | --- |
| `auditStatus` | 最新实名审核状态 |
| `auditSource` | 机审/人工审核 |
| `rejectReason` | 驳回或失效原因 |
| `submitTime` | 提交时间 |
| `canSubmit` | 是否可提交；已通过后为 `false` |
| `realName/idCardNo` | 脱敏姓名/身份证号 |

提交请求：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `realName` | String | 是 | 真实姓名 |
| `idCardNo` | String | 是 | 身份证号 |
| `singleCommitmentChecked` | Boolean | 是 | 是否勾选承诺/认证协议 |

实名通过后不能修改；如确需修改走客服/后台流程，不给小程序重提入口。

### 6.4 学历认证

| 项 | 内容 |
| --- | --- |
| 查询 | `GET /miniapp/verify/education` |
| 提交 | `POST /miniapp/verify/education` |
| 鉴权 | 需要 |

支持 4 种方式：

| 场景 | `educationUserType` | `educationMethod` | 必填字段 |
| --- | --- | --- | --- |
| 在校生材料 | `STUDENT` | `STUDENT_CARD` | `schoolName, educationLevel, materialUrls, educationAgreementChecked` |
| 中国大陆毕业生-学信网 | `MAINLAND_GRADUATE` | `CHSI` | `schoolName, educationLevel, chsiCode, educationAgreementChecked` |
| 中国大陆毕业生-证书编号 | `MAINLAND_GRADUATE` | `DIPLOMA_NO` | `schoolName, educationLevel, diplomaNo, certificateName, educationAgreementChecked` |
| 中国大陆毕业生-上传证书 | `MAINLAND_GRADUATE` | `MATERIAL_UPLOAD` | `schoolName, educationLevel, certificateName, materialUrls, educationAgreementChecked` |

提交请求字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `educationUserType` | String | `STUDENT` 或 `MAINLAND_GRADUATE` |
| `educationMethod` | String | `STUDENT_CARD/CHSI/DIPLOMA_NO/MATERIAL_UPLOAD` |
| `schoolName` | String | 学校名称 |
| `educationLevel` | String | 学历字典 code |
| `chsiCode` | String | 学信网 12-18 位在线验证码 |
| `diplomaNo` | String | 毕业证/学位证编号 |
| `certificateName` | String | 证书姓名 |
| `materialUrls` | Array<String> | 学生证/在读证明/毕业证/学位证 URL，数量和大小按 `uploadLimits.education` 控制 |
| `educationAgreementChecked` | Boolean | 是否勾选学历认证协议 |

常见错误码：

| 错误码 | 触发场景 |
| --- | --- |
| `EDUCATION_REALNAME_REQUIRED` | 未完成实名认证时提交学历认证 |
| `EDUCATION_MATERIAL_REQUIRED` | 当前认证方式要求材料但未上传材料 |
| `EDUCATION_METHOD_INVALID` | 认证方式非法或与身份不匹配 |

展示补充：

| 字段 | 说明 |
| --- | --- |
| `identityCode/identityLabel` | 学历页身份展示；`STUDENT` 映射在校生，`MAINLAND_GRADUATE` 映射职场人 |
| `educationMethodLabel` | 当前认证方式中文 |
| `educationEstimatedCompleteTime` | 待审核/审核中时展示预计完成时间 |

## 7. 审核型资料

### 7.1 相册照片

| 页面动作 | 接口 |
| --- | --- |
| 查询相册 | `GET /miniapp/profile/albums` |
| 新增照片 | `POST /miniapp/profile/albums` |
| 替换某张照片 | `PUT /miniapp/profile/albums/{mediaId}` |
| 删除某张照片 | `DELETE /miniapp/profile/albums/{mediaId}` |

新增/替换请求：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `mediaUrl` | String | 图片公网 URL |
| `thumbUrl` | String | 缩略图 URL |
| `fileSizeBytes` | Number | 文件大小，后端按 `uploadLimits.album.maxMb` 校验 |
| `sortOrder` | Number | 展示排序 |

规则：

| 规则 | 说明 |
| --- | --- |
| 数量/大小/格式 | 取 `uploadLimits.album.maxCount/maxMb/formats`，后端二次校验 |
| 新增 | 生成 `ALBUM_PHOTO` 审核记录 |
| 替换 | 旧记录置 `EXPIRED`，原因“用户替换相册照片”；新图生成新审核记录 |
| 删除 | 记录置 `EXPIRED`，原因“用户删除资料媒体”，不物理删除 |
| 他人端展示 | 只展示已通过且未失效照片 |

### 7.2 资料背景图

| 页面动作 | 接口 |
| --- | --- |
| 查询背景图 | `GET /miniapp/profile/background` |
| 提交/替换背景图 | `PUT /miniapp/profile/background` |
| 删除背景图 | `DELETE /miniapp/profile/background` |

提交请求：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `mediaUrl` | String | 背景图公网 URL |
| `thumbUrl` | String | 缩略图 URL |
| `fileSizeBytes` | Number | 文件大小，后端按 `uploadLimits.profileBg.maxMb` 校验 |

规则：

| 规则 | 说明 |
| --- | --- |
| 数量/大小/格式 | 取 `uploadLimits.profileBg.maxCount/maxMb/formats`，后端二次校验 |
| 替换 | 旧背景图继续对外展示，新背景图审核通过后才替换生效 |
| 审核中 | 同时只允许一张新背景图处于待审核/审核中 |
| 删除 | 当前已通过背景图置 `EXPIRED`，删除后不自动回退旧背景图 |

### 7.3 自我介绍

| 项 | 内容 |
| --- | --- |
| 查询 | `GET /miniapp/profile/introduction` |
| 提交 | `POST /miniapp/profile/introduction` |
| 鉴权 | 需要 |

查询响应：

| 字段 | 说明 |
| --- | --- |
| `latestContent` | 本人最新提交内容 |
| `effectiveContent` | 当前对外生效内容 |
| `auditStatus/auditSource` | 最新审核状态/来源 |
| `rejectReason` | 驳回或失效原因 |
| `submitTime` | 提交时间 |
| `canSubmit` | 审核中不可重复提交 |

提交请求：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `aboutMe` | String | 20-300 字；后端固定校验 |

提交后生成 `ABOUT_ME` 审核记录，走文本安全 Provider。

### 7.4 关于我

| 项 | 内容 |
| --- | --- |
| 查询 | `GET /miniapp/profile/about-me` |
| 提交 | `POST /miniapp/profile/about-me` |
| 鉴权 | 需要 |

查询响应：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `questions` | Array | 固定问题列表，不走字典 |

`questions[]`：

| 字段 | 说明 |
| --- | --- |
| `questionKey` | 题目 key |
| `title` | 题目标题 |
| `placeholder` | 输入提示 |
| `latestContent` | 本人最新提交内容 |
| `effectiveContent` | 当前对外生效内容 |
| `auditStatus` | 最新审核状态 |
| `rejectReason` | 驳回或失效原因 |
| `canSubmit` | 是否可提交 |

提交请求：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `questionKey` | String | 固定题目 key |
| `contentText` | String | 2-500 字 |

固定题目 key：

| key | 标题 |
| --- | --- |
| `meetingPreference` | 见面偏好 |
| `preferredActivities` | 喜欢的见面活动 |
| `housingStatus` | 住房情况 |
| `carStatus` | 购车情况 |
| `childrenPlan` | 是否想要孩子 |
| `hasChild` | 有无子女 |
| `marriagePlan` | 结婚计划 |
| `religion` | 宗教信仰 |
| `smoking` | 吸烟情况 |
| `drinking` | 饮酒情况 |
| `pets` | 宠物态度 |

提交后生成 `PROFILE_QA` 审核记录；同一题审核中不可重复提交。审核记录 `materialJson` 写入 `questionKey` 和 `questionTitle`，后台文字内容审核列表/详情统一分类展示为“资料问答”，并额外展示具体标题，便于区分见面偏好、住房情况等场景。

### 7.5 语音介绍

| 页面动作 | 接口 |
| --- | --- |
| 查询语音介绍 | `GET /miniapp/profile/voice-intro` |
| 提交语音介绍 | `POST /miniapp/profile/voice-intro` |
| 删除语音介绍 | `DELETE /miniapp/profile/voice-intro` |

提交请求：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `voiceUrl` | String | 音频 URL |
| `duration` | Number | 时长秒，取配置 `voiceMinDuration/voiceMaxDuration`，当前 10-60 |

录音格式、单文件大小和数量读取 `uploadLimits.voice.formats/maxMb/maxCount`；小程序先调用 `/miniapp/file/upload-ticket/voice` 直传 OSS，再提交返回的稳定 `fileUrl`。

常见错误码：

| 错误码 | 触发场景 |
| --- | --- |
| `VOICE_UPLOAD_REQUIRED` | 未传 `voiceUrl` |
| `VOICE_DURATION_INVALID` | 时长不在允许范围内 |
| `VOICE_SAFETY_REJECTED` | 音频安全机审拒绝 |

规则：

| 规则 | 说明 |
| --- | --- |
| 提交 | 生成 `VOICE_INTRO` 审核记录，走音频安全 Provider |
| 转文字 | 当前不做语音转文字 |
| 审核中 | 不允许重复提交 |
| 删除 | 当前生效语音置 `EXPIRED`，不物理删除 |

## 8. 非审核型资料独立接口

这些字段直接写 `app_user`，不生成审核记录；字典字段只传 code。

### 8.1 脱单目标

| 项 | 内容 |
| --- | --- |
| Method | `PUT` |
| Path | `/miniapp/profile/dating-goal` |
| 请求 | `{"code":"TIMING_MATURE"}`，取字典 `datingGoal` |
| 响应 | `ProfileDetailVO` |

### 8.2 感情状态

| 项 | 内容 |
| --- | --- |
| Method | `PUT` |
| Path | `/miniapp/profile/emotional-status` |
| 请求 | `{"code":"SEARCHING"}`，取字典 `emotionalStatus` |
| 响应 | `ProfileDetailVO` |

### 8.3 我的标签

| 项 | 内容 |
| --- | --- |
| 查询 | `GET /miniapp/profile/tags` |
| 保存 | `PUT /miniapp/profile/tags` |
| 请求 | `{"tagCodes":["IT_GIRL","OUTDOOR_LOVER"]}`，最多 16 个 |
| 响应 | 保存返回 `ProfileDetailVO`；查询返回 JSON 字符串数组 |

标签选项从 `GET /miniapp/dict/profile-options` 获取：

| 字段 | 说明 |
| --- | --- |
| `profileTag` | 扁平标签列表，每项含 `code/label/categoryCode/categoryLabel` |
| `profileTagGroups` | 分类标签列表；第一个分类为 `ALL/全部`，后续按需求返回 `MBTI/PERSONALITY/HOBBY/SPORT/FOOTPRINT` |

`profileTagGroups[]`：

| 字段 | 说明 |
| --- | --- |
| `categoryCode` | 分类 code：`ALL`、`MBTI`、`PERSONALITY`、`HOBBY`、`SPORT`、`FOOTPRINT` |
| `categoryLabel` | 分类中文：全部、MBTI、性格、爱好、运动、足迹 |
| `options` | 该分类下的标签选项 |

后端存储仍为 `app_user.tags`，只保存标签 code 的 JSON 数组；标签分类来自 `sys_dict_data.parent_id` 父子关系，不读取 `remark`，不写入用户表。

### 8.4 爱听的歌曲

| 搜索 | `GET /miniapp/profile/songs/search?keyword={keyword}&limit=10` |
| 保存 | `PUT /miniapp/profile/favorite-song` |

搜索响应 `data[]`：

| 字段 | 说明 |
| --- | --- |
| `songId` | 三方歌曲 ID |
| `songName` | 歌曲名 |
| `artistName` | 歌手 |
| `coverUrl` | 封面 |

保存请求：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `songId` | String | 必填 |
| `songName` | String | 必填 |
| `artistName` | String | 可选 |
| `coverUrl` | String | 可选 |

当前歌曲搜索 Provider 为 mock，后续接真实三方时保持接口不变。

### 8.5 微信号

| 项 | 内容 |
| --- | --- |
| 查询 | `GET /miniapp/profile/wechat-id` |
| 保存 | `PUT /miniapp/profile/wechat-id` |
| 请求 | `{"wechatId":"wx_xxx"}` |
| 校验 | 必须匹配 `[A-Za-z][A-Za-z0-9_-]{5,19}` |
| 响应 | 保存返回 `ProfileDetailVO`；查询返回字符串 |

## 9. 准入状态

| 项 | 内容 |
| --- | --- |
| Method | `GET` |
| Path | `/miniapp/profile/access-status` |
| 鉴权 | 需要 |

响应字段：

| 字段 | 说明 |
| --- | --- |
| `canBrowseCards` | 是否可浏览卡片 |
| `canMatch` | 是否可发起匹配 |
| `canMessage` | 是否可私信/会话 |
| `canCommunity` | 是否可使用非核心社区能力 |
| `canBeExposed` | 是否可被其他用户曝光 |
| `coreAccessStatus` | `CORE_ALLOWED/CORE_BLOCKED/NON_CORE_ONLY` |
| `blockReasons` | 阻断原因列表 |

准入判断由后端完成；前端只按返回值控制入口和提示，不自行拼规则。

## 10. 小程序页面推荐调用顺序

### 10.1 登录页

1. `GET /miniapp/config/prd01`
2. `POST /miniapp/auth/sms-code`
3. `POST /miniapp/auth/phone-login` 或 `POST /miniapp/auth/wechat-login`
4. 根据 `firstLoginCompleted` 和 `nextStep` 跳转

### 10.2 首登基础信息

1. `GET /miniapp/config/prd01`
2. `GET /miniapp/dict/profile-options`
3. 地址只选省市时调用 `GET /miniapp/dict/locations/two-level`；需要区县时按需懒加载 `GET /miniapp/dict/locations`
4. `GET /miniapp/profile/init-status`
5. 每步 `POST /miniapp/profile/init-step`

### 10.3 编辑资料/主页预览

1. `GET /miniapp/profile/home-detail`
2. 如果要展示中文选项，调用 `GET /miniapp/dict/profile-options`
3. 基础资料保存用 `PUT /miniapp/profile/basic`
4. 脱单目标/感情状态/标签/歌曲/微信号分别调用独立接口

### 10.4 认证中心

1. 首页：`GET /miniapp/verify/status`
2. 头像页：`GET /miniapp/profile/avatar`，提交 `POST /miniapp/profile/avatar`
3. 实名页：`GET /miniapp/verify/real-name`，提交 `POST /miniapp/verify/real-name`
4. 学历页：`GET /miniapp/verify/education`，提交 `POST /miniapp/verify/education`

### 10.5 审核型内容

1. 相册：`GET/POST/PUT/DELETE /miniapp/profile/albums`
2. 背景图：`GET/PUT/DELETE /miniapp/profile/background`
3. 自我介绍：`GET/POST /miniapp/profile/introduction`
4. 关于我：`GET/POST /miniapp/profile/about-me`
5. 语音介绍：`GET/POST/DELETE /miniapp/profile/voice-intro`

## 11. 后端校验与审核流

| 模块 | 后端校验 | 是否生成审核记录 | Provider |
| --- | --- | --- | --- |
| 头像 | URL、来源、审核中不可重复提交 | 是，`AVATAR` | 图片安全 mock |
| 相册 | 数量、大小、格式、审核中状态 | 是，`ALBUM_PHOTO` | 图片安全 mock |
| 背景图 | 大小、格式、同时只允许一张待审核/审核中 | 是，`PROFILE_BG` | 图片安全 mock |
| 自我介绍 | 字段开关、20-300 字、审核中不可重复提交 | 是，`ABOUT_ME` | 文本安全 mock |
| 关于我 | 字段开关、题目 key、2-500 字、同题审核中不可重复提交 | 是，`PROFILE_QA` | 文本安全 mock |
| 语音介绍 | 字段开关、10-60 秒、审核中不可重复提交 | 是，`VOICE_INTRO` | 音频安全 mock |
| 实名认证 | 手机号已绑定、协议勾选、通过后不可修改 | 是，`REAL_NAME` | 实名三要素 mock |
| 学历认证 | 实名前置、方式字段必填、材料数量、审核中不可重复提交 | 是，`EDUCATION` | 学历核验 mock |
| 基础资料 | 字段展示/必填、年龄、字典、地区、范围 | 否 | 无 |
| 脱单目标/感情状态/标签 | 字典 code、标签最多 16 个 | 否 | 无 |
| 歌曲 | 先搜索再保存 | 否 | 歌曲搜索 mock |
| 微信号 | 格式 `[A-Za-z][A-Za-z0-9_-]{5,19}` | 否 | 无 |

## 12. 不要新接入的旧接口

旧版聚合资料、聚合媒体和聚合开放文本接口不再作为小程序对接范围，本文不再展开旧接口出入参。前端联调只按本文第 2-11 节流程和第 13 节接口明细实现。

## 13. 接口出入参明细与示例

本节是前端对接时的字段字典。所有响应外层统一为 `{"code":200,"msg":"success","data":...}`，下方示例均保留外层结构。

### 13.1 通用枚举中文

| 枚举字段 | 英文值 | 中文含义 |
| --- | --- | --- |
| 审核状态 | `NOT_SUBMITTED` | 无记录/未提交 |
| 审核状态 | `PENDING` | 待审核 |
| 审核状态 | `REVIEWING` | 审核中 |
| 审核状态 | `APPROVED` | 已通过 |
| 审核状态 | `REJECTED` | 已驳回 |
| 审核状态 | `EXPIRED` | 已失效 |
| 审核来源 | `MACHINE` | 机审 |
| 审核来源 | `MANUAL` | 人工审核 |
| 性别 | `MALE` | 男 |
| 性别 | `FEMALE` | 女 |
| 头像来源 | `CAMERA` | 拍照 |
| 头像来源 | `ALBUM` | 从相册选择 |
| 学历人群 | `STUDENT` | 在校生 |
| 学历人群 | `MAINLAND_GRADUATE` | 中国大陆毕业生 |
| 学历认证方式 | `STUDENT_CARD` | 学生证或在读证明 |
| 学历认证方式 | `CHSI` | 学信网在线验证码 |
| 学历认证方式 | `DIPLOMA_NO` | 毕业证或学位证书编号 |
| 学历认证方式 | `MATERIAL_UPLOAD` | 上传毕业证或学位证书 |
| 地区层级 | `PROVINCE` | 省 |
| 地区层级 | `CITY` | 市 |
| 地区层级 | `DISTRICT` | 区县 |
| 核心准入状态 | `CORE_ALLOWED` | 核心能力可用 |
| 核心准入状态 | `CORE_BLOCKED` | 核心能力受限 |
| 核心准入状态 | `NON_CORE_ONLY` | 仅非核心能力可用 |
| 首登动作 | `CONTINUE_STEP_{n}` | 继续第 n 步 |
| 首登动作 | `COMPLETED` | 首登已完成 |

字典类字段如身份、学历、行业、职业、年收入、婚姻状况、脱单目标、感情状态、标签，均使用 `/miniapp/dict/profile-options` 返回的 `code/label`，业务接口只传 `code`。

### 13.2 全局配置与字典接口

#### GET `/miniapp/config/prd01`

入参：无。

出参：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `accessPolicy` | Object | 准入门槛，包含年龄范围和三重认证要求 |
| `initFields` | Array | 首登 5 步展示、必填、可跳过配置 |
| `requiredFields` | Array<String> | 当前必填字段 ID |
| `fieldSettings` | Array | 字段展示、必填、计分配置 |
| `profileCompleteness` | Object | 资料完整度计分项和总分 |
| `copywriting` | Object | 小程序展示文案配置 |
| `uploadLimits` | Object | 学历材料、相册、背景图、语音上传限制 |
| `auditPolicy` | Object | 审核 SLA 展示配置 |
| `smsSecurity` | Object | 短信倒计时、有效期、每日次数 |
| `regionScope` | Object | 地区接口路径 |
| `configUpdatedAt` | String | 配置最后更新时间 |

示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "accessPolicy": {
      "minAge": 18,
      "maxAge": 60,
      "tripleCertificationRequired": true,
      "requiredCertifications": ["REAL_NAME", "AVATAR", "EDUCATION"]
    },
    "smsSecurity": {
      "sendCountdownSeconds": 60,
      "validMinutes": 5,
      "dailySendLimit": 10,
      "providerCode": "MOCK"
    },
    "uploadLimits": {
      "album": {"maxCount": 9, "maxMb": 10, "formats": ["jpg", "jpeg", "png"]},
      "voice": {"maxCount": 1, "maxMb": 20, "formats": ["mp3"]},
      "voiceMinDuration": 10,
      "voiceMaxDuration": 60
    },
    "fieldSettings": [
      {"fieldId": "nickname", "label": "昵称", "visible": true, "required": true, "scoreEnabled": true}
    ],
    "copywriting": {
      "avatar_notice": {"group": "头像认证", "scene": "页面说明", "enabled": true, "content": "请上传本人清晰头像"}
    },
    "configUpdatedAt": "2026-07-15 10:00:00"
  }
}
```

#### GET `/miniapp/dict/profile-options`

入参：无。

出参：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `identity` | Array | 身份字典，如在校生、职场人 |
| `educationLevel` | Array | 最高学历字典 |
| `industry` | Array | 行业字典 |
| `occupation` | Array | 职业字典 |
| `annualIncome` | Array | 年收入字典 |
| `maritalStatus` | Array | 婚姻状况字典 |
| `datingGoal` | Array | 脱单目标字典 |
| `emotionalStatus` | Array | 感情状态字典 |
| `profileTag` | Array | 标签扁平列表 |
| `profileTagGroups` | Array | 标签分组列表 |
| `educationUserType` | Array | 学历认证人群 |
| `educationMethod` | Array | 学历认证方式 |
| `avatarSource` | Array | 头像来源 |

字典项字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `code` | String | 提交给业务接口的值 |
| `label` | String | 页面展示中文 |
| `sort` | Number | 排序 |
| `categoryCode/categoryLabel` | String | 标签所属分类，仅标签项有 |

示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "identity": [{"code": "STUDENT", "label": "在校生", "sort": 1}],
    "educationLevel": [{"code": "BACHELOR", "label": "本科", "sort": 3}],
    "profileTagGroups": [
      {
        "categoryCode": "MBTI",
        "categoryLabel": "MBTI",
        "options": [{"code": "INFJ", "label": "INFJ提倡者", "sort": 1}]
      }
    ]
  }
}
```

#### GET `/miniapp/dict/locations`

入参：

| 参数 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `parentCode` | String | 否 | 父级地区 code；空值查省，传省查市，传市查区县 |

出参：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `code` | String | 地区 code |
| `name` | String | 地区名称 |
| `level` | String | 地区层级，`PROVINCE` 省、`CITY` 市、`DISTRICT` 区县 |
| `hasChildren` | Boolean | 是否还有下一级 |

示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": [
    {"code": "410100", "name": "郑州市", "level": "CITY", "hasChildren": true}
  ]
}
```

#### GET `/miniapp/dict/locations/two-level`

入参：无。

出参：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `code` | String | 省/市 code |
| `name` | String | 省/市名称 |
| `level` | String | `PROVINCE` 省、`CITY` 市 |
| `children` | Array | 省下面的市级列表；城市节点固定空数组 |

示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": [
    {
      "code": "410000",
      "name": "河南省",
      "level": "PROVINCE",
      "children": [
        {"code": "410100", "name": "郑州市", "level": "CITY", "children": []}
      ]
    }
  ]
}
```

### 13.3 OSS 上传凭证接口

以下 5 个接口入参和出参一致，仅校验规则不同。

| 场景 | Path | 校验配置 | 上传后提交给业务接口的字段 |
| --- | --- | --- | --- |
| 头像 | `POST /miniapp/file/upload-ticket/avatar` | 默认按图片大小和格式校验 | `avatarUrl` |
| 学历材料 | `POST /miniapp/file/upload-ticket/education` | `uploadLimits.education` | `materialUrls[]` |
| 相册 | `POST /miniapp/file/upload-ticket/album` | `uploadLimits.album` | `mediaUrl` |
| 资料背景图 | `POST /miniapp/file/upload-ticket/background` | `uploadLimits.profileBg` | `mediaUrl` |
| 语音介绍 | `POST /miniapp/file/upload-ticket/voice` | `uploadLimits.voice` | `voiceUrl` |

入参：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `fileName` | String | 是 | 文件名，后端从后缀判断格式 |
| `fileSizeBytes` | Number | 是 | 文件大小，单位字节 |

出参：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `uploadUrl` | String | OSS 表单上传地址 |
| `key` | String | 本次上传唯一对象 Key |
| `formData` | Object | 直传 OSS 的表单字段 |
| `expiresAt` | Number | 凭证过期时间戳，秒 |
| `fileUrl` | String | 上传成功后提交给业务接口的稳定 URL |
| `protectedFile` | Boolean | 是否为受保护凭证文件 |

头像上传凭证示例：

```json
{
  "fileName": "avatar.jpg",
  "fileSizeBytes": 204800
}
```

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "uploadUrl": "https://oss.example.com",
    "key": "miniapp/2026/07/avatar.jpg",
    "formData": {"policy": "xxx", "signature": "xxx"},
    "expiresAt": 1784090400,
    "fileUrl": "https://cdn.example.com/miniapp/2026/07/avatar.jpg",
    "protectedFile": false
  }
}
```

学历材料上传凭证示例：

```json
{
  "fileName": "education-card.png",
  "fileSizeBytes": 512000
}
```

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "uploadUrl": "https://oss.example.com",
    "key": "miniapp/credential/education-card.png",
    "formData": {"policy": "xxx", "signature": "xxx"},
    "expiresAt": 1784090400,
    "fileUrl": "/miniapp/file/credential/miniapp/credential/education-card.png",
    "protectedFile": true
  }
}
```

相册上传凭证示例：

```json
{
  "fileName": "album-1.jpg",
  "fileSizeBytes": 204800
}
```

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "uploadUrl": "https://oss.example.com",
    "key": "miniapp/2026/07/album-1.jpg",
    "formData": {"policy": "xxx", "signature": "xxx"},
    "expiresAt": 1784090400,
    "fileUrl": "https://cdn.example.com/miniapp/2026/07/album-1.jpg",
    "protectedFile": false
  }
}
```

资料背景图上传凭证示例：

```json
{
  "fileName": "profile-bg.jpg",
  "fileSizeBytes": 307200
}
```

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "uploadUrl": "https://oss.example.com",
    "key": "miniapp/2026/07/profile-bg.jpg",
    "formData": {"policy": "xxx", "signature": "xxx"},
    "expiresAt": 1784090400,
    "fileUrl": "https://cdn.example.com/miniapp/2026/07/profile-bg.jpg",
    "protectedFile": false
  }
}
```

语音介绍上传凭证示例：

```json
{
  "fileName": "voice-intro.mp3",
  "fileSizeBytes": 1048576
}
```

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "uploadUrl": "https://oss.example.com",
    "key": "miniapp/2026/07/voice-intro.mp3",
    "formData": {"policy": "xxx", "signature": "xxx"},
    "expiresAt": 1784090400,
    "fileUrl": "https://cdn.example.com/miniapp/2026/07/voice-intro.mp3",
    "protectedFile": false
  }
}
```

### 13.4 登录接口

#### POST `/miniapp/auth/sms-code`

入参：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `phone` | String | 是 | 中国大陆手机号 |

出参：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `countdownSeconds` | Number | 再次获取验证码倒计时秒数 |
| `validMinutes` | Number | 验证码有效分钟数 |
| `dailyLimit` | Number | 每日发送上限 |
| `dailyRemaining` | Number | 今日剩余发送次数 |
| `providerCode` | String | 短信通道，当前 `MOCK` 表示 mock 通道 |

示例：

```json
{"phone": "13800138000"}
```

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "countdownSeconds": 60,
    "validMinutes": 5,
    "dailyLimit": 10,
    "dailyRemaining": 9,
    "providerCode": "MOCK"
  }
}
```

#### POST `/miniapp/auth/phone-login`

入参：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `phone` | String | 是 | 中国大陆手机号 |
| `smsCode` | String | 是 | 短信验证码 |
| `agreeProtocol` | Boolean | 是 | 是否勾选用户协议和隐私协议 |

出参：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `token` | String | 登录态 token，后续放入 `X-Auth-Token` |
| `userId` | Number | 当前用户 ID |
| `phone` | String | 明文手机号，仅本人登录响应返回 |
| `maskedPhone` | String | 脱敏手机号 |
| `nickname` | String | 昵称 |
| `avatar` | String | 本人头像预览 |
| `isNewUser` | Boolean | 是否新注册用户 |
| `firstLoginCompleted` | Boolean | 是否完成首次基础资料 |
| `nextStep` | Number | 下一步首登步骤，完成后为空 |
| `accessStatus` | Object | 准入能力状态 |

示例：

```json
{
  "phone": "13800138000",
  "smsCode": "123456",
  "agreeProtocol": true
}
```

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "token": "miniapp-token",
    "userId": 59,
    "maskedPhone": "138****8000",
    "isNewUser": false,
    "firstLoginCompleted": false,
    "nextStep": 1,
    "accessStatus": {"coreAccessStatus": "CORE_BLOCKED"}
  }
}
```

#### POST `/miniapp/auth/wechat-login`

入参：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `loginCode` | String | 否 | `wx.login` 返回的临时 code |
| `phoneCode` | String | 是 | 微信 `getPhoneNumber` 返回的手机号授权 code |
| `agreeProtocol` | Boolean | 是 | 是否勾选用户协议和隐私协议 |

出参：同 `POST /miniapp/auth/phone-login`。

示例：

```json
{
  "loginCode": "wx-login-code",
  "phoneCode": "wx-phone-code",
  "agreeProtocol": true
}
```

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "token": "miniapp-token",
    "userId": 60,
    "maskedPhone": "139****9000",
    "isNewUser": true,
    "firstLoginCompleted": false,
    "nextStep": 1,
    "accessStatus": {"coreAccessStatus": "CORE_BLOCKED"}
  }
}
```

### 13.5 首登基础信息接口

#### GET `/miniapp/profile/init-status`

入参：无。

出参：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `firstLoginCompleted` | Boolean | 是否完成首登基础信息 |
| `currentStep` | Number | 当前步骤 |
| `nextStep` | Number | 下一步步骤；完成后为空 |
| `completedSteps` | Array<Number> | 已完成步骤 |
| `nextAction` | String | `CONTINUE_STEP_{n}` 继续第 n 步，`COMPLETED` 已完成 |
| `savedFields` | Object | 已保存字段值 |

示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "firstLoginCompleted": false,
    "currentStep": 2,
    "nextStep": 2,
    "completedSteps": [1],
    "nextAction": "CONTINUE_STEP_2",
    "savedFields": {"gender": "FEMALE"}
  }
}
```

#### POST `/miniapp/profile/init-step`

公共出参同 `GET /miniapp/profile/init-status`。

入参字段：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `step` | Number | 是 | 当前步骤，1-5 |
| `gender` | String | step=1 时按配置 | 性别，`MALE` 男、`FEMALE` 女 |
| `birthday` | String | step=2 时按配置 | 出生日期，格式 `yyyy-MM-dd` |
| `identity` | String | step=3 时按配置 | 身份字典 code |
| `educationLevel` | String | step=4 时按配置 | 学历字典 code |
| `locationProvince` | String | step=5 时按配置 | 现居省份 code |
| `locationCity` | String | step=5 时按配置 | 现居城市 code |
| `locationDistrict` | String | step=5 时按配置 | 现居区县 code |

示例 1 - 性别：

```json
{"step": 1, "gender": "FEMALE"}
```

示例 2 - 出生日期：

```json
{"step": 2, "birthday": "1997-03-06"}
```

示例 3 - 身份：

```json
{"step": 3, "identity": "WORKER"}
```

示例 4 - 学历：

```json
{"step": 4, "educationLevel": "BACHELOR"}
```

示例 5 - 现居地：

```json
{
  "step": 5,
  "locationProvince": "410000",
  "locationCity": "410100",
  "locationDistrict": "410102"
}
```

响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "firstLoginCompleted": true,
    "currentStep": 5,
    "nextStep": null,
    "completedSteps": [1, 2, 3, 4, 5],
    "nextAction": "COMPLETED",
    "savedFields": {
      "gender": "FEMALE",
      "birthday": "1997-03-06",
      "identity": "WORKER",
      "educationLevel": "BACHELOR",
      "locationProvince": "410000",
      "locationCity": "410100",
      "locationDistrict": "410102"
    }
  }
}
```

### 13.6 主页与基础资料接口

#### GET `/miniapp/profile/home-detail`

入参：无。

出参：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `profile` | Object | 当前用户主页和编辑资料字段值 |
| `fieldSettings` | Array | 字段是否展示、是否必填、是否可编辑 |
| `verificationStatus` | Object | 认证状态总览 |
| `accessStatus` | Object | 准入状态 |
| `profileOptionsPath` | String | 资料字典接口路径 |
| `locationOptionsPath` | String | 地区字典接口路径 |
| `runtimeConfig` | Object | 运行时配置摘要 |

`profile` 主要字段中文说明：

| 字段 | 中文说明 |
| --- | --- |
| `avatar` | 本人头像预览 |
| `nickname` | 昵称 |
| `gender` | 性别 code |
| `birthday/age` | 出生日期/年龄 |
| `height/weight` | 身高/体重 |
| `identity/educationLevel/industry/occupation/annualIncome/maritalStatus` | 字典 code |
| `locationProvince/locationCity/locationDistrict` | 现居地 code |
| `hometownProvince/hometownCity/hometownDistrict` | 家乡 code |
| `datingGoal/emotionalStatus` | 脱单目标/感情状态 code |
| `tags` | 标签 code 数组 JSON 字符串 |
| `aboutMe` | 自我介绍本人回显 |
| `photos/profileBgImage` | 相册/背景图 |
| `voiceIntroUrl/voiceIntroDuration/voiceIntroAuditStatus` | 语音介绍 |
| `favoriteSongId/favoriteSongName/favoriteSongArtist/favoriteSongCoverUrl` | 爱听歌曲 |
| `wechatId` | 微信号，仅本人页展示 |
| `profileScore` | 资料完整度分数 |

示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "profile": {
      "nickname": "彼脑虎",
      "gender": "FEMALE",
      "age": 29,
      "height": 163,
      "weight": 45,
      "locationCity": "410100",
      "tags": "[\"IT_GIRL\"]",
      "profileScore": 92
    },
    "fieldSettings": [
      {"fieldId": "nickname", "label": "昵称", "visible": true, "required": true, "editable": true}
    ],
    "verificationStatus": {"realNameStatus": "APPROVED", "educationStatus": "APPROVED", "avatarVerifyStatus": "APPROVED"}
  }
}
```

#### GET `/miniapp/profile/basic`

入参：无。

出参：基础资料当前值，字段中文同 `PUT /miniapp/profile/basic`；额外返回 `minAge/maxAge`、`profileScore`、`basicProfileCompleted`、`missingRequiredFields`、`fieldSettings`。

示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "nickname": "彼脑虎",
    "gender": "FEMALE",
    "birthday": "1997-03-06",
    "identity": "WORKER",
    "educationLevel": "BACHELOR",
    "locationProvince": "410000",
    "locationCity": "410100",
    "minAge": 18,
    "maxAge": 60,
    "missingRequiredFields": []
  }
}
```

#### PUT `/miniapp/profile/basic`

入参：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `nickname` | String | 按配置 | 昵称，2-12 字 |
| `gender` | String | 按配置 | 性别，`MALE` 男、`FEMALE` 女 |
| `birthday` | String | 按配置 | 出生日期，按年龄范围校验 |
| `height` | Number | 按配置 | 身高 cm，140-220 |
| `weight` | Number | 按配置 | 体重 kg，30-200 |
| `identity` | String | 按配置 | 身份字典 code |
| `educationLevel` | String | 按配置 | 学历字典 code |
| `industry` | String | 按配置 | 行业字典 code |
| `occupation` | String | 按配置 | 职业字典 code |
| `annualIncome` | String | 按配置 | 年收入字典 code |
| `maritalStatus` | String | 按配置 | 婚姻状况字典 code |
| `locationProvince/locationCity/locationDistrict` | String | 按配置 | 现居地 code |
| `hometownProvince/hometownCity/hometownDistrict` | String | 按配置 | 家乡 code |
| `company` | String | 按配置 | 公司名称，2-50 字 |
| `school` | String | 按配置 | 学校，2-50 字 |
| `major` | String | 按配置 | 专业，最长 100 字 |

出参：同 `GET /miniapp/profile/basic`。

示例：

```json
{
  "nickname": "彼脑虎",
  "gender": "FEMALE",
  "birthday": "1997-03-06",
  "height": 163,
  "weight": 45,
  "identity": "WORKER",
  "educationLevel": "BACHELOR",
  "industry": "IT",
  "occupation": "DESIGNER",
  "annualIncome": "15_30W",
  "locationProvince": "410000",
  "locationCity": "410100",
  "locationDistrict": "410102"
}
```

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "nickname": "彼脑虎",
    "gender": "FEMALE",
    "birthday": "1997-03-06",
    "height": 163,
    "weight": 45,
    "identity": "WORKER",
    "educationLevel": "BACHELOR",
    "industry": "IT",
    "occupation": "DESIGNER",
    "annualIncome": "15_30W",
    "locationProvince": "410000",
    "locationCity": "410100",
    "locationDistrict": "410102",
    "profileScore": 86,
    "missingRequiredFields": []
  }
}
```

### 13.7 认证中心接口

#### GET `/miniapp/verify/status`

入参：无。

出参：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `realNameStatus` | String | 实名认证最新状态 |
| `realNameRejectReason` | String | 实名驳回或失效原因 |
| `realNameSubmitTime` | String | 实名最近提交时间 |
| `realNameCanSubmit` | Boolean | 实名是否可重新提交 |
| `educationStatus` | String | 学历认证最新状态 |
| `educationRejectReason` | String | 学历驳回或失效原因 |
| `educationSubmitTime` | String | 学历最近提交时间 |
| `educationCanSubmit` | Boolean | 学历是否可提交 |
| `educationBlockedReason` | String | 学历不可提交原因 |
| `educationSlaHours` | Number | 学历审核承诺小时数 |
| `educationSlaText` | String | 学历审核时长展示文案 |
| `educationEstimatedCompleteTime` | String | 学历预计完成时间 |
| `avatarVerifyStatus` | String | 头像认证最新状态 |
| `avatarVerifyRejectReason` | String | 头像驳回或失效原因 |
| `avatarVerifySubmitTime` | String | 头像最近提交时间 |
| `avatarCanSubmit` | Boolean | 头像是否可提交 |
| `profilePhotoAuditStatus` | String | 相册/背景图最新审核状态 |
| `openTextAuditStatus` | String | 自我介绍/关于我最新审核状态 |
| `verifyLevel` | Number | 三重认证已通过数量，0-3 |
| `unlockMateRecommend` | Boolean | 是否解锁匹配推荐 |
| `coreAccessStatus` | String | 核心准入状态 |
| `accessStatus` | Object | 详细准入能力 |

示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "realNameStatus": "APPROVED",
    "educationStatus": "PENDING",
    "educationSlaHours": 24,
    "educationEstimatedCompleteTime": "2026-07-16 10:00:00",
    "avatarVerifyStatus": "APPROVED",
    "verifyLevel": 2,
    "coreAccessStatus": "CORE_BLOCKED"
  }
}
```

#### GET `/miniapp/profile/avatar`

入参：无。

出参：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `avatarUrl` | String | 本人最新提交头像或当前生效头像 |
| `thumbUrl` | String | 头像缩略图 |
| `avatarSource` | String | 头像来源，`CAMERA` 拍照、`ALBUM` 相册 |
| `auditStatus` | String | 头像审核状态 |
| `auditSource` | String | 机审/人工审核 |
| `rejectReason` | String | 驳回或失效原因 |
| `submitTime` | String | 提交时间 |
| `canSubmit` | Boolean | 是否可重新提交 |

示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "avatarUrl": "https://cdn.example.com/avatar.jpg",
    "avatarSource": "ALBUM",
    "auditStatus": "REJECTED",
    "rejectReason": "头像不符合展示规范",
    "canSubmit": true
  }
}
```

#### POST `/miniapp/profile/avatar`

入参：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `avatarSource` | String | 是 | `CAMERA` 拍照、`ALBUM` 从相册选择 |
| `avatarUrl` | String | 是 | 裁剪后的头像公网 URL |
| `thumbUrl` | String | 否 | 缩略图 URL |

出参：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `auditRecordId` | Number | 头像审核记录 ID |
| `auditStatus` | String | 提交后的审核状态 |
| `canSubmit` | Boolean | 是否可继续提交 |
| `avatarUrl` | String | 本次提交头像 |

示例：

```json
{
  "avatarSource": "ALBUM",
  "avatarUrl": "https://cdn.example.com/avatar.jpg",
  "thumbUrl": "https://cdn.example.com/avatar-thumb.jpg"
}
```

#### GET `/miniapp/verify/real-name`

入参：无。

出参：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `auditStatus` | String | 实名认证最新状态 |
| `auditSource` | String | 审核来源 |
| `rejectReason` | String | 驳回或失效原因 |
| `submitTime` | String | 提交时间 |
| `canSubmit` | Boolean | 是否可提交；已通过后为 `false` |
| `realName` | String | 脱敏姓名 |
| `idCardNo` | String | 脱敏身份证号 |

示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "auditStatus": "APPROVED",
    "auditSource": "MACHINE",
    "canSubmit": false,
    "realName": "张*",
    "idCardNo": "4101**********0588"
  }
}
```

#### POST `/miniapp/verify/real-name`

入参：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `realName` | String | 是 | 真实姓名 |
| `idCardNo` | String | 是 | 中国大陆二代身份证号 |
| `singleCommitmentChecked` | Boolean | 是 | 是否勾选单身承诺/认证协议 |

出参：同 `GET /miniapp/verify/status`。

示例：

```json
{
  "realName": "张三",
  "idCardNo": "410100199703060588",
  "singleCommitmentChecked": true
}
```

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "realName": {"auditStatus": "PENDING", "canSubmit": false},
    "avatar": {"auditStatus": "APPROVED", "canSubmit": true},
    "education": {"auditStatus": "NOT_SUBMITTED", "canSubmit": true},
    "educationSlaHours": 24,
    "educationSlaText": "预计 24 小时内完成审核"
  }
}
```

#### GET `/miniapp/verify/education`

入参：无。

出参：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `auditStatus` | String | 学历认证最新状态 |
| `auditSource` | String | 审核来源 |
| `rejectReason` | String | 驳回或失效原因 |
| `submitTime` | String | 提交时间 |
| `canSubmit` | Boolean | 是否可提交 |
| `blockedReason` | String | 不可提交原因 |
| `educationSlaHours` | Number | 审核承诺小时数 |
| `educationSlaText` | String | 审核时长文案 |
| `educationEstimatedCompleteTime` | String | 预计完成时间 |
| `educationUserType` | String | 学历人群 code |
| `educationUserTypeLabel` | String | 学历人群中文 |
| `identityCode/identityLabel` | String | 映射后的身份 code/中文 |
| `educationMethod` | String | 认证方式 code |
| `educationMethodLabel` | String | 认证方式中文 |
| `schoolName` | String | 学校名称 |
| `educationLevel/educationLevelLabel` | String | 学历 code/中文 |
| `chsiCode` | String | 学信网验证码 |
| `diplomaNo` | String | 证书编号 |
| `certificateName` | String | 证书姓名 |
| `materialUrls` | Array<String> | 材料 URL |

示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "auditStatus": "PENDING",
    "educationUserType": "MAINLAND_GRADUATE",
    "educationUserTypeLabel": "中国大陆毕业生",
    "identityCode": "WORKER",
    "identityLabel": "职场人",
    "educationMethod": "CHSI",
    "educationMethodLabel": "学信网验证码",
    "schoolName": "浙江工商大学",
    "educationLevel": "BACHELOR",
    "educationLevelLabel": "本科",
    "chsiCode": "ABCD12345678"
  }
}
```

#### POST `/miniapp/verify/education`

公共入参字段：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `educationUserType` | String | 是 | `STUDENT` 在校生、`MAINLAND_GRADUATE` 中国大陆毕业生 |
| `educationMethod` | String | 是 | `STUDENT_CARD` 学生证/在读证明、`CHSI` 学信网验证码、`DIPLOMA_NO` 证书编号、`MATERIAL_UPLOAD` 上传证书 |
| `schoolName` | String | 是 | 学校名称，2-100 字 |
| `educationLevel` | String | 是 | 学历字典 code |
| `chsiCode` | String | 按方式 | 学信网在线验证码，12-18 位 |
| `diplomaNo` | String | 按方式 | 毕业证或学位证书编号，最长 64 字 |
| `certificateName` | String | 按方式 | 证书姓名，最长 50 字 |
| `materialUrls` | Array<String> | 按方式 | 学生证/在读证明/毕业证/学位证材料 URL |
| `educationAgreementChecked` | Boolean | 是 | 是否勾选学历认证协议 |

出参：同 `GET /miniapp/verify/status`。

示例 1 - 在校生材料：

```json
{
  "educationUserType": "STUDENT",
  "educationMethod": "STUDENT_CARD",
  "schoolName": "浙江工商大学",
  "educationLevel": "BACHELOR",
  "materialUrls": ["/miniapp/file/credential/edu/student-card-1.jpg"],
  "educationAgreementChecked": true
}
```

示例 2 - 中国大陆毕业生学信网验证码：

```json
{
  "educationUserType": "MAINLAND_GRADUATE",
  "educationMethod": "CHSI",
  "schoolName": "浙江工商大学",
  "educationLevel": "BACHELOR",
  "chsiCode": "ABCD12345678",
  "educationAgreementChecked": true
}
```

示例 3 - 中国大陆毕业生证书编号：

```json
{
  "educationUserType": "MAINLAND_GRADUATE",
  "educationMethod": "DIPLOMA_NO",
  "schoolName": "浙江工商大学",
  "educationLevel": "BACHELOR",
  "diplomaNo": "202601010001",
  "certificateName": "张三",
  "educationAgreementChecked": true
}
```

示例 4 - 中国大陆毕业生上传证书：

```json
{
  "educationUserType": "MAINLAND_GRADUATE",
  "educationMethod": "MATERIAL_UPLOAD",
  "schoolName": "浙江工商大学",
  "educationLevel": "BACHELOR",
  "certificateName": "张三",
  "materialUrls": ["/miniapp/file/credential/edu/diploma-1.jpg"],
  "educationAgreementChecked": true
}
```

响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "realName": {"auditStatus": "APPROVED", "canSubmit": false},
    "avatar": {"auditStatus": "APPROVED", "canSubmit": true},
    "education": {
      "auditStatus": "PENDING",
      "canSubmit": false,
      "rejectReason": null,
      "educationMethod": "MATERIAL_UPLOAD",
      "educationMethodLabel": "上传证书"
    },
    "educationSlaHours": 24,
    "educationSlaText": "预计 24 小时内完成审核"
  }
}
```

### 13.8 审核型资料接口

#### GET `/miniapp/profile/albums`

入参：无。

出参 `data[]`：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `mediaId` | Number | 媒体/审核记录 ID，替换和删除时使用 |
| `mediaType` | String | 固定 `ALBUM`，相册图片 |
| `mediaUrl` | String | 图片 URL |
| `thumbUrl` | String | 缩略图 URL |
| `sortOrder` | Number | 排序 |
| `auditStatus` | String | 审核状态 |
| `rejectReason` | String | 驳回或失效原因 |
| `visibleToPublic` | Boolean | 是否对外展示 |

示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": [
    {"mediaId": 101, "mediaType": "ALBUM", "mediaUrl": "https://cdn.example.com/a.jpg", "auditStatus": "APPROVED", "visibleToPublic": true}
  ]
}
```

#### POST `/miniapp/profile/albums`

入参：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `mediaUrl` | String | 是 | 图片公网 URL |
| `thumbUrl` | String | 否 | 缩略图 URL |
| `fileSizeBytes` | Number | 是 | 文件大小，按相册上传限制校验 |
| `sortOrder` | Number | 否 | 排序 |

出参：单条 `ProfileMediaVO`，字段同 `GET /miniapp/profile/albums`。

示例：

```json
{
  "mediaUrl": "https://cdn.example.com/album-b.jpg",
  "thumbUrl": "https://cdn.example.com/album-b-thumb.jpg",
  "fileSizeBytes": 204800,
  "sortOrder": 2
}
```

#### PUT `/miniapp/profile/albums/{mediaId}`

路径参数：

| 参数 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `mediaId` | Number | 是 | 要替换的相册图片 ID |

Body 同新增相册。出参同新增相册。

示例：

```json
{
  "mediaUrl": "https://cdn.example.com/album-new.jpg",
  "fileSizeBytes": 204800,
  "sortOrder": 2
}
```

#### DELETE `/miniapp/profile/albums/{mediaId}`

路径参数：

| 参数 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `mediaId` | Number | 是 | 要删除的相册图片 ID |

出参：`data=null`。删除不物理删除，后端把审核记录置为 `EXPIRED`。

示例：

```json
{"code": 200, "msg": "success", "data": null}
```

#### GET `/miniapp/profile/background`

入参：无。

出参：单条 `ProfileMediaVO`，字段同相册；无背景图时 `data=null`。

示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {"mediaId": 201, "mediaType": "PROFILE_BG", "mediaUrl": "https://cdn.example.com/bg.jpg", "auditStatus": "APPROVED"}
}
```

#### PUT `/miniapp/profile/background`

入参：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `mediaUrl` | String | 是 | 背景图公网 URL |
| `thumbUrl` | String | 否 | 缩略图 URL |
| `fileSizeBytes` | Number | 是 | 文件大小，按背景图上传限制校验 |

出参：单条 `ProfileMediaVO`。

示例：

```json
{
  "mediaUrl": "https://cdn.example.com/profile-bg.jpg",
  "thumbUrl": "https://cdn.example.com/profile-bg-thumb.jpg",
  "fileSizeBytes": 409600
}
```

#### DELETE `/miniapp/profile/background`

入参：无。出参：`data=null`。删除当前生效背景图并置为 `EXPIRED`。

示例：

```json
{"code": 200, "msg": "success", "data": null}
```

#### GET `/miniapp/profile/introduction`

入参：无。

出参：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `latestContent` | String | 本人最新提交内容 |
| `effectiveContent` | String | 当前对外生效内容 |
| `auditStatus` | String | 最新审核状态 |
| `auditSource` | String | 审核来源 |
| `rejectReason` | String | 驳回或失效原因 |
| `submitTime` | String | 提交时间 |
| `canSubmit` | Boolean | 是否可提交 |

示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "latestContent": "我是一个认真生活的人，喜欢运动和阅读。",
    "effectiveContent": "我是一个认真生活的人，喜欢运动和阅读。",
    "auditStatus": "APPROVED",
    "canSubmit": true
  }
}
```

#### POST `/miniapp/profile/introduction`

入参：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `aboutMe` | String | 是 | 自我介绍，20-300 字 |

出参：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `fieldName` | String | 审核字段，`ABOUT_ME` 表示自我介绍 |
| `auditStatus` | String | 审核状态 |
| `auditSource` | String | 审核来源 |
| `rejectReason` | String | 驳回原因 |

示例：

```json
{
  "aboutMe": "我是一个认真生活的人，平时喜欢运动、阅读，也喜欢和朋友一起探索城市。"
}
```

#### GET `/miniapp/profile/about-me`

入参：无。

出参：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `questions` | Array | 关于我固定题目列表 |

`questions[]` 字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `questionKey` | String | 题目 key |
| `title` | String | 题目标题 |
| `placeholder` | String | 输入提示 |
| `latestContent` | String | 本人最新提交内容 |
| `effectiveContent` | String | 当前对外生效内容 |
| `auditStatus` | String | 最新审核状态 |
| `rejectReason` | String | 驳回或失效原因 |
| `canSubmit` | Boolean | 是否可提交 |

题目枚举：

| questionKey | 中文标题 |
| --- | --- |
| `meetingPreference` | 见面偏好 |
| `preferredActivities` | 喜欢的见面活动 |
| `housingStatus` | 住房情况 |
| `carStatus` | 购车情况 |
| `childrenPlan` | 是否想要孩子 |
| `hasChild` | 有无子女 |
| `marriagePlan` | 结婚计划 |
| `religion` | 宗教信仰 |
| `smoking` | 吸烟情况 |
| `drinking` | 饮酒情况 |
| `pets` | 宠物态度 |

示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "questions": [
      {"questionKey": "housingStatus", "title": "住房情况", "auditStatus": "NOT_SUBMITTED", "canSubmit": true}
    ]
  }
}
```

#### POST `/miniapp/profile/about-me`

入参：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `questionKey` | String | 是 | 固定题目 key |
| `contentText` | String | 是 | 回答内容，2-500 字 |

出参：同 `POST /miniapp/profile/introduction`，`fieldName=PROFILE_QA` 表示资料问答。

示例 1 - 住房情况：

```json
{
  "questionKey": "housingStatus",
  "contentText": "目前在杭州稳定居住，通勤方便，生活节奏比较规律。"
}
```

示例 2 - 见面偏好：

```json
{
  "questionKey": "meetingPreference",
  "contentText": "更喜欢轻松自然的见面方式，比如咖啡、散步或一起看展。"
}
```

响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "fieldName": "PROFILE_QA",
    "auditStatus": "PENDING",
    "auditSource": "MACHINE",
    "rejectReason": null
  }
}
```

#### GET `/miniapp/profile/voice-intro`

入参：无。

出参：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `voiceIntroUrl` | String | 当前可播放语音 URL；未通过审核时可能为空 |
| `voiceIntroDuration` | Number | 语音时长秒 |
| `voiceIntroAuditStatus` | String | 语音审核状态 |
| `voiceIntroRejectReason` | String | 驳回或失效原因 |
| `visibleToPublic` | Boolean | 是否对其他用户展示 |
| `canSubmit` | Boolean | 是否可提交 |

示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "voiceIntroUrl": "https://cdn.example.com/voice.mp3",
    "voiceIntroDuration": 18,
    "voiceIntroAuditStatus": "APPROVED",
    "visibleToPublic": true,
    "canSubmit": true
  }
}
```

#### POST `/miniapp/profile/voice-intro`

入参：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `voiceUrl` | String | 是 | 语音 URL，来自 `/miniapp/file/upload-ticket/voice` 上传后的 `fileUrl` |
| `duration` | Number | 是 | 语音时长秒，取 `voiceMinDuration/voiceMaxDuration` |

出参：同 `GET /miniapp/profile/voice-intro`。

示例：

```json
{
  "voiceUrl": "https://cdn.example.com/voice.mp3",
  "duration": 18
}
```

#### DELETE `/miniapp/profile/voice-intro`

入参：无。出参：`data=null`。删除当前有效语音并置为 `EXPIRED`。

示例：

```json
{"code": 200, "msg": "success", "data": null}
```

### 13.9 非审核型资料接口

以下接口不生成审核记录，保存成功后直接写 `app_user`。

#### PUT `/miniapp/profile/dating-goal`

入参：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `code` | String | 是 | 脱单目标字典 code |

出参：`ProfileDetailVO`，即用户资料详情。

示例：

```json
{"code": "MARRIAGE_1_2_YEARS"}
```

#### PUT `/miniapp/profile/emotional-status`

入参：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `code` | String | 是 | 感情状态字典 code |

出参：`ProfileDetailVO`。

示例：

```json
{"code": "SEARCHING"}
```

#### GET `/miniapp/profile/tags`

入参：无。

出参：`data` 为标签 code 的 JSON 字符串数组。

示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": "[\"INFJ\",\"OUTDOOR_LOVER\"]"
}
```

#### PUT `/miniapp/profile/tags`

入参：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `tagCodes` | Array<String> | 是 | 标签 code 数组，最多 16 个 |

出参：`ProfileDetailVO`。

示例：

```json
{
  "tagCodes": ["INFJ", "OUTDOOR_LOVER"]
}
```

#### GET `/miniapp/profile/songs/search`

入参：

| 参数 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `keyword` | String | 否 | 歌曲关键词 |
| `limit` | Number | 否 | 返回数量，默认 10，最大 20 |

出参 `data[]`：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `songId` | String | 三方歌曲 ID |
| `songName` | String | 歌曲名 |
| `artistName` | String | 歌手 |
| `coverUrl` | String | 封面图 URL |

示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": [
    {"songId": "mock-001", "songName": "告白气球", "artistName": "周杰伦", "coverUrl": "https://cdn.example.com/song.jpg"}
  ]
}
```

#### PUT `/miniapp/profile/favorite-song`

入参：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `songId` | String | 是 | 三方歌曲 ID |
| `songName` | String | 是 | 歌曲名 |
| `artistName` | String | 否 | 歌手 |
| `coverUrl` | String | 否 | 封面图 URL，用于主页展示 |

出参：`ProfileDetailVO`。

示例：

```json
{
  "songId": "mock-001",
  "songName": "告白气球",
  "artistName": "周杰伦",
  "coverUrl": "https://cdn.example.com/song.jpg"
}
```

#### GET `/miniapp/profile/wechat-id`

入参：无。

出参：`data` 为当前微信号字符串；未填写时为空。

示例：

```json
{"code": 200, "msg": "success", "data": "wx_abc123"}
```

#### PUT `/miniapp/profile/wechat-id`

入参：

| 字段 | 类型 | 必填 | 中文说明 |
| --- | --- | --- | --- |
| `wechatId` | String | 是 | 微信号，字母开头，6-20 位 |

出参：`ProfileDetailVO`。

示例：

```json
{"wechatId": "wx_abc123"}
```

### 13.10 准入状态接口

#### GET `/miniapp/profile/access-status`

入参：无。

出参：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `canBrowseCards` | Boolean | 是否可浏览用户卡片 |
| `canMatch` | Boolean | 是否可发起匹配 |
| `canMessage` | Boolean | 是否可私信/会话 |
| `canCommunity` | Boolean | 是否可使用社区等非核心能力 |
| `canBeExposed` | Boolean | 是否可被其他用户看到 |
| `coreAccessStatus` | String | 核心准入状态 |
| `blockReasons` | Array | 阻断原因列表 |

`blockReasons[]` 字段：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `code` | String | 阻断原因 code |
| `message` | String | 给小程序展示的中文提示 |

示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "canBrowseCards": true,
    "canMatch": false,
    "canMessage": false,
    "canCommunity": true,
    "canBeExposed": false,
    "coreAccessStatus": "CORE_BLOCKED",
    "blockReasons": [
      {"code": "core_access_triple_not_passed", "message": "请完成实名、头像、学历三重认证后继续使用"}
    ]
  }
}
```

### 13.11 常用返回对象说明

#### `ProfileDetailVO`

多个保存接口返回该对象，字段含义如下：

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `nickname` | String | 昵称 |
| `gender` | String | 性别 code |
| `birthday/age` | String/Number | 出生日期/年龄 |
| `height/weight` | Number | 身高/体重 |
| `identity/educationLevel/industry/occupation/annualIncome/maritalStatus` | String | 字典 code |
| `locationProvince/locationCity/locationDistrict` | String | 现居地 code |
| `hometownProvince/hometownCity/hometownDistrict` | String | 家乡 code |
| `datingGoal/emotionalStatus` | String | 脱单目标/感情状态 code |
| `tags` | String | 标签 code 数组 JSON |
| `photos/profileBgImage` | String | 相册/背景图 JSON 或 URL |
| `favoriteSongId/favoriteSongName/favoriteSongArtist/favoriteSongCoverUrl` | String | 爱听歌曲信息 |
| `wechatId` | String | 微信号 |
| `profileScore` | Number | 资料完整度分数 |

#### `ProfileMediaVO`

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `mediaId` | Number | 媒体/审核记录 ID |
| `mediaType` | String | `ALBUM` 相册、`PROFILE_BG` 背景图 |
| `mediaUrl` | String | 原图 URL |
| `thumbUrl` | String | 缩略图 URL |
| `sortOrder` | Number | 排序 |
| `auditStatus` | String | 审核状态 |
| `rejectReason` | String | 驳回或失效原因 |
| `visibleToPublic` | Boolean | 是否对外展示 |

#### `OpenTextAuditVO`

| 字段 | 类型 | 中文说明 |
| --- | --- | --- |
| `fieldName` | String | `ABOUT_ME` 自我介绍、`PROFILE_QA` 资料问答 |
| `auditStatus` | String | 审核状态 |
| `auditSource` | String | 审核来源 |
| `rejectReason` | String | 驳回原因 |
