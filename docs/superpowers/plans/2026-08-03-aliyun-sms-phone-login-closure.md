# 阿里云短信手机号登录闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将小程序手机号登录验证码从 mock 通道切换为阿里云短信，固定使用签名“上海兴家立业网络科技”和模板 `SMS_336060313`，并打通发送、频控、校验及生产部署配置闭环。

**Architecture:** 保留现有 `SmsCodeProvider`、Redis 验证码、倒计时和每日限额逻辑；新增条件化的阿里云 Provider，使用官方 V2.0 Java SDK 调用 `SendSms`。开发环境默认 mock，生产环境默认阿里云；生产凭证只由环境变量注入，`SMS_*` 优先，按用户授权缺省回退复用 `OSS_ACCESS_KEY_*`（本地再兼容 `DEV_OSS_ACCESS_KEY_*`），不回退为假发送。

**Tech Stack:** Java 21、Spring Boot 3.4、Alibaba Cloud SMS Java SDK V2.0、JUnit 5、Mockito、Redis、Taro 小程序既有登录 API。

## Global Constraints

- 短信签名必须精确为 `上海兴家立业网络科技`。
- 短信模板必须精确为 `SMS_336060313`，模板内容为“您的验证码为：${code}，请勿泄露于他人！”，请求参数仅传 `code`。
- AccessKey 优先从 `SMS_ACCESS_KEY_ID`、`SMS_ACCESS_KEY_SECRET` 注入；用户于 2026-08-03 明确授权未配置时复用 `OSS_ACCESS_KEY_*` / `DEV_OSS_ACCESS_KEY_*`，禁止把实际值写入源码、文档、日志或响应。
- 生产环境默认 `SMS_PROVIDER=aliyun`；本地和单元测试默认 `mock`。
- 阿里云响应体 `Code` 不是 `OK` 时视为发送失败，不得写入 Redis 验证码或频控键。
- 日志不得输出验证码、AccessKey 或完整三方响应；手机号沿用现有日志口径。
- 保留任务开始前的所有未提交改动；本任务不自动提交、推送或部署。

---

### Task 1: 建立阿里云短信 Provider 回归测试

**Files:**
- Create: `backend/src/test/java/com/spacetime/common/provider/impl/AliyunSmsCodeProviderTest.java`
- Modify: `backend/src/test/java/com/spacetime/miniapp/service/MiniappPrd01ConfigServiceTest.java`

**Interfaces:**
- Consumes: 期望的 `AliyunSmsCodeProvider(Client, ObjectMapper, AliyunSmsProperties)`。
- Produces: 签名、模板、`{"code":"123456"}` 参数、成功响应和失败响应行为的可执行约束。

- [x] **Step 1: 写 Provider 请求参数失败测试**

```java
provider.sendLoginCode("13800138000", "123456", 5);
assertThat(request.getSignName()).isEqualTo("上海兴家立业网络科技");
assertThat(request.getTemplateCode()).isEqualTo("SMS_336060313");
assertThat(request.getTemplateParam()).isEqualTo("{\"code\":\"123456\"}");
```

- [x] **Step 2: 写阿里云非 OK 响应失败测试**

```java
when(client.sendSms(any())).thenReturn(response("isv.SMS_SIGNATURE_ILLEGAL", "签名不合法"));
assertThatThrownBy(() -> provider.sendLoginCode("13800138000", "123456", 5))
        .isInstanceOf(IllegalStateException.class);
```

- [x] **Step 3: 运行测试确认红灯**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -f backend/pom.xml -Dtest=AliyunSmsCodeProviderTest test`

Expected: FAIL，提示阿里云 SDK 或 Provider 尚不存在。

### Task 2: 实现阿里云短信 Provider 与环境选择

**Files:**
- Modify: `backend/pom.xml`
- Create: `backend/src/main/java/com/spacetime/common/provider/impl/AliyunSmsProperties.java`
- Create: `backend/src/main/java/com/spacetime/common/provider/impl/AliyunSmsConfiguration.java`
- Create: `backend/src/main/java/com/spacetime/common/provider/impl/AliyunSmsCodeProvider.java`
- Modify: `backend/src/main/java/com/spacetime/common/provider/impl/MockSmsCodeProvider.java`
- Modify: `backend/src/main/resources/application.yml`
- Modify: `backend/src/main/resources/application-prod.yml`

**Interfaces:**
- Produces: `SmsCodeProvider` 单实例；`providerCode()` 在真实通道返回 `ALIYUN_SMS`。
- Consumes: `sms.provider` 以及 `sms.aliyun.*` 配置。

- [x] **Step 1: 引入官方 V2.0 SDK**

```xml
<dependency>
  <groupId>com.aliyun</groupId>
  <artifactId>dysmsapi20170525</artifactId>
  <version>4.5.1</version>
</dependency>
```

- [x] **Step 2: 实现配置属性与条件 Bean**

```java
@Configuration
@ConditionalOnProperty(prefix = "sms", name = "provider", havingValue = "aliyun")
@EnableConfigurationProperties(AliyunSmsProperties.class)
class AliyunSmsConfiguration { }
```

- [x] **Step 3: 实现请求和响应校验**

```java
SendSmsRequest request = new SendSmsRequest()
        .setPhoneNumbers(phone)
        .setSignName(properties.getSignName())
        .setTemplateCode(properties.getTemplateCode())
        .setTemplateParam(objectMapper.writeValueAsString(Map.of("code", code)));
