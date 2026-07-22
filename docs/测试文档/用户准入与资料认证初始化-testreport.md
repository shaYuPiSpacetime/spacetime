# 用户准入与资料认证初始化 - 测试报告

> 关联文档：
> - 测试用例：`docs/测试文档/用户准入与资料认证初始化-testcase.md`
> - 技术方案：`docs/技术方案/2026-07-07-用户准入与资料认证初始化-tcdesign.md`
> - 移动端对接文档：`docs/技术方案/2026-07-07-用户准入与资料认证初始化-mobile-api-handoff.md`

## 1. 测试概况

| 项目 | 信息 |
|------|------|
| 功能名称 | 用户准入与资料认证初始化 |
| 测试环境 | `http://127.0.0.1:8080` |
| 执行日期 | `2026-07-13 18:00` |
| 执行人 | Codex |
| 后端版本 | 当前工作区变更，Java 21 |
| 测试策略 | 自我介绍/三重认证真实接口链路 + L2/L3 全量 Maven 回归 + 移动端接口静态对齐 |
| 测试模式 | 增量模式：自我介绍、实名三要素、学历四种提交方式和状态守卫回归 |

## 2. 测试结果汇总

| 层级 | 总数 | 通过 | 失败 | 跳过 | 通过率 |
|------|------|------|------|------|--------|
| 本轮真实接口主链路 | 10 | 10 | 0 | 0 | 100% |
| L2/L3 Maven 测试 | 218 | 217 | 0 | 1 | 99.5% |
| 移动端接口静态对齐 | 1 | 1 | 0 | 0 | 100% |
| 合计 | 229 | 228 | 0 | 1 | 99.6% |

判定结果：通过。

判定依据：本轮没有失败用例；唯一跳过项是既有 `PromotionInviteSeedDataTest`，与本需求无关。

### 2.1 本轮新增链路结果

| 场景 | 真实结果 |
|------|----------|
| 手机号登录 | 测试账号登录成功，`userId=49` |
| 自我介绍 | `/miniapp/profile/introduction` 返回 `APPROVED`，后台用户详情显示开放文本已通过 |
| 实名认证 | 服务端读取绑定手机号，Mock Provider 通过，后台实名列表查询到 `APPROVED` 记录 |
| 学历认证 | `MAINLAND_GRADUATE + CHSI` 提交成功，生成 `PENDING/MACHINE` 记录 |
| 学历重复提交 | 返回业务错误，未新增第二条待审核记录 |
| 三重认证状态 | 实名通过、头像通过、学历待审核，`verifyLevel=2`、`NON_CORE_ONLY` |
| 学历后台详情 | 详情接口成功，审核历史固定每页 5 条，本次记录有 1 条提交历史 |

## 3. 历史全量 L1 接口测试（2026-07-09）

```text
执行命令: powershell.exe -NoProfile -ExecutionPolicy Bypass -File "docs/测试文档/用户准入与资料认证初始化-unified-audit-l1.ps1"
结果文件: docs/test-artifacts/prd01-unified-audit-l1-results.json
汇总: total=96 pass=96 fail=0 skip=0
```

| 覆盖范围 | 结果证据 |
|----------|----------|
| 后端启动 | `GET /health` 返回 `code=200`、`data=ok` |
| 后台登录 | `peter` 登录成功，获取 token，权限数 91 |
| 移动端登录与首登 | 手机号登录创建测试用户 `59`，首登 4 步和完成接口通过 |
| 实名认证 | 机审通过，后台实名列表可查 |
| 头像认证 | 上传头像生成待审核记录，同媒体 ID 认证后机审通过 |
| 学历认证 | 构造通过、驳回、失效、待审核多状态 |
| 资料图片 | 构造相册通过、待审核、驳回、失效；背景图通过 |
| 开放性文字 | `ABOUT_ME`、`PROFILE_QA` 通过；`CUSTOM_OPEN_TEXT` 拒绝 |
| 语音介绍 | 合法语音机审通过；非法时长返回错误 |
| 后台筛选 | 状态筛选、审核来源筛选、`REVIEWING` 记录筛选均通过 |
| 后台详情 | 实名、头像、学历、资料图片、开放文字详情均返回成功 |
| 移动端状态 | `/miniapp/verify/status`、`/miniapp/profile/access-status` 通过 |
| 用户管理 | App 用户列表和详情实时派生审核状态通过 |
| 数据库校验 | 新审核记录、审核历史、状态/来源分布、旧表不存在均通过 |

### 3.1 数据库状态覆盖

