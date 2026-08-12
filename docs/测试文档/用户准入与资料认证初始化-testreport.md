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

## 19. 首登现居地与家乡层级闭环回归（2026-08-04）

> 历史记录说明：本节“现居地三级、家乡两级”的口径已被用户明确纠正，不再作为交付结论；最终口径与复测结果以第 20 节为准。

### 19.1 问题与根因

首登地址页只维护省、市并提前点亮下一步，而地区字典中的“大同”等城市存在区县节点；后端旧字段配置又缺少 `requiredMode`，最终在提交时返回“地址不能为空”。同一地区选择器还被家乡复用，导致家乡错误进入区县加载和条件必填逻辑。

本轮统一口径：首登现居地按真实地区层级选择省/市/区县；无区县节点的城市允许省市两级。家乡固定省市两级，前后端均不要求家乡区县。

### 19.2 自动化与真实接口结果

| 验证项 | 结果 |
|--------|------|
| TDD 红灯复现 | 后端稳定复现“地址不能为空”和“家乡区县不能为空”；小程序静态门禁稳定复现地址缺少区县、家乡仍展示区县 |
| 后端定向测试 | `ProfileServiceImplTest`：20/20 通过 |
| 小程序登录专项 | `test-login-pending-items-closure.cjs`：15/15 通过 |
| 小程序资料编辑专项 | `test-profile-edit-closure.cjs`：16/16 通过 |
| 小程序真实接口 L1 | `prd01-miniapp-all-interfaces-l1.mjs`：65/65 通过，0 失败；新测试用户 `userId=126` |
| L1 地址负向用例 | 存在区县的城市未提交 `locationDistrict` 时正确返回“现居区县不能为空” |
| L1 地址正向用例 | 提交完整省市区后首登完成；基础资料仅提交家乡省市后保存成功且家乡区县为空 |
| 后端全量测试 | Java 21，483 条执行，0 失败、0 错误、0 跳过 |
| 小程序正式构建 | `npm run build:weapp` 成功；76 个页面注册门禁通过，主包 1.30 MiB，总包 1.97 MiB |

### 19.3 微信运行态证据

| 场景 | 结果 | 证据 |
|------|------|------|
| 首登现居地 | 省、市、区县三列均可滑动，区县来自城市下级地区接口 | `docs/验收报告/截图证据/2026-08-04-地址选择闭环/微信运行-390x844/07-首登-现居地-省市区.png` |
| 基本资料家乡 | 仅展示省、市两列，不展示区县 | `docs/验收报告/截图证据/2026-08-04-地址选择闭环/微信运行-390x844/06-认证-基本资料-家乡.png` |

### 19.4 结论

地址显示值、选择状态、请求参数、地区字典校验和后端持久化已形成闭环；截图中的“大同已显示但提交报地址为空”问题已由前端补齐区县选择和后端真实层级校验共同修复，家乡继续保持省市两级。

## 20. 现居地与家乡统一省市两级闭环回归（2026-08-04）

### 20.1 最终业务口径与根因

用户最终确认：现居地、家乡都只采集省和市，不采集区县。此前仍提示“家乡区县不能为空”，是因为旧运行配置把 `locationDistrict/hometownDistrict` 保持为可见、必填、计分字段，后端缺失项与完整度计算也仍消费这两个历史字段；同时上一轮把现居地误改为三级联动，和最终业务口径不一致。

本轮同时收口小程序选择器、提交参数、后端校验、字段配置、资料完整度、管理后台配置和生产迁移：两类地址都只提交省市，服务端保存时清理历史区县值；即使数据库仍留有旧区县配置，运行时也会强制将两个区县字段归一为不可见、非必填、不计分。

### 20.2 TDD 与自动化测试结果

