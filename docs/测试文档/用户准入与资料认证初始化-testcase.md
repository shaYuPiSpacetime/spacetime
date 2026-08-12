# 用户准入与资料认证初始化 测试用例

> 日期：2026-07-07
> 阶段：阶段 4 测试用例
> 技术方案：`docs/技术方案/2026-07-07-用户准入与资料认证初始化-tcdesign.md`
> 移动端对接文档：`docs/技术方案/2026-07-07-用户准入与资料认证初始化-mobile-api-handoff.md`
> PRD 冻结记录：`docs/需求文档/需求冻结记录/用户准入与资料认证初始化-prd-freeze.md`
> 静态 Demo：`docs/静态Demo/01-用户准入与资料认证初始化/html/admin.html`
> 移动端 UI 图：从当前需求模块目录自动查找，不写死路径。

本测试用例是当前唯一有效版本，所有步骤只调用正式接口。

## 1. 测试策略

### 1.1 复杂度评估

| 维度 | 结论 | 分值 | 依据 |
|------|------|------|------|
| A 接口数量 | 高 | 2 | 管理后台、移动端、审核、配置、导入导出接口超过 15 个 |
| B 状态数量 | 高 | 2 | 准入、实名、学历、头像、图片、文字、语音均有多状态 |
| C 业务关键性 | 高 | 2 | 影响核心准入、认证、资料展示和后台运营 |
| D 数据影响面 | 高 | 2 | 覆盖用户、统一审核记录、审核历史、媒体、文字、语音、Provider、导入批次 |
| E 代码改动面 | 高 | 2 | 管理后台前后端、移动端后端、公共 Provider 与状态机 |
| F 权限/安全 | 高 | 2 | 涉及敏感查看、导入、导出、冻结、审核、配置权限 |

结论：执行 L1 + L2 + L3 + L4 + 人工核查。管理后台 1:1 Demo 还原和移动端接口完整度必须按 95% 评分表出证据。

### 1.2 测试层级

| 层级 | 目标 | 本轮要求 |
|------|------|----------|
| L1 接口回归 | 验证接口契约、权限、状态、错误码、数据落库 | 生成脚本并执行；无真实账号/环境时在报告中标明跳过原因 |
| L2 Controller | 验证路由、权限注解、入参校验、返回结构 | 后端实现后补充 MockMvc 或等效测试 |
| L3 Service | 验证状态机、Provider、导入导出、数据一致性 | 后端实现后补充单元/集成测试 |
| L4 E2E | 验证管理后台页面 1:1、交互链路、弹窗、反馈 | 使用 Playwright 或人工截图证据，目标达标 95% |
| 人工核查 | 验证 UI 图、Demo、需求文档一致性 | 输出差异清单和整改结论 |

## 2. 测试数据

| 编号 | 数据 | 用途 | 预期 |
|------|------|------|------|
| TD-01 | 新注册未初始化用户 | 首登资料、准入状态 | `NOT_SUBMITTED`，不能进入核心功能 |
| TD-02 | 资料完整但未认证用户 | 完整度与准入 | 资料可保存，核心准入仍阻断 |
| TD-03 | 实名/头像/学历全部通过用户 | 核心准入 | `CORE_ALLOWED` |
| TD-04 | 实名驳回用户 | 认证驳回 | 显示驳回原因，可重新提交 |
| TD-05 | 学历待审核用户 | 人工审核 | 后台列表可查，移动端显示审核中 |
| TD-06 | 图片待审核用户 | 资料图片审核 | 后台图片审核列表可查 |
| TD-07 | 开放性文字待审核用户 | 开放性文字审核 | 只覆盖 `ABOUT_ME`、`PROFILE_QA` |
| TD-08 | 语音机审中用户 | 语音介绍 | 不进开放性文字审核；对外隐藏新语音 |
| TD-09 | 语音已通过用户 | 语音展示 | 用户详情展示播放器、时长、Provider 留痕 |
| TD-10 | 语音驳回且有旧通过语音用户 | 语音替换保护 | 新语音隐藏，旧通过语音继续展示 |
| TD-11 | 冻结用户 | 冻结/解冻 | 冻结后核心功能阻断，解冻后按认证状态恢复 |
| TD-12 | 导入文件含合法/非法行 | 导入校验 | 成功、失败、重复、错误报告均可追踪 |
| TD-13 | 无导出权限管理员 | 权限 | 导出按钮隐藏或接口 403 |
| TD-14 | 有导出权限管理员 | 权限与审计 | 可导出固定字段无掩码，并写审计 |

## 3. L1 接口测试用例

### 3.1 通用安全与权限

| 用例 ID | 场景 | 步骤 | 预期 |
|---------|------|------|------|
| L1-AUTH-001 | 未登录访问管理后台 API | 不带 token 调用 `/admin/users/app/list` | 返回未认证错误，不返回业务数据 |
| L1-AUTH-002 | 无权限访问用户详情 | 使用无 `user:app:detail` 的账号调用 `/admin/users/app/{id}` | 返回 403 |
| L1-AUTH-003 | 无导出权限触发导出 | 使用无 `user:app:export` 的账号调用 `/admin/users/app/export` | 返回 403，不生成导出任务 |
| L1-AUTH-004 | 无敏感查看权限查看明文 | 使用无 `user:app:sensitive:view` 的账号查详情 | 页面/API 返回脱敏字段 |
| L1-AUTH-005 | 移动端未登录访问资料接口 | 不带 token 调用 `/miniapp/profile/home-detail` | 返回 `UNAUTHORIZED` |
| L1-AUTH-006 | 高危操作审计 | 执行导出、冻结、配置修改、人工审核 | 均生成操作者、时间、对象、结果审计记录 |