| 项 | 结果 |
|----|------|
| 测试用户 | `userId=59` |
| 手工种子审核中记录 | `auditRecordId=128` |
| 状态覆盖 | `PENDING=2`、`REVIEWING=1`、`APPROVED=8`、`REJECTED=3`、`EXPIRED=2` |
| 审核来源覆盖 | `MACHINE=7`、`MANUAL=9` |
| 审核历史覆盖 | 总数 `30`，机审 `21`，管理员操作 `9` |
| 旧表校验 | `app_user_verification`、`app_user_verification_record`、`app_user_profile_media`、`app_user_open_text_audit`、`app_user_voice_intro_record` 均不存在 |
| 旧字段校验 | `app_user.voice_intro_url`、`app_user.voice_intro_duration`、`app_user.voice_intro_audit_status`、`app_user.voice_intro_record_id`、`app_user.voice_intro_reject_reason`、`app_user.profile_bg_media_id`、`app_user_audit_record.object_id`、`app_user_audit_record.object_key`、`app_user_audit_record.current_effective`、`app_user_audit_record.education_level`、`app_user_audit_record.submit_payload_json`、`app_user_audit_record.masked_payload_json` 均不存在 |

## 4. L2/L3 Maven 测试

```text
执行命令: cd backend; mvn.cmd "test" "-Denforcer.skip=true"
JDK: C:\Users\50449\.jdks\ms-21.0.11
汇总: Tests run: 218, Failures: 0, Errors: 0, Skipped: 1
```

本轮新增 `AppUserAuditServiceTest`，覆盖：

| 测试点 | 结果 |
|--------|------|
| 提交审核默认状态与历史 | 通过 |
| 人工审核通过并切换当前有效记录 | 通过 |
| 系统失效写历史 | 通过 |
| 三重认证通过数实时派生 | 通过 |

## 5. 失败用例明细

无。

## 6. 跳过用例明细

| 用例 | 层级 | 场景 | 跳过原因 | 是否需要补测 |
|------|------|------|----------|--------------|
| `PromotionInviteSeedDataTest` | L3 | 推广邀请种子数据 | 既有测试跳过，非本模块 | 否 |

## 7. 本轮未纳入重新执行的证据

管理后台 1:1 页面截图矩阵、Demo vs 实现截图矩阵、前端构建在上一轮已产出。本次改造聚焦统一审核表、后端接口和真实数据库链路，没有重新跑前端截图矩阵；如继续进入前端验收，应按 `Codex需求到验收标准流程.md` 重新执行全量页面截图对齐。

## 8. 结论

统一审核表改造后的管理后台接口、移动端接口、审核状态机、审核历史、真实数据库写入、旧表删除和旧字段删除校验已通过本轮测试。

## 9. 地区字典分级懒加载回归（2026-07-12）

| 检查项 | 结果 |
|--------|------|
| 后台首次查询 | 仅返回 31 个省级节点，6488 B，不含嵌套 `children` |
| 后台展开北京 | 仅返回 1 个市级节点，242 B |
| 移动端首次查询 | 仅返回 31 个省级选项，2419 B |
| 移动端按北京查询 | 仅返回 1 个市级选项，108 B |
| 移动端按北京市查询 | 仅返回 16 个区县选项，1259 B |
| 后端目标测试 | `DictDataServiceImplTest`、`DictDataControllerTest`、`MiniappDictServiceImplTest`、`MiniappDictControllerTest`、`MiniappPrd01ConfigServiceTest` 全部通过 |
| 前端验证 | `npm.cmd run build` 通过 |
| 契约门禁 | 地区懒加载检查、PRD01 移动端接口对齐检查均通过 |

当前后端服务已加载最新代码，真实接口回归来自 8080 端口进程 PID 28448。

## 10. 旧版接口与契约清理验证（2026-07-13）

| 检查项 | 结果 |
|--------|------|
| 旧头像确认接口 | `POST /miniapp/verify/avatar` 已移除，控制器回归验证返回业务 `404` |
| 旧首登接口 | 正式后端、技术方案、接口文档和测试脚本中不再引用 `init-save`、`init-complete` |
| 旧请求对象 | `AvatarVerifyReq`、`ProfileInitSaveReq` 已删除 |
| 微信登录旧字段 | `code`、`encryptedData`、`iv` 已删除，仅保留 `loginCode`、`phoneCode`、`agreeProtocol` |
| 准入状态旧字段 | 单值 `blockReason` 已删除，统一返回 `blockReasons` |
| 定向自动化测试 | 13 条通过，0 失败、0 错误、0 跳过 |
| 移动端接口矩阵 | `node scripts/prd01_mobile_alignment_check.mjs` 执行通过 |

