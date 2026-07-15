# Mobile API Handoff Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 逐条关闭 `2026-07-07-用户准入与资料认证初始化-mobile-api-handoff.md` 的真实断链、动态配置空白、旧深链和构建门禁缺口，使小程序主链路与历史入口均可验证闭环。

**Architecture:** 后端统一业务契约和字典/地区校验，数据库迁移只修运行时配置；前端复用认证运行时边界并让主页预览消费 `home-detail` 已加载数据；构建门禁以 `app.config.ts` 真实注册清单建立递归依赖图，并在构建后检查注册次数。所有跨模块断点均以契约测试先行。

**Tech Stack:** Java 21、Spring Boot 3.4、MyBatis-Plus、MySQL 8、Redis、React 18、TypeScript、Taro 4、微信小程序、Node test runner、JUnit 5。

## Global Constraints

- 所有用户可见说明、代码注释和文档使用中文。
- 业务接口只传字典 `code`，展示只使用接口 `label`；认证流程文案来自 `copywriting`，非认证页面保持 UI 固定文案。
- 学历材料继续使用受保护代理 URL；长期 OSS 密钥不得进入客户端。
- 小程序页面入口不得直接或间接依赖另一个已注册页面入口。
- 保留现有用户改动，不执行破坏性 Git 操作，不擅自提交或推送。

---

### Task 1: 修复学历受保护文件端到端契约

**Files:**
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/VerificationServiceImpl.java`
- Test: `backend/src/test/java/com/spacetime/miniapp/service/VerificationServiceImplTest.java`
- Modify: `miniapp/src/services/ossUpload.ts`
- Create: `miniapp/src/services/protectedFile.ts`
- Modify: `miniapp/src/pages/verification/components/EducationSubmitPage.tsx`
- Test: `miniapp/scripts/test-prd01-runtime.cjs`

**Interfaces:**
- Consumes: `OssUploadTicket.fileUrl`，允许 `https://...` 或 `/miniapp/file/credential/...`。
- Produces: `downloadProtectedFile(path): Promise<string>`，返回可供 `<Image>` 使用的本地临时路径。

- [ ] **Step 1: 写后端失败测试**：票据格式的 `/miniapp/file/credential/key.jpg` 应通过学历材料校验，其他相对路径应拒绝。
- [ ] **Step 2: 运行 `VerificationServiceImplTest`，确认因当前仅接受 HTTP URL 而失败。**
- [ ] **Step 3: 最小实现材料 URL 白名单**：仅允许 HTTP(S) 或 `/miniapp/file/credential/`，禁止任意相对路径。
- [ ] **Step 4: 写前端失败测试**：受保护 URL 必须通过带 `X-Auth-Token` 的 `Taro.downloadFile` 取得临时路径，页面不得直接把受保护相对地址交给 `<Image>`。
- [ ] **Step 5: 实现 `downloadProtectedFile` 并在学历详情回显时维护 `materialPreviewUrls`。**
- [ ] **Step 6: 运行前后端定向测试并确认通过。**

### Task 2: 修复语音、标签和背景图运行时配置