| 验证项 | 结果 |
|--------|------|
| TDD 红灯复现 | 修改前后端测试稳定复现区县仍被校验、完整度仍被扣分、现居地仍加载第三列；随后按省市两级口径修复 |
| 后端定向测试 | `ProfileServiceImplTest`、`AppConfigAdminServiceImplTest`、`Prd01ProfileCompletenessCalculatorTest`、`Prd01RuntimeConfigResolverTest`、`MiniappPrd01ConfigServiceTest` 全部通过 |
| 后端全量测试 | Java 21，`Tests run: 492, Failures: 0, Errors: 0, Skipped: 0`，`BUILD SUCCESS` |
| 小程序专项测试 | `test-profile-edit-closure.cjs`、`test-login-pending-items-closure.cjs`、`test-prd01-runtime.cjs` 合计 `62/62` 通过 |
| 小程序正式构建 | `npm run build:weapp` 成功；全部预构建与后构建门禁通过，76 个页面注册通过，主包 1.30 MiB、总包 1.97 MiB |
| 管理后台正式构建 | `npm run build` 成功，TypeScript 与 Vite 构建通过；仅保留既有 chunk 大小提示 |
| 代码差异检查 | `git diff --check` 通过，无空白错误 |

### 20.3 微信开发者工具运行态证据

| 场景 | 结果 | 证据 |
|------|------|------|
| 首登现居地 | 仅展示省、市两列，不展示区县 | `docs/验收报告/截图证据/2026-08-04-地址两级联动闭环/微信运行-390x844/07-首登-现居地-省市.png` |
| 基本资料家乡 | 仅展示省、市两列，不展示区县 | `docs/验收报告/截图证据/2026-08-04-地址两级联动闭环/微信运行-390x844/06-认证-基本资料-家乡.png` |

### 20.4 生产兼容与部署边界

| 检查项 | 结果 |
|--------|------|
| 生产只读复现 | 发布前线上 `GET /api/miniapp/profile/basic` 返回 `missingRequiredFields=["hometownDistrict"]`，确认故障来自旧后端/旧配置 |
| 代码兼容 | 新后端不再校验两个区县字段，并在保存省市时清理该用户历史区县值 |
| 配置兼容 | 新运行时会覆盖数据库旧配置，强制两个区县字段不可见、非必填、不计分 |
| 生产迁移 | 新增幂等脚本 `deploy/sql/prod/063_prd01_region_two_level.sql`，用于永久修正字段配置与区县计分权重 |
| 真实写接口 L1 | 发布后使用现有真实账号按小程序可见字段白名单保存成功；两处区县均为 `null`，区县不再进入缺失项，`basicProfileCompleted=true` |

### 20.5 结论

代码与生产环境均已按“现居地、家乡均为省市两级”闭环。后端、管理端发布和 `063_prd01_region_two_level.sql` 已成功完成；生产真实写接口验证通过，线上旧区县缺失与三级路径提示已消除。

## 21. `REGION_NOT_SUPPORTED` 线上提示修复复测（2026-08-04）

### 21.1 故障复现与根因

线上基础资料接口仍返回历史三级字段配置和历史区县值；小程序虽然已把现居地、家乡改为省市两级，但保存请求曾按线上可见字段动态组装，可能把“新选择的省市”与“本地残留的旧区县”同时提交。旧后端按省市区父子关系校验后返回：`REGION_NOT_SUPPORTED：现居地必须使用有效的中国大陆省市区编码`。

本次按前后端共同闭环处理：小程序强制过滤两个已退役区县字段、选择省市时立即清除本地历史区县、保存时使用两级字段白名单；后端只校验省市真实 code 与父子关系，忽略并清理历史区县值。如果灰度期间仍命中尚未升级的节点并返回 `REGION_NOT_SUPPORTED`，小程序只提示用户“地区选项已更新，请重新选择省市”，不再暴露已退役的三级技术口径。

### 21.2 TDD 与自动化结果