本轮定向测试覆盖正式头像提交与展示、审核状态查询、旧路由移除、旧 DTO 字段移除、微信登录契约和审核服务核心逻辑。

## 11. 审核快照清理与 Provider 补齐回归（2026-07-13）

| 检查项 | 结果 |
|--------|------|
| 用户主表字段清理 | 测试库 `app_user.avatar、photos、profile_bg_image、about_me` 已物理删除，清理后查询结果为空 |
| 实体与业务引用 | `AppUser` 及请求对象已删除对应字段；登录、本人资料、用户管理、审核后台、黑名单、商业化详情统一改读审核记录 |
| 展示口径 | 本人/管理后台取最新提交；头像对外只认最新记录且必须已通过；其他内容对外取最近已通过记录 |
| 列表性能 | 用户管理、认证审核、内容审核、黑名单列表使用批量审核内容查询，未引入逐用户头像查询 |
| Mock Provider | 短信、实名、学历、图片、文本、语音六类 Provider 均有 Mock；图片覆盖头像/相册/背景图，学历覆盖全部认证方式 |
| Provider 留痕 | 实名、学历、图片、文本、语音调用写 `external_provider_task`；审核动作写 `app_user_audit_history` |
| 聚焦测试 | 40 条通过，0 失败，覆盖统一内容投影、审核状态机、图片/学历 Mock、管理后台详情和移动端提交 |
| 全量 Maven 测试 | 231 条通过，0 失败，1 条非本模块种子测试跳过 |
| 真实接口 | `peter` 登录、App 用户列表、用户详情、头像审核列表和头像审核详情均返回 `code=200`；列表共 63 用户、头像审核共 17 条 |
| 运行状态 | 最新后端已连接真实 MySQL 并监听 `8080`，进程 PID `21624`；启动和接口日志无 `Unknown column` 或 SQL 异常 |

## 12. 状态轻量与模块详情接口回归（2026-07-14）

| 检查项 | 结果 |
|--------|------|
| 三重认证状态接口 | `GET /miniapp/verify/status` 保持轻量，只返回状态、原因、提交权限、SLA、核心准入，不承载模块提交明细 |
| 自我介绍详情接口 | 新增 `GET /miniapp/profile/introduction`，返回 `latestContent/effectiveContent/auditStatus/canSubmit`，覆盖本人最新提交与对外生效内容分离 |
| 实名详情接口 | 新增 `GET /miniapp/verify/real-name`，返回脱敏 `realName/idCardNo`、状态、原因、提交权限；不返回手机号明文 |
| 学历详情接口 | 新增 `GET /miniapp/verify/education`，返回最近一次提交快照、认证方式、材料、SLA、提交权限和原因 |
| 学历身份映射 | `STUDENT` 派生 `identityCode=STUDENT（在校生）`；`MAINLAND_GRADUATE` 派生 `identityCode=WORKER（职场人）`，后台学历列表和详情同口径展示 |
| 测试库场景数据 | 已执行 `deploy/sql/prod/044_prd01_education_audit_demo_seed.sql`，生成 5 条学历审核记录：`PENDING/REVIEWING/APPROVED/REJECTED/EXPIRED` 各 1 条 |
| 学历认证方式覆盖 | 测试数据覆盖 `STUDENT_CARD`、`CHSI`、`DIPLOMA_NO`、`MATERIAL_UPLOAD`，并覆盖 `MACHINE/MANUAL` 审核来源 |
| 目标测试 | `VerificationServiceImplTest`、`OpenTextAuditServiceImplTest`、`VerificationControllerTest`、`ProfileControllerAvatarTest` 共 21 条通过 |
| 全量后端测试 | `mvn "-Denforcer.skip=true" test`：244 条执行，0 失败，1 条既有跳过 |

结论：移动端“状态接口轻量、详情接口按模块拆开”的对接方式已落到后端接口、接口文档和测试覆盖；后台学历审核列表不再因用户主表身份为空而显示 `-`。

## 13. 小程序独立接口与旧接口清理回归（2026-07-14）