### 3.2 管理后台 App 用户管理

| 用例 ID | 场景 | 步骤 | 预期 |
|---------|------|------|------|
| L1-ADM-USER-001 | 列表默认查询 | 调用 `/admin/users/app/list` | 返回分页、总数、用户基础字段、认证状态、准入状态 |
| L1-ADM-USER-002 | 列表组合筛选 | 按手机号、昵称、性别、认证状态、准入状态、时间查询 | 结果与条件一致，分页统计正确 |
| L1-ADM-USER-003 | 空结果 | 使用不存在手机号查询 | 返回空列表、总数 0，不报错 |
| L1-ADM-USER-004 | 用户详情基础资料 | 查询 TD-03 详情 | 返回基础资料、扩展资料、认证记录、媒体、开放性文字、语音状态 |
| L1-ADM-USER-005 | 用户详情语音已通过 | 查询 TD-09 详情 | 展示语音播放器 URL、时长、`APPROVED（已通过）`、Provider 留痕 |
| L1-ADM-USER-006 | 用户详情语音未通过 | 查询 TD-08/TD-10 详情 | 后台可见语音状态和机审信号；对外资料不展示未通过新语音 |
| L1-ADM-USER-007 | 语音不进开放性文字审核 | 查询开放性文字审核列表 | 不出现 `语音介绍` 类型 |
| L1-ADM-USER-008 | 冻结用户 | 调用 `/admin/users/app/{id}/freeze` | 用户冻结成功，移动端核心准入返回阻断原因 |
| L1-ADM-USER-009 | 解冻用户 | 对冻结用户解除冻结 | 冻结状态移除，准入按认证状态重新计算 |
| L1-ADM-USER-010 | 导入预校验 | 上传含合法/非法行文件 | 返回批次号、成功/失败/重复统计、失败明细 |
| L1-ADM-USER-011 | 导入确认入库 | 确认导入 TD-12 合法行 | 仅合法行入库，重复行不重复创建 |
| L1-ADM-USER-012 | 导出固定字段 | 有权限管理员导出 | 固定字段无掩码输出，记录导出审计 |

### 3.3 管理后台审核列表

| 用例 ID | 场景 | 步骤 | 预期 |
|---------|------|------|------|
| L1-ADM-AUDIT-001 | 实名审核列表 | 调用 `/admin/verify/real-name/list` | 支持状态、审核来源、用户、时间筛选 |
| L1-ADM-AUDIT-002 | 实名详情 | 查询实名审核详情 | 展示实名信息、身份证号、手机号、来源、历史、机审信号 |
| L1-ADM-AUDIT-003 | 实名通过 | 对待审核记录通过 | 审核记录状态变为通过，写审核历史，准入实时重新派生 |
| L1-ADM-AUDIT-004 | 实名驳回 | 对待审核记录驳回并填写原因 | 移动端展示驳回原因，可重新提交 |
| L1-ADM-AUDIT-005 | 审核来源筛选 | 分别筛选 `MACHINE`、`MANUAL` | 只返回对应来源；不允许出现 `MOCK` 来源 |
| L1-ADM-AUDIT-006 | 头像认证审核 | 列表、详情、通过、驳回 | 状态同步，驳回原因回显 |
| L1-ADM-AUDIT-007 | 学历认证审核 | 列表、详情、通过、驳回 | 支持 CHSI、在线验证码、毕业证号、材料上传信息 |
| L1-ADM-AUDIT-008 | 资料图片审核 | 列表、详情、通过、驳回 | 支持头像、相册、背景图，背景图不计入相册张数 |
| L1-ADM-AUDIT-009 | 开放性文字类型 | 提交两类开放性文字后查询列表 | 仅出现 `ABOUT_ME`、`PROFILE_QA` |
| L1-ADM-AUDIT-010 | 开放性文字全文 | 打开全文详情 | 全文、摘要、状态、来源、驳回原因完整 |
| L1-ADM-AUDIT-011 | 开放性文字审核 | 通过/驳回文字记录 | 状态同步，移动端按通过/驳回展示 |

### 3.4 准入配置

| 用例 ID | 场景 | 步骤 | 预期 |
|---------|------|------|------|
| L1-CONFIG-001 | 查询准入配置 | 调用 `/admin/prd01/config?group=PRD01_ACCESS` 等四个配置分组 | 返回实名、头像、学历、资料完整度、上传、审核等配置 |
| L1-CONFIG-002 | 修改准入配置 | 调用 `POST /admin/prd01/config` 保存配置项 | 配置生效，记录审计 |
| L1-CONFIG-003 | 非法配置 | 提交非法阈值、空必填、非法枚举 | 返回明确错误，不落库 |
| L1-CONFIG-004 | 配置影响准入 | 调整准入开关后查询 TD-02/TD-03 | 准入状态按新配置计算 |

### 3.5 移动端登录与资料初始化