| 验证项 | 结果 |
|--------|------|
| TDD 红灯复现 | 小程序稳定复现历史区县残留进保存请求、旧字段配置未被过滤；后端稳定复现错误提示仍写“省市区编码” |
| 小程序定向回归 | `test-profile-edit-closure.cjs`：17/17 通过，覆盖现居地/家乡两级 patch、旧配置过滤、保存白名单、友好错误提示 |
| 后端定向回归 | `ProfileDictionaryServiceTest`、`ProfileServiceImplTest` 全部通过，覆盖省市父子校验、两级保存、旧区县清理、旧必填配置兼容 |
| 后端全量测试 | Java 21，`Tests run: 492, Failures: 0, Errors: 0, Skipped: 0`，`BUILD SUCCESS` |
| 小程序正式构建 | `npm run build:weapp` 成功；全部预构建测试与静态门禁通过，76 个页面注册通过，主包 1.30 MiB、总包 1.97 MiB |
| 管理后台正式构建 | `npm run build` 成功，TypeScript 与 Vite 正式构建通过；仅有既有 chunk 大小提示 |
| 构建环境门禁 | 正式小程序产物确认不含开发固定 Token；页面注册、包体积门禁全部通过 |

### 21.3 发布顺序与验收边界

旧后端仍会按旧字段配置要求区县，单独发布小程序不能让旧服务端变成两级口径。因此生产发布必须按以下顺序执行：

1. 发布后端，使保存接口固定按省市两级校验并清理历史区县。
2. 执行幂等迁移 `deploy/sql/prod/063_prd01_region_two_level.sql`，永久关闭区县字段的展示、必填与计分。
3. 发布小程序，使界面、状态和保存请求全部采用省市两级，并屏蔽旧节点的三级技术提示。
4. 发布后用真实账号复测首登现居地、基本资料现居地和家乡三条保存链路；确认响应成功、两处区县为空、资料完成状态不再包含区县缺失项。

### 21.4 结论

源代码、自动化测试、正式构建、生产发布、数据库迁移和真实写接口已经全部闭环通过。截图中的 `REGION_NOT_SUPPORTED` 故障已在生产消除。

### 21.5 生产发布与真实接口证据

| 检查项 | 结果 |
|--------|------|
| Git 发布提交 | 后端/管理端/迁移 `f88b881`；小程序 `07f7d61`；均已推送到 `origin/master` |
| 管理端工作流 | GitHub Actions `30920450041` 执行成功 |
| 后端工作流 | GitHub Actions `30920451690` 执行成功，包含服务器部署与健康检查 |
| SQL 执行 | 生产执行 `063_prd01_region_two_level.sql` 成功；字段配置的两处区县均为 `visible=false、required=false、requiredMode=none、scoreEnabled=false`，完整度权重均为 `0` |
| 回滚保障 | 执行前配置已备份至生产服务器 `/mnt/data/spacetime-prod/backups/prd01-region-two-level-before-20260804-063-safe.sql`，权限为仅 root 可读 |
| 生产查询 | `GET /api/miniapp/profile/basic` 返回 `code=200`、`missingRequiredFields=[]`，两处区县配置均不可见且非必填 |
| 生产写入 | `PUT /api/miniapp/profile/basic` 返回 `code=200`；历史现居区县从 `110105` 清理为 `null`，家乡区县为 `null`，`basicProfileCompleted=true`、`nextAction=ADD_AVATAR` |

## 22. 学历认证在校学生蓝湖还原复测（2026-08-05）

| 检查项 | 结果 |
|--------|------|
| 设计基线 | 750×1678 三张在校学生稿，覆盖空材料、上传选择、已上传材料态 |
| TDD 红灯 | 修复前稳定识别提交按钮在协议之后、按钮 fixed 覆盖底部、资料卡缺少 725rpx 分割高度 |
| 小程序专项 | `test-verification-onboarding-flow.cjs` 9/9 通过 |
| 微信运行态 | 390px 模拟器按设备比例核对资料卡、提交、协议、客服坐标通过；已上传材料网格真实渲染；异常监听为 0 |
| 正式构建 | Webpack 成功；76 个页面注册通过；主包 1.30 MiB，总包 1.97 MiB；无开发 Token |
| 截图环境 | 微信开发者工具 screenshot 接口超时；已记录限制，未把静态源码冒充截图证据 |