| 检查项 | 结果 |
|--------|------|
| 新对接口径 | 小程序新流程统一使用 `home-detail/basic/avatar/albums/background/introduction/about-me/voice-intro` 及独立非审核字段接口 |
| 旧接口清理 | 小程序 Controller 已移除 `GET /miniapp/profile/detail`、`PATCH /miniapp/profile`、`POST /miniapp/profile/media`、`DELETE /miniapp/profile/media/{id}`、`POST /miniapp/profile/open-text` |
| 对接文档 | `mobile-api-handoff.md` 已作为唯一新接口口径，旧接口只保留在“不要新接入”替代表中 |
| 背景图接口 | 新增 `GET/PUT/DELETE /miniapp/profile/background`，替换时新图审核通过前旧图继续对外展示，删除时审核记录置失效 |
| 相册接口 | `POST/PUT/DELETE /miniapp/profile/albums` 按配置校验数量、大小、格式；替换/删除均保留审核历史 |
| 关于我接口 | `GET/POST /miniapp/profile/about-me` 覆盖固定题目、最新内容、生效内容、审核状态和提交权限 |
| 字典接口 | `GET /miniapp/dict/profile-options` 覆盖身份、学历、行业、职业、年收入、婚姻、脱单目标、感情状态、我的标签 9 类字典 |
| 静态对齐脚本 | `node scripts/prd01_mobile_alignment_check.mjs` 执行通过，并生成 `docs/测试文档/验收截图/full/prd01-mobile-interface-alignment-matrix.md` |
| 针对性单测 | `mvn '-Dtest=ProfileMediaServiceImplTest,ProfileControllerAvatarTest' test '-Denforcer.skip=true'`：11 条通过，0 失败 |
| 全量后端测试 | `mvn test '-Denforcer.skip=true'`：250 条执行，0 失败，1 条既有 `PromotionInviteSeedDataTest` 跳过 |

结论：小程序接口文档、Controller 路由、测试用例、L1 脚本和自动对齐矩阵已统一到独立接口方案；没有用的旧接口不再作为新小程序对接入口。

## 14. 小程序旧契约瘦身复核（2026-07-14）

| 检查项 | 结果 |
|--------|------|
| 旧请求对象 | `ProfileUpdateReq`、`OpenTextSubmitReq` 已删除，后端不再保留旧 `PATCH /miniapp/profile` 和通用开放文字提交契约 |
| 旧 service 方法 | `ProfileService.updateProfile`、`OpenTextAuditService.submitOpenText` 已删除；开放文字仅保留自我介绍、关于我两个清晰入口 |
| 旧路由扫描 | `rg` 扫描 `backend/src/main/java`、`backend/src/test/java`、对齐脚本，未命中旧路由、旧 DTO、旧方法 |
| 接口对接文档 | `mobile-api-handoff.md` 作为唯一新接口口径；旧接口仅在“不要新接入的旧接口”表说明替代关系 |
| 静态对齐脚本 | `node scripts/prd01_mobile_alignment_check.mjs` 通过 |
| 全量后端测试 | `mvn test '-Denforcer.skip=true'`：250 条执行，0 失败，0 错误，1 条既有种子数据测试跳过 |

## 15. 小程序资料与认证接口真实数据回归（2026-07-14）

执行脚本：`node docs/测试文档/prd01-miniapp-all-interfaces-l1.mjs`

| 检查项 | 结果 |
|--------|------|
| 测试方式 | 真实调用本地后端 `http://127.0.0.1:8080`，先走手机号验证码登录，再逐个调用小程序接口，最后用 `peter/000000` 登录后台按 `userId` 回查列表和详情 |
| 测试用户 | `userId=71`，手机号 `19003710608`，本轮唯一标识 `20260714043510` |
| 执行结果 | 60 个接口/回查步骤全部通过，0 失败 |
| 覆盖接口 | 短信验证码、手机号登录、运行配置、资料字典、地区懒加载、首登五步、基础资料查询/保存、主页详情、头像查询/提交、实名认证查询/提交、学历查询/四种方式提交、相册查询/新增/替换/删除、背景图查询/提交/删除/再提交、自我介绍查询/提交、关于我查询/提交、脱单目标、感情状态、标签、歌曲搜索/保存、微信号查询/保存、语音查询/提交/删除、准入状态、认证状态 |
| 后台实名回查 | `admin real-name list/detail by userId` 返回 1 条，提交时间 `2026-07-14 12:35:16`，状态 `APPROVED` |
| 后台学历回查 | `admin education list/detail by userId` 返回 4 条，覆盖 `STUDENT_CARD`、`CHSI`、`DIPLOMA_NO`、`MATERIAL_UPLOAD`，提交时间 `2026-07-14 12:35:16` 至 `2026-07-14 12:35:18`，状态均 `APPROVED` |
| 后台头像回查 | `admin avatar list/detail by userId` 返回 1 条，提交时间 `2026-07-14 12:35:15`，状态 `APPROVED` |
| 后台资料图片回查 | `admin moderation photos list/detail by userId` 返回 5 条：资料背景图 `APPROVED/EXPIRED`、相册图片 `APPROVED/EXPIRED/EXPIRED`，提交时间 `2026-07-14 12:35:18` 至 `2026-07-14 12:35:20` |
| 后台文字内容回查 | `admin moderation texts list/detail by userId` 返回 2 条：`关于我`、`资料问答`，提交时间 `2026-07-14 12:35:20`，状态均 `APPROVED` |
| 结论 | 这次不是旧 seed 或旧截图数据；相册、背景图、关于我、资料问答均通过移动端真实接口生成审核记录，并能在后台对应列表和详情按本轮用户查到 |

