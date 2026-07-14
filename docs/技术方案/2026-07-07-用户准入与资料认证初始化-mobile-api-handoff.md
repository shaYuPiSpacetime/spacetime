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
| `uploadLimits.education/album/profileBg` | Object | 上传数量、大小、格式限制 |
| `uploadLimits.voiceMinDuration/voiceMaxDuration` | Number | 语音介绍时长限制，当前 10-60 秒 |
| `auditPolicy.educationSlaHours` | Number | 学历审核承诺小时数 |
| `auditPolicy.educationSlaText` | String | 学历审核展示文案 |
| `smsSecurity.sendCountdownSeconds` | Number | 获取验证码按钮倒计时 |
| `smsSecurity.validMinutes` | Number | 验证码有效期 |
| `smsSecurity.dailySendLimit` | Number | 每日发送上限 |
| `smsSecurity.providerCode` | String | 短信通道，当前 `MOCK` |
| `regionScope.locationDictPath` | String | 地区懒加载接口路径 |
| `configUpdatedAt` | String | 配置最后更新时间，可用于本地缓存刷新 |

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
| `interests` | 兴趣爱好 |
| `idealWeekend` | 理想的另一半 |
| `loveView` | 爱情观 |
| `dailyLife` | 喜欢的见面活动 |
| `lifeSituation` | 住房情况 |
| `moreStory` | 补充更多关于我的故事 |

提交后生成 `PROFILE_QA` 审核记录；同一题审核中不可重复提交。

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

以下接口只为历史兼容保留，不用于本轮小程序前端对接：

| 旧接口 | 替代接口 |
| --- | --- |
| `GET /miniapp/profile/detail` | `GET /miniapp/profile/home-detail` |
| `PATCH /miniapp/profile` | `PUT /miniapp/profile/basic` 和各独立保存接口 |
| `POST /miniapp/profile/media` | 相册用 `/miniapp/profile/albums`；背景图用 `/miniapp/profile/background`；头像用 `/miniapp/profile/avatar`；学历材料随 `/miniapp/verify/education` 提交 |
| `DELETE /miniapp/profile/media/{id}` | 相册删除用 `DELETE /miniapp/profile/albums/{mediaId}`；背景图删除用 `DELETE /miniapp/profile/background`；语音删除用 `DELETE /miniapp/profile/voice-intro` |
| `POST /miniapp/profile/open-text` | 自我介绍用 `/miniapp/profile/introduction`；关于我用 `/miniapp/profile/about-me` |

前端联调时只按本文第 2-11 节接口实现。