| 用例 ID | 场景 | 步骤 | 预期 |
|---------|------|------|------|
| L1-MINI-AUTH-001 | 微信登录未同意协议 | 调用 `/miniapp/auth/wechat-login` 且 `agreeProtocol=false` | 返回 `AUTH_PROTOCOL_REQUIRED` |
| L1-MINI-AUTH-002 | 微信登录成功 | 传合法 code 与协议确认 | 返回 token、用户信息、初始化状态 |
| L1-MINI-AUTH-003 | 发送手机号验证码 | 调用 `/miniapp/auth/sms-code` 传手机号 | 返回倒计时、有效期、每日上限、剩余次数、Provider；Redis 写入验证码 |
| L1-MINI-AUTH-004 | 手机号登录成功 | 先调用 `/miniapp/auth/sms-code`，再调用 `/miniapp/auth/phone-login` 传验证码 | 返回 token、用户信息；验证码被消费 |
| L1-MINI-AUTH-005 | 手机号登录短信错误 | 调用 `/miniapp/auth/phone-login` 传错误验证码 | 返回 `AUTH_SMS_INVALID` |
| L1-MINI-CONFIG-001 | 查询 PRD01 移动端配置 | 调用 `/miniapp/config/prd01` | 返回 `initFields` 5 类首登基础字段、`requiredFields`、上传限制、短信频控、地区配置；`regionScope.locationDictPath=/miniapp/dict/locations` |
| L1-MINI-CONFIG-002 | 分级查询中国大陆地区字典 | 依次调用 `/miniapp/dict/locations`、`?parentCode=110000`、`?parentCode=110100` | 三次分别只返回省、市、区县当前一级；不嵌套完整树，不包含海外、国家、港澳台入口 |
| L1-MINI-CONFIG-003 | 查询小程序省市两级地区树 | 调用 `/miniapp/dict/locations/two-level` | 一次返回省级数组和市级 `children`；城市节点 `children=[]`，不返回区县 |
| L1-MINI-PROFILE-001 | 查询初始化进度 | 调用 `/miniapp/profile/init-status` | 返回当前步骤、已填字段、缺失字段 |
| L1-MINI-PROFILE-002 | 保存首登当前步骤 | 调用 `/miniapp/profile/init-step`，每次只提交当前步骤字段 | 保存成功，返回下一步 |
| L1-MINI-PROFILE-003 | 海外地区不支持 | 传海外/国家字段 | 返回 `REGION_NOT_SUPPORTED` |
| L1-MINI-PROFILE-004 | 最后一步缺少前置必填 | 未完成前置必填步骤时调用 `/miniapp/profile/init-step` 提交最后一步 | 返回 `PROFILE_REQUIRED_MISSING` 或步骤冲突业务错误 |
| L1-MINI-PROFILE-005 | 初始化完成 | 依次提交 5 个可见步骤 | 最后一步返回完成状态，进入认证/准入流程 |
| L1-MINI-PROFILE-006 | 查询主页统一详情 | 调用 `/miniapp/profile/home-detail` | 返回主页字段值、字段展示/必填配置、认证状态、准入状态、当前配置摘要 |
| L1-MINI-PROFILE-008 | 保存基础资料 | 调用 `PUT /miniapp/profile/basic` | 按字段展示/必填、年龄、字典、地区配置校验后保存 |
| L1-MINI-PROFILE-009 | 保存独立非审核字段 | 分别调用脱单目标、感情状态、标签、歌曲、微信号独立接口 | 字典 code 校验通过后写入用户主表，不生成审核记录 |

### 3.6 移动端媒体、文字、语音

| 用例 ID | 场景 | 步骤 | 预期 |
|---------|------|------|------|
| L1-MINI-MEDIA-001 | 新增相册照片 | 调用 `POST /miniapp/profile/albums` | 生成 `ALBUM_PHOTO` 审核记录，返回媒体 ID、审核状态、来源 |
| L1-MINI-MEDIA-002 | 相册数量上限 | 超过 `uploadLimits.album.maxCount` 上传 | 返回上传数量超限错误，不落库 |
| L1-MINI-MEDIA-003 | 替换相册照片 | 调用 `PUT /miniapp/profile/albums/{mediaId}` | 旧记录置 `EXPIRED`，新图片生成新审核记录 |
| L1-MINI-MEDIA-004 | 删除相册照片 | 调用 `DELETE /miniapp/profile/albums/{mediaId}` | 审核记录置 `EXPIRED` 并写用户操作原因，不物理删除 |
| L1-MINI-MEDIA-005 | 查询/替换/删除资料背景图 | 调用 `GET/PUT/DELETE /miniapp/profile/background` | 背景图使用 `PROFILE_BG` 审核记录；新背景图通过前旧图继续对外展示 |
| L1-MINI-TEXT-001 | 提交自我介绍 | 调用 `/miniapp/profile/introduction`，`aboutMe` 20-300 字 | 固定生成 `ABOUT_ME` 审核记录；通过后才更新对外资料 |
| L1-MINI-TEXT-002 | 查询关于我题目 | 调用 `GET /miniapp/profile/about-me` | 返回 `meetingPreference`、`preferredActivities`、`housingStatus`、`carStatus`、`childrenPlan`、`hasChild`、`marriagePlan`、`religion`、`smoking`、`drinking`、`pets` 固定题目，以及最新提交内容、生效内容、审核状态 |
| L1-MINI-TEXT-003 | 提交关于我回答 | 调用 `POST /miniapp/profile/about-me`，传 `questionKey,contentText` | 固定生成 `PROFILE_QA` 审核记录；`materialJson` 写入题目 key/title；后台文字内容审核分类为资料问答并展示具体标题；同题审核中不可重复提交 |
| L1-MINI-TEXT-004 | 禁止旧开放文字接口新接入 | 文档和脚本均不再使用 `/miniapp/profile/open-text` | 小程序新流程只使用自我介绍和关于我独立接口 |
| L1-MINI-TEXT-005 | 自我介绍字数不足 | `aboutMe` 少于 20 字 | 拒绝提交，不生成审核记录 |
| L1-MINI-TEXT-006 | 自我介绍重复提审 | 最新记录为待审核/审核中再次提交 | 拒绝重复提交，旧通过内容继续生效 |
| L1-MINI-VOICE-001 | 提交合法语音 | 调用 `/miniapp/profile/voice-intro`，时长 10-60 秒 | 新增语音记录，触发音频安全机审 |
| L1-MINI-VOICE-002 | 语音时长非法 | 时长小于 10 或大于 60 | 返回 `VOICE_DURATION_INVALID` |
| L1-MINI-VOICE-003 | 语音机审通过 | Mock Provider 返回安全 | 审核状态为 `APPROVED（已通过）`，资料详情返回播放器 URL 和时长 |
| L1-MINI-VOICE-004 | 语音机审失败 | Provider 返回风险 | 审核状态为 `REJECTED（已驳回）`，对外隐藏，本人侧返回失败原因 |
| L1-MINI-VOICE-005 | Provider 不可用 | Provider 超时或异常 | 审核状态保持 `PENDING（待审核）` 或 `REVIEWING（审核中）`，不对外展示新语音 |
| L1-MINI-VOICE-006 | 删除语音 | 调用 `DELETE /miniapp/profile/voice-intro` | 当前有效语音清空，资料详情不再展示 |