## 16. 我的标签分类接口回归（2026-07-14）

| 检查项 | 结果 |
|--------|------|
| 分类来源 | 按移动端需求/UI 标签页返回 `全部 / MBTI / 性格 / 爱好 / 运动 / 足迹` |
| 字典存储 | `app_profile_tag` 根节点存标签分类，子节点存具体标签；通过 `sys_dict_data.parent_id` 归属分类，`remark` 仅作说明文字；`app_user.tags` 仍只存标签 code 数组 |
| 接口变化 | `GET /miniapp/dict/profile-options` 保留 `profileTag` 扁平列表，新增 `profileTagGroups` 分组列表 |
| 保存接口 | `PUT /miniapp/profile/tags` 不变，仍提交 `tagCodes`，后端按 `app_profile_tag` 字典校验 |
| 测试库数据 | 已补齐测试库标签分类；`node scripts/seed_prd01_profile_tag_categories.mjs` 可重复执行，会创建/更新分类父节点并把标签挂到对应父节点 |
| 单元测试 | `MiniappDictServiceImplTest`、`MiniappDictControllerTest` 共 6 条通过 |
| 真实接口回归 | `node docs/测试文档/prd01-miniapp-all-interfaces-l1.mjs` 通过，`60/60`，新用户 `userId=74`；脚本已校验 `profileTagGroups` 包含 6 个分类且标签项带 `categoryCode/categoryLabel` |
| 父子结构核验 | `app_profile_tag` 根节点为 `MBTI/PERSONALITY/HOBBY/SPORT/FOOTPRINT`，子标签数量分别为 `16/4/6/5/5` |

## 17. 小程序省市两级地区接口回归（2026-07-14）

| 检查项 | 结果 |
|--------|------|
| 新增接口 | `GET /miniapp/dict/locations/two-level`，一次返回中国大陆省级数组和市级 `children`，城市节点 `children=[]`，不返回区县 |
| 接口用途 | 给小程序省市选择器一次性加载；需要区县时继续调用 `/miniapp/dict/locations?parentCode={cityCode}` 懒加载 |
| 单元测试 | `MiniappDictServiceImplTest`、`MiniappDictControllerTest` 共 8 条通过 |
| 真实接口抽查 | 本地后端 `http://127.0.0.1:8080` 返回 `code=200`、省级 31 条，首个可用省市为 `110000/110100` |
| L1 全链路 | `node docs/测试文档/prd01-miniapp-all-interfaces-l1.mjs` 通过，`61/61`，新用户 `userId=75`、手机号 `19042387223`；新增步骤已校验两级树不包含区县 |
## 18. 关于我真实数据回归（2026-07-15）

| 检查项 | 结果 |
|--------|------|
| 测试方式 | 真实调用本地后端 `http://127.0.0.1:8080`，新手机号登录后提交关于我，再用 `peter/000000` 登录后台回查文字审核 |
| 测试用户 | `userId=77`，手机号 `19116260381` |
| 查询题目 | `GET /miniapp/profile/about-me` 返回 11 个固定题目，首个题目为 `meetingPreference` |
| 提交题目 | `meetingPreference`、`housingStatus`、`pets` 三个题目均通过 `POST /miniapp/profile/about-me` 提交 |
| 小程序回显 | 再次查询 `/miniapp/profile/about-me`，三题均回显 `APPROVED`，`latestContent/effectiveContent` 均有值 |
| 后台审核列表 | `GET /admin/moderation/texts/list?userId=77&textType=PROFILE_QA` 返回 3 条记录 |
| 后台列表标题 | 三条记录分别展示 `见面偏好`、`住房情况`、`宠物态度`，类型统一为 `资料问答` |
| 后台详情 | `GET /admin/moderation/texts/{id}` 返回 `contentField=资料问答`、`contentTitle=宠物态度`、`questionKey=pets` |
| 修复项 | 真实数据首次验证时发现关于我回显未按 `materialJson.questionKey` 匹配审核记录，已改为 JSON 解析匹配并补回归单测 |
| 单测结果 | `OpenTextAuditServiceImplTest`、`ModerationAdminServiceImplTest` 共 12 条通过，0 失败 |
