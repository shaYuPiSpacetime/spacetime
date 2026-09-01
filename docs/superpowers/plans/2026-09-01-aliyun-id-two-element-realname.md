# 阿里云身份证二要素实名认证实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将实名认证改为阿里云身份证二要素（姓名+身份证号），解除手机号绑定前置依赖，并将查无记录/三方异常转人工。

**Architecture:** 保留 `RealNameVerificationProvider` 抽象，在其下增加可配置的阿里云 CPNS 实现；服务层只提交姓名和身份证号，统一审核记录与 `external_provider_task` 留痕不变。生产 profile 选择阿里云且缺少凭证时启动失败，开发测试继续显式使用 Mock。

**Tech Stack:** Java 21, Spring Boot 3.4, Maven, Alibaba Cloud Dytnsapi 2020-02-17 SDK, JUnit 5/Mockito。

## Global Constraints

- 实名认证仅包含姓名 + 身份证号二要素。
- 手机号绑定与实名认证互不依赖；未绑定手机号也可提交实名。
- `IsConsistent=1` 机审通过，`0` 机审驳回，`2` 保持待处理并转人工。
- 第三方异常不得自动通过，保留待处理记录。
- 不记录明文敏感信息到日志或 Provider 请求快照。

### Task 1: 先补 Provider 与服务层失败测试

**Files:**
- Modify: `backend/src/test/java/com/spacetime/miniapp/service/VerificationServiceImplTest.java`
- Create: `backend/src/test/java/com/spacetime/common/provider/impl/AliyunRealNameVerificationProviderTest.java`

- [ ] 增加未绑定手机号可提交、Provider 仅接收两个参数、`IsConsistent=2` 保持待处理的失败测试。
- [ ] 增加阿里云响应 1/0/2、超时和鉴权错误映射测试。
- [ ] 运行定向测试确认因当前三要素签名/Mock 行为失败。

### Task 2: 实现阿里云二要素 Provider 与配置

**Files:**
- Modify: `backend/src/main/java/com/spacetime/common/provider/RealNameVerificationProvider.java`
- Modify: `backend/src/main/java/com/spacetime/common/provider/impl/MockRealNameVerificationProvider.java`
- Create: `backend/src/main/java/com/spacetime/common/provider/impl/AliyunRealNameVerificationProvider.java`
- Create: `backend/src/main/java/com/spacetime/common/provider/impl/RealNameVerificationProperties.java`
- Modify: `backend/pom.xml`
- Modify: `backend/src/main/resources/application.yml`
- Modify: `backend/src/main/resources/application-prod.yml`

- [ ] 将接口改为 `check(String realName, String idCardNo)`。
- [ ] 使用 `CertNoTwoElementVerification` SDK 调用 `AuthCode/CertName/CertNo`。
- [ ] 生产配置强制 `real-name.provider=aliyun`，凭证缺失拒绝启动；Mock 只在显式 mock profile 可用。

### Task 3: 调整实名业务流程与留痕

**Files:**
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/VerificationServiceImpl.java`
- Modify: `backend/src/main/java/com/spacetime/common/provider/ProviderCheckResult.java` (如需 pending 语义补充)

- [ ] 删除手机号非空校验及 Provider 手机号参数。
- [ ] Provider 请求快照只保存脱敏姓名/身份证号。
- [ ] `IsConsistent=2` 返回 pending 结果并明确转人工；异常同样不得自动通过。

### Task 4: 更新文档与回归验证

**Files:**
- Modify: 正式 PRD、实名认证页面规格、后台审核页、技术方案、测试用例/报告中“三要素”相关描述。

- [ ] 统一改为身份证二要素，说明手机号解耦与 `IsConsistent=2` 人工处理逻辑。
- [ ] 执行 `mvn -pl backend test`（按仓库 Java 版本要求），确认定向及全量测试通过。