### 3.7 移动端认证与准入

| 用例 ID | 场景 | 步骤 | 预期 |
|---------|------|------|------|
| L1-MINI-VERIFY-001 | 查询认证状态 | 调用 `/miniapp/verify/status` | 返回实名、头像、学历、提交权限、学历阻断原因和核心准入状态 |
| L1-MINI-VERIFY-002 | 提交头像认证 | 调用 `/miniapp/profile/avatar` | 更新本人侧头像，生成一条头像待审核记录和提交历史 |
| L1-MINI-VERIFY-003 | 提交实名认证 | 提交 `realName,idCardNo,singleCommitmentChecked` | 后端读取绑定手机号执行三要素 Provider 核验并写 Provider 任务/审核历史 |
| L1-MINI-VERIFY-004 | 身份证号格式错误 | 提交非法身份证号 | 返回 `REALNAME_ID_CARD_INVALID` |
| L1-MINI-VERIFY-005 | 实名重复校验 | 已存在身份证号再次提交 | 按 hash/明文一致性识别重复并阻断或转人工 |
| L1-MINI-VERIFY-006 | 提交学历认证 | 调用 `/miniapp/verify/education` | 支持在校证明、学信网验证码、证书编号、上传证书四类；一次提交只生成一条审核记录 |
| L1-MINI-VERIFY-007 | 查询准入状态 | 调用 `/miniapp/profile/access-status` | 返回是否可进入核心功能、阻断项、行动按钮 |
| L1-MINI-VERIFY-008 | 三项通过后准入 | TD-03 查询准入 | 返回 `CORE_ALLOWED` |
| L1-MINI-VERIFY-009 | 学历实名前置 | 实名无记录/驳回/失效时提交学历 | 拒绝提交并返回“请先提交实名认证” |
| L1-MINI-VERIFY-010 | 学历材料上限 | 在校证明或证书材料超过 4 张 | 拒绝提交且不落库 |
| L1-MINI-VERIFY-011 | 学历重复提审 | 最新学历为待审核/审核中再次提交 | 拒绝重复提交 |

### 3.8 Provider 与 mock 留痕

| 用例 ID | 场景 | 步骤 | 预期 |
|---------|------|------|------|
| L1-PROVIDER-001 | 实名 Provider mock 成功 | 开发环境提交实名 | 业务来源写 `MACHINE`，`external_provider_task.mocked=1` |
| L1-PROVIDER-002 | 图片 Provider mock 成功 | 提交资料图片 | 图片审核来源写 `MACHINE`，Provider 任务有留痕 |
| L1-PROVIDER-003 | 文本 Provider mock 成功 | 提交开放性文字 | 文字审核来源写 `MACHINE`，不出现 `MOCK` 来源 |
| L1-PROVIDER-004 | 语音 Provider mock 成功 | 提交语音介绍 | 语音通过，Provider 任务记录 mock |
| L1-PROVIDER-005 | 生产未配置实名 Provider | 模拟 Provider 不可用 | 不允许自动实名通过，进入待处理/失败兜底 |
| L1-PROVIDER-006 | 生产未完成语音机审 | 模拟 Provider 未返回 | 新语音不对外展示 |

## 4. L2 Controller 测试用例

| 用例 ID | Controller | 场景 | 断言 |
|---------|------------|------|------|
| L2-ADM-USER-001 | AppUserAdminController | 列表参数校验 | 页码、页大小、时间范围、枚举非法时返回明确错误 |
| L2-ADM-USER-002 | AppUserAdminController | 权限注解 | list/detail/freeze/import/export/sensitive 权限分别生效 |
| L2-ADM-USER-003 | AppUserAdminController | 详情返回结构 | 包含基础资料、认证、媒体、开放性文字、语音、审计摘要 |
| L2-ADM-AUDIT-001 | VerificationAdminController | 审核列表 | type、status、auditSource、时间筛选正确映射 |
| L2-ADM-AUDIT-002 | VerificationAdminController | 审核动作 | 通过/驳回必填校验、重复审核幂等 |
| L2-ADM-MOD-001 | ModerationAdminController | 图片/文字列表 | contentType 非法时报错，语音不走 open text contentType |
| L2-ADM-CONFIG-001 | AccessConfigAdminController | 配置保存 | 非法枚举、阈值、开关组合被拒绝 |
| L2-MINI-AUTH-001 | MiniAuthController | 登录协议 | 未同意协议统一阻断 |
| L2-MINI-PROFILE-001 | MiniProfileController | 初始化步骤 | step 非法、必填缺失、海外地区不支持 |
| L2-MINI-PROFILE-002 | MiniProfileController | 媒体/文字/语音 | 三类内容分别走独立接口和错误码 |
| L2-MINI-VERIFY-001 | MiniVerifyController | 认证提交 | 实名正式字段、学历四种方式和状态提交守卫响应结构正确 |

