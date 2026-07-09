# 微信授权手机号登录 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 小程序使用微信手机号授权完成真实登录，后端换取 openid 和手机号，创建/更新 `app_user` 并发放真实 token。

**Architecture:** 前端登录页通过 `open-type=getPhoneNumber` 获取 `phoneCode`，再调用 `Taro.login()` 获取 `loginCode`，统一提交到 `POST /miniapp/auth/wechat-login`。后端新增微信小程序客户端封装 `jscode2session` 与 `getuserphonenumber`，登录服务只负责业务编排、用户落库和 Redis token。

**Tech Stack:** Taro/React/TypeScript, Spring Boot 3.4, MyBatis-Plus, MySQL, Redis, Java 21。

## Global Constraints

- 所有用户沟通和文档使用中文。
- 不回退无关脏工作区变更。
- 先写失败测试或静态门禁，再写生产实现。
- 小程序请求头继续使用 `X-Auth-Token`。
- 微信支付依赖 `app_user.openid`，登录闭环必须返回并持久化 openid。

---

### Task 1: 后端微信登录服务

**Files:**
- Create: `backend/src/test/java/com/spacetime/miniapp/service/AuthMiniappServiceImplTest.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/service/WechatMiniappClient.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/service/impl/WechatMiniappClientImpl.java`
- Create: `backend/src/main/java/com/spacetime/common/config/WechatMiniappProperties.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/AuthMiniappServiceImpl.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/dto/request/WechatLoginReq.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/dto/response/WechatLoginVO.java`
- Modify: `backend/src/main/java/com/spacetime/common/entity/AppUser.java`
- Modify: `deploy/sql/prod/010_app_user_schema.sql`
- Modify: `backend/docs/sql/schema-prd01-user.sql`

**Interfaces:**
- Consumes: `WechatLoginReq.loginCode`, `WechatLoginReq.phoneCode`
- Produces: `WechatLoginVO.token`, `userId`, `openid`, `phone`, `maskedPhone`, `firstLoginCompleted`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run `JAVA_HOME=/Users/bobo/Library/Java/JavaVirtualMachines/azul-21.0.5/Contents/Home mvn -q -Dtest=AuthMiniappServiceImplTest test` and verify RED**
- [ ] **Step 3: Implement微信客户端、DTO、实体、SQL和登录编排**
- [ ] **Step 4: Run the same test and verify GREEN**

### Task 2: 小程序授权手机号登录与资料提交

**Files:**
- Create: `miniapp/scripts/validate-wechat-phone-login.mjs`
- Modify: `miniapp/src/services/auth.ts`
- Modify: `miniapp/src/types/user.ts`
- Modify: `miniapp/src/pages/login/index.tsx`
- Modify: `miniapp/src/hooks/useAuth.ts`
- Modify: `miniapp/src/hooks/useLogin.ts`
- Modify: `docs/移动端文档/miniapp-api-requirements.md`

**Interfaces:**
- Consumes: 微信 `getPhoneNumber` 事件 `detail.code` 与 `Taro.login().code`
- Produces: 本地 `TOKEN_KEY`、`USER_INFO_KEY`，首登资料 `POST /miniapp/profile/init-complete`

- [ ] **Step 1: Write the failing static validator**
- [ ] **Step 2: Run `node miniapp/scripts/validate-wechat-phone-login.mjs` and verify RED**
- [ ] **Step 3: Implement front-end auth service, login page授权按钮,真实 token 写入,资料提交**
- [ ] **Step 4: Run validator and targeted TypeScript/static checks**