结论：资料卡、提交按钮、协议和客服区的视觉分割与交互顺序已按 UI 稿闭环，上传与提交仍使用真实组件和真实接口。

## 23. 地址为空最终口径与发布门禁复测（2026-08-05）

> 本节为当前有效结论，并替代第 20、21 节中“现居地固定两级”的历史口径。最终产品规则是：现居地在所选城市存在启用区县节点时采集省、市、区；城市没有下级节点时允许省、市两级。家乡始终只采集省、市两级。

### 23.1 根因与修复

截图中已显示“山西大同”但提交提示地址为空，根因是前端选择器只维护省市，而线上旧字段配置仍可能把现居区县标记为必填。修复后，首登和基本资料的现居地都会按城市懒加载区县并提交 `locationDistrict`；后端不再直接相信旧配置的固定必填，而是查询地区字典真实子节点后条件校验。家乡选择器继续保持两列，保存时清理历史 `hometownDistrict`。

### 23.2 TDD 与发布门禁结果

| 验证项 | 结果 |
|--------|------|
| TDD 红灯 | 修复前稳定复现：登录页未加载区县、首登旧配置未按真实城市节点拦截、基本资料丢弃现居区县 |
| 登录专项 | `test-login-pending-items-closure.cjs`：15/15 通过 |
| 资料编辑专项 | `test-profile-edit-closure.cjs`：17/17 通过；覆盖现居三级、家乡两级和历史家乡区县清理 |
| PRD01 运行时 | `test-prd01-runtime.cjs`：31/31 通过 |
| 后端资料服务 | `ProfileServiceImplTest`：21/21 通过；覆盖有区县、无区县、旧配置缺少 `requiredMode` 三类场景 |
| 后端全量 | Java 21，`Tests run: 493, Failures: 0, Errors: 0, Skipped: 0` |
| 小程序正式构建 | `npm run build:weapp` 成功；76 个页面注册通过，固定登录与开发 Token 均关闭，主包 1.30 MiB、总包 1.97 MiB |
| 差异检查 | `git diff --check` 通过 |

### 23.3 当前结论

代码发布候选已满足“现居地按真实区县层级闭环、家乡严格两级”的最终口径；小程序上传包使用生产接口域名，登录页为正式启动页，不包含固定测试账号。

## 24. 全库 `utf8mb4_unicode_ci` 与 App 用户彻底删除生产闭环（2026-08-08）

### 24.1 故障根因与修复

后台彻底删除 U121 的“系统异常”并非单一缺表问题。使用生产库显式事务逐段演练后，依次定位并修复以下真实结构差异：

1. 当前表 `promotion_agent_event` 不存在，只有历史兼容表，导致 MySQL 1146；改为存在性判断后动态清理。
2. 同一删除语句两次打开社区临时范围表，导致 MySQL 1137；改为单个相关 `EXISTS` 同时匹配业务 ID 和业务编号。
3. 临时表与历史字符列排序规则不同，导致 MySQL 1267；临时列和比较表达式统一为 `utf8mb4_unicode_ci`。
4. 全库迁移首次动态预处理 `ALTER DATABASE`，导致 MySQL 1295；改为对当前数据库直接执行 DDL。
5. 当前推广表字段已重构：代理奖励表使用 `invitee_id`，来源追踪表不再有 `visitor_user_id/invitee_user_id`，导致 MySQL 1054；按生产真实字段及 `source_trace_id` 关系调整删除顺序和条件。

### 24.2 生产执行与数据安全