## 5. L3 Service 测试用例

| 用例 ID | Service | 场景 | 断言 |
|---------|---------|------|------|
| L3-ACCESS-001 | ProfileService + AppUserAuditService | 未初始化用户 | 按用户主档和审核记录实时派生缺失资料阻断项 |
| L3-ACCESS-002 | ProfileService + AppUserAuditService | 三项认证通过 | 实名、头像、学历均满足规则后派生 `CORE_ALLOWED` |
| L3-ACCESS-003 | ProfileService + AppUserAuditService | 冻结用户 | 冻结优先级高于认证通过 |
| L3-PROFILE-001 | ProfileCompletionService | 首登资料保存 | 缺失字段、完成度、下一步计算正确 |
| L3-PROFILE-002 | ProfileCompletionService | 海外地区 | 首版不支持海外/国家 |
| L3-VERIFY-001 | VerificationService | 实名提交 | 明文保存、hash 生成、重复校验、历史记录一致 |
| L3-VERIFY-002 | VerificationService | 审核通过 | 审核记录状态、审核历史和准入状态派生一致 |
| L3-VERIFY-003 | VerificationService | 审核驳回 | 驳回原因回写，允许重新提交 |
| L3-MEDIA-001 | ProfileMediaService | 背景图上传 | 背景图不计入相册数量 |
| L3-MEDIA-002 | ProfileMediaService | 当前有效媒体 | 通过后按 `APPROVED + submit_time/id` 可查询展示记录 |
| L3-TEXT-001 | OpenTextAuditService | 自我介绍 | `POST /miniapp/profile/introduction` 固定生成 `ABOUT_ME` 审核记录 |
| L3-TEXT-002 | OpenTextAuditService | 关于我固定题目 | `POST /miniapp/profile/about-me` 固定生成 `PROFILE_QA` 审核记录，题目 key 必须合法 |
| L3-TEXT-003 | OpenTextAuditService | 旧开放文字接口清理 | 小程序 Controller 不再暴露 `/miniapp/profile/open-text` |
| L3-VOICE-001 | VoiceIntroService | 语音提交 | 新增 `VOICE_INTRO` 审核记录为 `PENDING` 并触发 Provider |
| L3-VOICE-002 | VoiceIntroService | 机审通过 | 审核记录变为 `APPROVED`，资料接口按最近已通过语音展示 |
| L3-VOICE-003 | VoiceIntroService | 机审失败 | 不覆盖旧通过语音，对外隐藏新语音 |
| L3-VOICE-004 | VoiceIntroService | Provider 异常 | 保持 pending，不展示未审语音 |
| L3-PROVIDER-001 | ProviderTaskService | mock 记录 | 业务来源为 `MACHINE`，mock 信息只存在 `external_provider_task.mocked` |
| L3-IMPORT-001 | AppUserImportService | 导入校验 | 合法、非法、重复、部分成功统计正确 |
| L3-EXPORT-001 | AppUserExportService | 导出固定字段 | 权限、二次确认、无掩码字段、审计均满足 |

## 6. L4 管理后台 E2E 与 1:1 Demo 证据

| 用例 ID | 页面 | 场景 | 验收证据 |
|---------|------|------|----------|
| L4-ADM-001 | App 用户管理 | 页面首屏还原 | 截图对比 Demo：统计卡、查询区、表格、分页、按钮 |
| L4-ADM-002 | App 用户管理 | 查询/重置/分页 | 截图 + 接口响应 + 分页总数 |
| L4-ADM-003 | App 用户管理 | 用户详情抽屉 | 截图覆盖基础资料、扩展资料、认证记录、媒体、语音 |
| L4-ADM-004 | App 用户管理 | 语音详情 | 截图证明语音在用户详情展示，不在开放性文字列表 |
| L4-ADM-005 | App 用户管理 | 冻结/解冻弹窗 | 截图覆盖确认弹窗、成功 toast、状态变化 |
| L4-ADM-006 | 导入弹窗 | 文件选择、校验、确认、失败明细 | 截图 + 导入批次数据 |
| L4-ADM-007 | 导出弹窗 | 二次确认和导出反馈 | 截图 + 审计记录 |
| L4-ADM-008 | 头像认证审核 | 列表、详情、通过、驳回 | 截图 + 状态变化 |
| L4-ADM-009 | 实名认证审核 | 查询条件包含审核来源，列表展示审核来源 | 截图 + API 参数 |
| L4-ADM-010 | 学历认证审核 | 材料详情和审核弹窗 | 截图 + 状态变化 |
| L4-ADM-011 | 资料图片审核 | 图片预览、通过、驳回 | 截图 + 状态变化 |
| L4-ADM-012 | 开放性文字审核 | 列表、全文弹窗、通过、驳回 | 截图证明无 `语音介绍` 类型 |
| L4-ADM-013 | 准入配置 | Tab、开关、阈值、保存 | 截图 + 配置接口响应 |
| L4-ADM-014 | 异常态 | 空列表、加载失败、无权限、校验失败 | 截图覆盖异常文案和按钮状态 |

管理后台 1:1 达标时必须在测试报告中附：页面、字段、按钮、弹窗、状态、异常态、控件形态、详情形式、分页统计、反馈提示和交互链路的证据，不允许只写“已完成”。

## 7. 移动端接口完整度证据