**Files:**
- Create: `deploy/sql/prod/050_prd01_handoff_runtime_contract_fix.sql`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/MiniappDictServiceImpl.java`
- Test: `backend/src/test/java/com/spacetime/miniapp/service/MiniappDictServiceImplTest.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/ProfileMediaServiceImpl.java`
- Test: `backend/src/test/java/com/spacetime/miniapp/service/ProfileMediaServiceImplTest.java`
- Test: `miniapp/scripts/test-prd01-runtime.cjs`

**Interfaces:**
- Produces: `uploadLimits.voice.formats` 仅含微信录音支持格式；`profileTagGroups[0]` 固定为 `ALL/全部`；背景图并发待审核上限固定为 1。

- [ ] **Step 1: 写失败测试**：标签服务在数据库无 ALL 节点时仍合成首个 ALL 分组且包含全部标签。
- [ ] **Step 2: 写失败测试**：背景图运行配置即使 `maxCount=4`，第二张待审核背景图仍被拒绝。
- [ ] **Step 3: 运行测试确认失败。**
- [ ] **Step 4: 实现服务逻辑并新增幂等 SQL**：向 `prd01.upload.rules` 添加/修正 `voice` 为 `mp3/aac/m4a`、`profileBg.maxCount=1`，保留其他运营配置。
- [ ] **Step 5: 对同一数据库执行 SQL 两次，确认无重复且实时配置正确。**
- [ ] **Step 6: 运行定向后端测试与运行时配置检查。**

### Task 3: 后端字典、地区和媒体提交校验闭环

**Files:**
- Create: `backend/src/main/java/com/spacetime/miniapp/service/impl/RegionCodeValidator.java`
- Create: `backend/src/test/java/com/spacetime/miniapp/service/RegionCodeValidatorTest.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/ProfileServiceImpl.java`
- Modify: `backend/src/test/java/com/spacetime/miniapp/service/impl/ProfileServiceImplTest.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/ProfileMediaServiceImpl.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/dto/request/ProfileMediaSubmitReq.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/VerificationServiceImpl.java`

**Interfaces:**
- Produces: `RegionCodeValidator.validate(province, city, district, fieldLabel)`，校验真实 `china_region` code 与父子关系。
- Consumes: `ProfileDictionaryService.requireCode` 校验 gender、avatarSource、educationUserType、educationMethod。

- [ ] **Step 1: 写失败测试**：伪造地区 code、错误省市父子关系、中文枚举、缺失媒体大小必须失败。
- [ ] **Step 2: 运行定向测试确认各缺口分别失败。**
- [ ] **Step 3: 实现 `RegionCodeValidator` 并接入首登、基础资料保存。**
- [ ] **Step 4: 把性别、头像来源、学历人群与方式改为字典 `requireCode` 校验。**
- [ ] **Step 5: `fileSizeBytes` 增加非空正数校验，业务服务不再对 null 放行。**
- [ ] **Step 6: 运行 Profile、Verification、Media 测试确认通过。**

### Task 4: 认证子页统一运行时边界和错误重试

**Files:**
- Modify: `miniapp/src/domain/prd01Runtime.ts`
- Create: `miniapp/src/pages/verification/components/VerificationRuntimeBoundary.tsx`
- Modify: `miniapp/src/pages/verification/avatar.tsx`
- Modify: `miniapp/src/pages/verification/avatar-review.tsx`
- Modify: `miniapp/src/pages/verification/avatar-crop.tsx`
- Modify: `miniapp/src/pages/verification/real-name.tsx`
- Modify: `miniapp/src/pages/verification/education-mainland.tsx`
- Modify: `miniapp/src/pages/verification/components/EducationSubmitPage.tsx`
- Test: `miniapp/scripts/test-prd01-runtime.cjs`

**Interfaces:**
- Produces: `validateVerificationRuntime` 校验认证流程全部实际消费文案、必要字典及必需 code；`VerificationRuntimeBoundary` 统一 loading/error/retry。

- [ ] **Step 1: 写失败测试**：删除任一认证子页文案或必要字典 code 时校验必须失败，所有认证入口必须使用统一边界。
- [ ] **Step 2: 运行 Node 测试确认当前只校验中心 10 个 key 而失败。**
- [ ] **Step 3: 扩展认证运行时契约并实现公共边界。**
- [ ] **Step 4: 所有认证子页仅在边界 ready 后渲染正文；失败显示明确错误与重试，不再 Toast 后空渲染。**
- [ ] **Step 5: 运行 30+ 条 PRD01 测试与小程序构建。**

### Task 5: 主页预览改为真实数据并关闭旧演示深链

**Files:**
- Modify: `miniapp/src/pages/profile/edit.tsx`
- Modify: `miniapp/src/pages/profile/components/ProfilePreviewPage.tsx`
- Modify: `miniapp/src/pages/verification/intro.tsx`
- Modify: `miniapp/src/pages/verification/intro-edit.tsx`
- Modify: `miniapp/src/pages/verification/avatar-album.tsx`
- Test: `miniapp/scripts/test-prd01-runtime.cjs`

**Interfaces:**
- Produces: `ProfilePreviewModel`，由已经加载的 `home-detail/basic/albums/introduction/tags/voice/song/verification` 数据组装。

- [ ] **Step 1: 写失败测试**：主页预览源码不得读取 `lanhuDemo`，不得包含演示用户资料；旧 intro/intro-edit/avatar-album 必须重定向到正式接口页面。
- [ ] **Step 2: 运行测试确认失败。**
- [ ] **Step 3: 将预览组件参数扩展为 `ProfilePreviewModel`，替换头像、基础资料、地区、标签、自介、照片、认证和歌曲演示值。**
- [ ] **Step 4: 编辑页用已加载接口数据组装 model；MBTI 仅从标签字典/用户标签派生，不保留本地枚举列表。**
- [ ] **Step 5: 旧自介文字路由重定向 `/pages/profile-edit/intro`，旧语音变体重定向 `/pages/profile/edit?voice=...`，旧头像相册路由重定向正式头像页。**
- [ ] **Step 6: 运行静态契约测试、Lint 和页面截图验收。**

### Task 6: 首登顺序与页面入口门禁闭环

**Files:**
- Modify: `miniapp/src/pages/login/index.tsx`
- Modify: `miniapp/src/pages/login/phone.tsx`
- Modify: `miniapp/scripts/validate-page-entry-isolation.mjs`
- Create: `miniapp/scripts/validate-built-page-registrations.mjs`
- Modify: `miniapp/package.json`
- Test: `miniapp/scripts/test-prd01-runtime.cjs`

**Interfaces:**
- Consumes: 登录成功 token。
- Produces: 未完成首登时统一调用 `GET /miniapp/profile/init-status`；入口门禁覆盖 app config 真实 58 页并递归解析依赖；构建后逐页断言 `Page()` 为 1。

- [ ] **Step 1: 写失败测试**：手机号/微信登录未完成时必须调用 `resumeInit`，不得直接信任登录响应 nextStep；门禁页数必须等于 app config 注册页数。
- [ ] **Step 2: 运行测试确认失败。**
- [ ] **Step 3: 调整两个登录入口，未完成时固定 `resumeInit()`。**
- [ ] **Step 4: 重写入口门禁，从 `app.config.ts` 解析真实 pages/subPackages，并递归检查所有相对与 `@/pages` 依赖。**
- [ ] **Step 5: 新增构建产物门禁并挂到 `postbuild:weapp`。**
- [ ] **Step 6: 运行开发前置门禁和正式构建，确认 58 页各 1 次 Page、公共包 0 次。**

### Task 7: 跨模块回归与运行态验收

**Files:**
- Modify: `docs/验收报告/2026-07-14-我的认证重复注册与空文案修复.md`
- Create: `docs/验收报告/2026-07-14-mobile-api-handoff-闭环验收.md`

**Interfaces:**
- Consumes: Tasks 1-6 的实现、迁移和测试。
- Produces: 可复查的接口、数据库、构建、截图与失败项清单。

- [ ] **Step 1: 执行 050 两次并读取实时 config/dict，确认 voice、profileBg、ALL、52 个认证文案。**
- [ ] **Step 2: 运行小程序 PRD01 测试、Lint、正式构建和构建注册门禁。**
- [ ] **Step 3: 用 Java 21 运行相关后端单元/控制器测试。**
- [ ] **Step 4: 用本地 dev 后台验证 19 个读取接口、学历材料契约和鉴权结果。**
- [ ] **Step 5: 微信开发者工具真实走“登录/首登恢复、立即完善、头像、实名、学历、资料预览”并保存截图证据。**
- [ ] **Step 6: 更新验收报告，仅在全部证据通过后声明闭环。**

## Self-Review

- Spec coverage：覆盖 handoff 第 2-12 节的配置、字典、上传、登录、首登、主页、认证、审核资料、非审核资料、准入和旧接口约束。
- Placeholder scan：无 TBD/TODO/“类似处理”等占位描述。
- Type consistency：受保护文件统一使用 `fileUrl`/`downloadProtectedFile`；预览统一使用 `ProfilePreviewModel`；地区统一使用 `RegionCodeValidator`。