if (response == null || response.getBody() == null || !"OK".equals(response.getBody().getCode())) {
    throw new IllegalStateException("阿里云短信发送失败");
}
```

- [x] **Step 4: 将 mock 与 aliyun 设为互斥通道**

```java
@ConditionalOnProperty(prefix = "sms", name = "provider", havingValue = "mock", matchIfMissing = true)
class MockSmsCodeProvider implements SmsCodeProvider { }
```

- [x] **Step 5: 运行 Provider 测试确认绿灯**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -f backend/pom.xml -Dtest=AliyunSmsCodeProviderTest test`

Expected: PASS。

### Task 3: 对齐运行时 Provider 编码与生产部署门禁

**Files:**
- Modify: `backend/src/main/java/com/spacetime/common/service/Prd01RuntimeConfigResolver.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/MiniappPrd01ConfigServiceImpl.java`
- Modify: `backend/src/test/java/com/spacetime/miniapp/service/MiniappPrd01ConfigServiceTest.java`
- Modify: `deploy/server.prod.env.example`
- Modify: `deploy/scripts/deploy-prod-local.sh`
- Modify: `scripts/validate-prod-deploy-config.mjs`

**Interfaces:**
- Produces: `/miniapp/prd01/config.smsSecurity.providerCode = ALIYUN_SMS`（生产真实通道）。
- Consumes: 部署机私有 `prod.env` 中的 `SMS_*` 变量。

- [x] **Step 1: 让运行时配置使用当前 Provider 编码**

```java
result.put("smsSecurity", runtimeConfigResolver.smsSecurity(
        snapshot, smsCodeProvider.providerCode()));
```

- [x] **Step 2: 增加生产环境变量模板**

```dotenv
SMS_PROVIDER=aliyun
SMS_ACCESS_KEY_ID=
SMS_ACCESS_KEY_SECRET=
SMS_ENDPOINT=dysmsapi.aliyuncs.com
SMS_SIGN_NAME=上海兴家立业网络科技
SMS_TEMPLATE_CODE=SMS_336060313
```

- [x] **Step 3: 部署脚本强制校验并透传全部 SMS 变量**

Run: `node scripts/validate-prod-deploy-config.mjs`

Expected: PASS；脚本优先使用 `SMS_ACCESS_KEY_*`，留空时复用已配置的 `OSS_ACCESS_KEY_*`，两者均缺失时拒绝生成生产运行环境。

### Task 4: 回归构建与真实链路验收

**Files:**
- Modify: `docs/superpowers/plans/2026-08-03-aliyun-sms-phone-login-closure.md`

**Interfaces:**
- Consumes: Provider、现有 Redis 登录服务、小程序接口和部署门禁。
- Produces: 可部署的真实短信手机号登录链路。

- [x] **Step 1: 运行短信与手机号登录专项测试**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -f backend/pom.xml -Dtest=AliyunSmsCodeProviderTest,AuthMiniappServiceImplTest,MiniappPrd01ConfigServiceTest test`

Expected: PASS，0 failures。

- [x] **Step 2: 运行后端全量测试**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -f backend/pom.xml test`

Expected: BUILD SUCCESS。

- [x] **Step 3: 运行短信生产配置专项门禁**

Run: `node scripts/validate-aliyun-sms-closure.mjs`

Expected: 输出“阿里云短信手机号登录静态闭环校验通过”。

记录：通用 `validate-prod-deploy-config.mjs` 的短信配置断言已通过，但该通用门禁仍被仓库既有 `013/037` 号含 `DROP TABLE IF EXISTS` 的历史清理 SQL 阻断；未为本任务放宽该生产安全门禁。

- [x] **Step 4: 核对小程序手机号链路仍调用真实接口**

Run: `cd miniapp && npm run validate:login-closure`

Expected: PASS，获取验证码仍调用 `/miniapp/auth/sms-code`，登录仍调用 `/miniapp/auth/phone-login`。

- [x] **Step 5: 执行真实短信烟测（允许按授权复用 OSS 凭证）**

Run: 使用受控测试手机号调用 `/miniapp/auth/sms-code`，再用收到的验证码调用 `/miniapp/auth/phone-login`。

Expected: Provider 为 `ALIYUN_SMS`、阿里云接受模板 `SMS_336060313` 的发送请求、验证码只能成功消费一次；SMS 专用变量未设置时，按用户明确授权复用现有 OSS RAM 凭证。

记录：已使用本机现有 OSS RAM 凭证完成真实烟测；阿里云短信接口返回成功，Provider 为 `ALIYUN_SMS`。首次联调定位到该手机号已有微信账号时仍按 `phone_手机号` 新建用户、触发手机号唯一索引冲突的问题；现已改为按 `phone_hash` 复用唯一账号并保留原微信 openid，且数据库处理失败时不提前删除验证码。修复后真实手机号登录成功返回 token，同一验证码第二次登录返回 `AUTH_SMS_INVALID`，验证码键与联调 token 均已清理。短信专用变量仍保留最高优先级覆盖入口，任何凭证值未写入源码、文档或日志。

最终验证：后端全量测试 `430/430` 通过，小程序登录专项 `7/7` 通过，阿里云短信静态门禁、部署脚本语法和 `git diff --check` 均通过。烟测完成后，受控测试手机号已恢复为 `first_login_completed=0`、`first_login_next_step=1`，且只有一个有效账号。

- [x] **Step 6: 更新勾选并核对差异**

Run: `git diff --check && git status --short`

Expected: 无空白错误；只包含本任务改动和任务开始前已有改动。