| 用例 ID | 场景 | 验收证据 |
|---------|------|----------|
| L4-MINI-001 | 登录授权链路 | 请求/响应样例、错误码、协议阻断 |
| L4-MINI-002 | 首登初始化链路 | `init-status`、5 步 `init-step` 与最后一步完成响应 |
| L4-MINI-003 | 资料详情链路 | 字段覆盖截图或 JSON 样例，包含语音字段 |
| L4-MINI-004 | 媒体上传删除链路 | 头像、相册、背景图独立接口响应与审核状态 |
| L4-MINI-005 | 开放性文字链路 | 自我介绍、关于我独立接口响应与审核状态 |
| L4-MINI-006 | 语音介绍链路 | 提交、pending、approved、rejected、delete、Provider 异常证据 |
| L4-MINI-007 | 认证链路 | 头像、实名、学历提交与状态查询 |
| L4-MINI-008 | 核心准入链路 | 阻断项、行动按钮、通过状态 |

移动端不实现前端代码，但接口必须覆盖 UI 图可见流程和 PRD 流程。UI 图与需求不一致时，以需求文档为准，并在测试报告中说明差异。

移动端多轮对齐必须构造多状态数据并留证：无记录、待审核、审核中、已通过、已驳回、已失效、资料缺失、权限不足、第三方不可用、Provider 不可用、`CORE_ACCESS_BLOCKED`、`REGION_NOT_SUPPORTED`、旧兼容接口不在新小程序对接链路中。

## 8. P0/P1 覆盖矩阵

| 需求 | 优先级 | 覆盖用例 |
|------|--------|----------|
| FRZ-01 登录授权、手机号登录、协议确认 | P0 | L1-MINI-AUTH-001 至 003，L2-MINI-AUTH-001 |
| FRZ-02 首登轻量资料 | P0 | L1-MINI-PROFILE-001 至 005，L3-PROFILE-001 |
| FRZ-03 基本资料、头像、自我介绍、资料图片、扩展资料 | P0 | L1-MINI-PROFILE-006 至 007，L1-MINI-MEDIA，L1-MINI-TEXT，L3-MEDIA，L3-TEXT |
| FRZ-04 三重认证、核心准入 | P0 | L1-MINI-VERIFY，L3-ACCESS，L3-VERIFY |
| FRZ-05 状态回显、驳回原因、错误码 | P0 | L1-ADM-AUDIT，L1-MINI-VOICE，L1-MINI-VERIFY |
| FRZ-06 App 用户管理、导入导出、冻结 | P0 | L1-ADM-USER，L4-ADM-001 至 007 |
| FRZ-07 实名/头像/学历/图片/文字审核 | P0 | L1-ADM-AUDIT，L4-ADM-008 至 012 |
| FRZ-08 准入与认证配置 | P0 | L1-CONFIG，L2-ADM-CONFIG-001，L4-ADM-013 |
| FRZ-09 Provider 抽象 + mock 成功兜底 | P0 | L1-PROVIDER，L3-PROVIDER-001 |
| FRZ-10 移动端接口对接文档 | P0 | L4-MINI-001 至 008 |
| FRZ-11 95% 自测和验收证据 | P0 | L4-ADM 全部，移动端接口完整度证据，测试报告评分表 |

## 9. 95% 评分表

| 评分项 | 分值 | 达标标准 |
|--------|------|----------|
| 需求闭环 | 15 | P0/P1 需求均有测试用例、实现证据、无未确认阻断项 |
| 管理后台 1:1 Demo | 20 | 页面、字段、按钮、弹窗、状态、异常态、控件、详情、分页、反馈、交互链路均有截图/接口证据 |
| 移动端接口完整度 | 20 | 登录、初始化、资料、媒体、文字、语音、认证、准入状态接口全部可联调 |
| 后端状态机与数据一致性 | 15 | 审核记录、审核历史、Provider 任务、审核状态、准入状态派生一致 |
| 权限与安全 | 10 | 权限、脱敏、导出、审计、未登录/无权限均通过 |
| 异常态与错误码 | 10 | 必填、非法枚举、Provider 异常、重复提交、空状态均覆盖 |
| 自动化与报告证据 | 10 | L1/L2/L3/L4 或跳过原因完整，报告含截图、响应、SQL/日志证据 |

总分低于 95 分时，不得标记验收完成；必须根据扣分项继续修改并复测，直到达标。

## 10. 阶段 Checklist

| 阶段 | 检查项 | 状态 |
|------|--------|------|
| 测试用例 | 只保留并执行当前正式接口用例 | 已覆盖 |
| 测试用例 | 覆盖 P0/P1、接口、状态机、权限、异常态 | 已覆盖 |
| 测试用例 | 覆盖管理后台 1:1 Demo 证据要求 | 已覆盖 |
| 测试用例 | 覆盖移动端接口 95% 完整度证据要求 | 已覆盖 |
| 实现前 | 核对现有代码落点和接口契约 | 待执行 |
| 实现中 | 管理后台前后端按 Demo 1:1 还原 | 待执行 |
| 实现中 | 移动端只做后端接口和对接文档，不写移动端前端 | 待执行 |
| 实现后 | 生成 L1 脚本并执行接口回归 | 待执行 |
| 实现后 | 补充 L2/L3 测试并执行 | 待执行 |
| 实现后 | 执行 L4 截图核查和 95% 评分 | 待执行 |
| 验收 | 输出 `docs/测试文档/用户准入与资料认证初始化-testreport.md` | 待执行 |

## 11. 必须重点防回归