| 检查项 | 结果 |
|--------|------|
| 执行前全库备份 | `/mnt/data/spacetime-prod/backups/database-before-20260808-069-collation.sql`，2,415,264 bytes，权限 `600`，包含数据、存储过程、触发器和事件 |
| 数据库默认规则 | `utf8mb4_unicode_ci` |
| 基础表 | 101/101 为 `utf8mb4_unicode_ci`，非目标表 0 |
| 字符列 | 502/502 为 `utf8mb4_unicode_ci`，非目标字符列 0 |
| 存储过程 | `spacetime_delete_app_user_data` 已按修复后的 066 重建 |
| 幂等性 | 069 第二次执行成功，表数、字符列数和排序规则保持不变 |
| U121 永久数据 | 未执行永久删除；最终仍为 1 行，`account_status=NORMAL`、`deleted=0` |

### 24.3 自动化与生产事务演练

| 验证项 | 结果 |
|--------|------|
| 排序规则与删除迁移专项 | 12/12 通过，0 失败、0 错误 |
| 后端全量测试 | Java 21，`Tests run: 598, Failures: 0, Errors: 0, Skipped: 0`，`BUILD SUCCESS` |
| 管理后台正式构建 | `tsc -b && vite build` 成功；仅有既有 chunk 大小提示 |
| 彻底删除定向 E2E | `L4-06A` 1/1 通过，确认仅提交删除原因、不再追加确认文字 |
| 差异检查 | `git diff --check` 通过 |
| 生产只读核验 | 数据库、101 张基础表、502 个字符列全部为 `utf8mb4_unicode_ci` |
| 生产删除演练 | `START TRANSACTION` 后调用删除过程成功；事务内 U121 为 0 行 |
| 演练回滚 | `ROLLBACK` 后 U121 恢复为 1 行，状态和逻辑删除标记不变 |

### 24.4 结论

全库排序规则统一已在生产完成，App 用户彻底删除过程已兼容当前表、历史表、社区临时表和推广重构后的真实字段。生产事务演练从头到尾无 1146、1137、1267、1295、1054 异常，且回滚后用户数据保持原状，本次数据库闭环通过。

补充说明：尝试运行 `prd01-user.spec.ts` 全文件时，既有 `L4-01/L4-02` 仍使用已下线的学校展示/筛选控件，且本地未启动后端导致地区字典代理请求失败；本次改动对应的 `L4-06A` 已独立执行并通过，未把无关旧用例计入通过数。

## 25. 我的未认证态、背景与头像独立上传及预览比例复测（2026-08-12）

### 25.1 根因与修复

1. “我的”未认证态与千寻入口共用 `VerificationEntryView`，但栏目头此前无条件渲染；现改为仅 `index-unverified` 展示，`profile-unverified` 不再出现左上角内容。
2. 编辑资料大图此前错误调用头像上传与提交接口，并同时更新大图和圆头像；现拆分为背景图、头像两个独立处理器和点击区，接口与本地状态互不串改。
3. 主页预览首图此前使用 `scaleToFill` 强制铺满固定尺寸，造成非同比拉伸；现与编辑资料统一使用 `aspectFill`。

### 25.2 执行结果

| 验证项 | 结果 |
|--------|------|
| TDD 红灯 | 修复前 3 组新增回归均稳定失败：未认证栏目头、媒体上传串改、预览拉伸 |
| 未认证专项 | `test-login-modal-profile-unverified.cjs`：5/5 通过 |
| 编辑资料专项 | `test-profile-edit-closure.cjs`：31/31 通过，其中背景/头像独立上传新增用例通过 |
| 主页预览视觉门禁 | `validate-profile-preview-lanhu.mjs` 通过 |
| 认证与编辑资料门禁 | `validate-verification-profile-ui.mjs` 通过 |
| 小程序正式构建 | `npm run build:weapp` 成功；84 个页面注册唯一；主包 1.36 MiB、千寻分包 116.1 KiB、总包 2.10 MiB |

### 25.3 结论

候选代码与正式构建闭环通过：我的未认证页面不再显示左上角栏目内容；背景图和头像分别上传、分别回显；主页预览按比例裁切，不再拉伸变形。本轮未使用生产账号执行真实媒体写入，因此未把本地结果表述为线上已发布。