1. 语音介绍不进入开放性文字审核，不做语音转文字；后台在用户详情中展示语音状态、播放器和 Provider 留痕。
2. 开放性文字新小程序只接 `POST /miniapp/profile/introduction` 和 `POST /miniapp/profile/about-me`，不再使用通用 `open-text` 接口。
3. 审核来源只允许 `MACHINE`、`MANUAL`；mock 信息只记录在 `external_provider_task.mocked`。
4. 数据库实名、身份证、手机号按业务明文字段入库；页面展示、接口返回、导出权限由业务逻辑控制。
5. 首版不支持海外/国家入口，接口必须拒绝并返回 `REGION_NOT_SUPPORTED`。
6. 管理后台实现必须 1:1 对齐同步后的 `admin.html`，达不到 95% 必须继续改。
7. 移动端接口完整度达不到 95% 必须补接口、补字段、补错误码或补证据。

## 12. 2026-08-04 地址选择闭环增量用例

| 用例 ID | 层级 | 场景 | 断言 |
|---------|------|------|------|
| L1-MINI-PROFILE-010 | L1 | 首登选择存在区县的城市但不提交区县 | `POST /miniapp/profile/init-step` 返回“现居区县不能为空”，不得推进首登进度 |
| L1-MINI-PROFILE-011 | L1 | 首登提交完整省市区 | 三个六位行政区 code 均写入，首登完成 |
| L1-MINI-PROFILE-012 | L1 | 基础资料保存家乡省市 | 只提交 `hometownProvince/hometownCity` 即成功，`hometownDistrict` 保持空 |
| L3-MINI-PROFILE-010 | L3 | 现居城市存在区县节点 | 区县条件必填；兼容旧配置缺少 `requiredMode` 的情况 |
| L3-MINI-PROFILE-011 | L3 | 现居城市无区县节点 | 允许省市两级完成，不误报地址为空 |
| L3-MINI-PROFILE-012 | L3 | 家乡城市存在区县节点 | 家乡仍固定省市两级，服务端不得调用家乡区县必填判断 |
| L4-MINI-009 | L4 | 微信运行态首登现居地 | 选择器展示省、市、区县三列；区县加载完成前不得提交 |
| L4-MINI-010 | L4 | 微信运行态基本资料家乡 | 选择器只展示省、市两列，不请求或展示区县 |

## 13. 2026-08-04 地址两级联动口径纠正增量用例

> 用户确认最终口径：现居地、家乡都固定为省/市两级联动，不采集区县。本文第 12 节中要求现居地区县的用例已被本节替代，不再作为验收依据。

| 用例 ID | 层级 | 优先级 | 场景 | 断言 |
|---------|------|--------|------|------|
| L1-MINI-PROFILE-013 | L1 | P0 | 首登选择存在区县节点的城市，只提交省市 | `POST /miniapp/profile/init-step` 成功完成首登，不提示“现居区县不能为空” |
| L1-MINI-PROFILE-014 | L1 | P0 | 基础资料同时保存现居地、家乡省市 | `PUT /miniapp/profile/basic` 成功；两处区县均为空，`basicProfileCompleted=true` |
| L3-MINI-PROFILE-013 | L3 | P0 | 旧配置仍把现居区县/家乡区县标为必填 | 服务端强制按两级口径忽略两个区县必填配置，不调用区县子节点判断 |
| L3-MINI-PROFILE-014 | L3 | P1 | 请求携带历史区县值后重新选择省市 | 服务端不再依赖区县完成资料；保存结果中两处区县统一清空 |
| L3-MINI-PROFILE-015 | L3 | P1 | 完整度配置仍包含两个区县计分项 | 已填写对应省市即视为该地区资料完整，不因区县为空损失完成条件 |
| L3-MINI-CONFIG-004 | L3 | P1 | 后台把现居区县配置为选填 | 配置允许保存，不再强制“条件必填” |
| L4-MINI-011 | L4 | P0 | 微信运行态首登现居地 | 选择器只展示省、市两列，不加载区县；选择省市即可点亮下一步并提交 |
| L4-MINI-012 | L4 | P0 | 微信运行态基本资料现居地 | 选择器只展示省、市两列；确认后保存成功 |
| L4-MINI-013 | L4 | P0 | 微信运行态基本资料家乡 | 选择器只展示省、市两列；确认后保存成功，不出现“家乡区县不能为空” |
| M-ADDR-001 | 手动 | P1 | 历史用户已有区县值 | 打开并重新保存资料后页面只显示省市，且资料完善流程可继续到下一步 |

## 14. 2026-08-04 旧字段配置与滚动升级防回归用例

| 用例 ID | 层级 | 优先级 | 场景 | 断言 |
|---------|------|--------|------|------|
| L3-MINI-PROFILE-016 | L3 | P0 | 旧后端字段配置仍返回两个区县为可见 | 小程序强制过滤 `locationDistrict/hometownDistrict`，保存字段白名单只包含省市 |
| L3-MINI-PROFILE-017 | L3 | P0 | 历史用户已有区县，重新选择其他省市 | 本地状态清空历史区县；保存请求不得混入旧区县 code，不触发 `REGION_NOT_SUPPORTED` |
| L3-MINI-PROFILE-018 | L3 | P1 | 后端拒绝不匹配的省市路径 | 错误文案明确为“有效的中国大陆省市编码”，不得继续误导为省市区三级 |
| L4-MINI-014 | L4 | P0 | 后端节点已升级，但小程序本地缓存或灰度接口仍携带旧字段配置 | 两处均只显示省市，抓包请求无区县字段，保存成功并可继续完善资料 |

## 15. 2026-08-05 在校学生学历认证蓝湖顺序增量用例

| 用例 ID | 层级 | 优先级 | 场景 | 断言 |
|---------|------|--------|------|------|
| L4-MINI-EDU-015 | 静态+运行态 | P0 | 在校学生空材料态 | 资料卡 500/725rpx；空上传区 640×306rpx；提交按钮位于协议上方 |
| L4-MINI-EDU-016 | 静态+运行态 | P0 | 已上传 1~3 份材料 | 按 148×148rpx 网格回显，保留继续上传入口；资料卡背景高度不塌陷 |
| L4-MINI-EDU-017 | 静态 | P0 | 页面底部操作区 | 提交 top=1258rpx、协议 top=1382rpx、客服位于协议后；按钮不得使用 fixed 覆盖协议 |
| L4-MINI-EDU-018 | 构建 | P1 | 正式小程序构建 | 76 个页面注册唯一，正式产物无开发 Token，包体门禁通过 |

## 16. 2026-08-08 App 用户彻底删除生产兼容增量用例

| 用例 ID | 层级 | 优先级 | 场景 | 断言 |
|---------|------|--------|------|------|
| L3-ADM-HARD-DELETE-001 | 数据库迁移契约 | P0 | 生产库仅存在 `promotion_agent_event_legacy_20260727`，不存在当前表 `promotion_agent_event` | 066 清理过程必须先判断当前表是否存在再动态删除；不得无条件引用缺失表；legacy 表仍按既有兼容分支清理 |
| L3-ADM-HARD-DELETE-002 | 数据库迁移契约 | P0 | 社区审核记录同时按业务 ID 和业务编号匹配待删内容 | 每个临时范围表在同一条 SQL 中只能引用一次，使用单个相关 `EXISTS` 同时匹配 ID/编号，避免 MySQL 1137 `Can't reopen table` |
| L3-ADM-HARD-DELETE-003 | 数据库迁移契约 | P0 | 生产库默认排序规则为 `utf8mb4_unicode_ci`，社区业务编号历史列为 `utf8mb4_0900_ai_ci` | 删除链路统一按 `utf8mb4_unicode_ci` 比较：两个临时范围表的 `biz_no` 显式使用该规则，历史列参与比较时显式转换，避免 MySQL 1267 排序规则冲突 |
| L3-ADM-HARD-DELETE-004 | 数据库迁移契约 | P0 | 当前 `promotion_agent_bonus_log` 已用 `invitee_id` 替代旧 `user_id` | 当前表按 `invitee_id` 和邀请关系范围清理，不得引用不存在的 `user_id`；legacy 表继续使用其真实 `user_id` |
| L3-ADM-HARD-DELETE-005 | 数据库迁移契约 | P0 | 当前 `promotion_source_trace` 只保留 `inviter_id`，不再有 `visitor_user_id/invitee_user_id` | 在删除邀请关系前，按 `inviter_id` 和关系表 `source_trace_id` 清理当前来源追踪；历史字段只用于 legacy 表 |

## 17. 2026-08-08 全库排序规则统一增量用例

| 用例 ID | 层级 | 优先级 | 场景 | 断言 |
|---------|------|--------|------|------|
| L3-DB-COLLATION-001 | 数据库迁移契约 | P0 | 执行 069 全库排序规则迁移 | 数据库默认规则、全部基础表和全部字符列统一为 `utf8mb4_unicode_ci`；迁移可重复执行并恢复外键检查状态 |
| L3-DB-COLLATION-002 | 数据库回滚契约 | P1 | 回滚 069 到 2026-08-08 迁移前基线 | 96 张历史表恢复 `utf8mb4_0900_ai_ci`，迁移前已是 unicode 的 5 张表恢复 `utf8mb4_unicode_ci`，数据库默认规则保持 unicode |
| L3-DB-COLLATION-003 | 数据库迁移契约 | P0 | MySQL 不支持通过预处理协议执行 `ALTER DATABASE` | 069 与回滚脚本使用当前数据库的直接 `ALTER DATABASE`，不得 `PREPARE ALTER DATABASE`，避免 MySQL 1295 |
| L1-DB-COLLATION-001 | 生产只读核验 | P0 | 069 执行后查询 `information_schema` | 基础表总数仍为 101；非 `utf8mb4_unicode_ci` 的表为 0、字符列为 0 |
| L1-ADM-HARD-DELETE-001 | 生产事务演练 | P0 | 在显式事务内调用 `spacetime_delete_app_user_data(121)` 后回滚 | 调用无 1146/1137/1267/1054 异常；事务内 U121 为 0 行，回滚后恢复为 1 行；不执行永久删除 |

## 18. 2026-08-12 我的未认证态与资料媒体独立上传增量用例

| 用例 ID | 层级 | 优先级 | 场景 | 断言 |
|---------|------|--------|------|------|
| L4-MINI-PROFILE-019 | 静态+构建 | P0 | 用户未完成核心认证，切换到“我的” | 保持在“我的”真实 Tab；完善资料与认证页面不显示左上角“成家/知音/立业”栏目头；千寻未认证入口仍保留栏目头 |
| L4-MINI-PROFILE-020 | 静态+接口契约 | P0 | 在编辑资料点击大背景图 | 仅调用 `uploadBackground` 与 `saveBackground`，只更新背景图状态，不调用头像接口、不修改圆头像 |
| L4-MINI-PROFILE-021 | 静态+接口契约 | P0 | 在编辑资料点击圆头像 | 仅调用 `uploadAvatar` 与 `submitAvatar`，只更新圆头像状态，不调用背景接口、不修改背景图 |
| L4-MINI-PROFILE-022 | 静态+视觉 | P0 | 同一背景图从编辑资料切换到主页预览 | 两处均使用 `aspectFill` 按比例裁切，主页预览不得使用 `scaleToFill` 拉伸图片 |
| L4-MINI-PROFILE-023 | 构建 | P1 | 小程序正式构建 | 全部预构建门禁、84 个页面唯一注册、正式产物与包体检查均通过 |
