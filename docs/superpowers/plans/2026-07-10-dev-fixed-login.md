# Dev Fixed Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为本地微信小程序预览提供手机号 `17366629764` 对应的永不过期固定 token，刷新后自动进入首页。

**Architecture:** Spring `dev` 配置启动时按手机号查询用户，并向现有 `miniapp:token:` Redis 命名空间写入不带 TTL 的 `UserContext`；小程序仅在 `API_BASE_URL` 为 localhost 时写入同一固定 token 和测试用户信息，并在启动后切换到首页 Tab。生产 profile 不创建固定会话，非本地 API 不自动登录。

**Tech Stack:** Java 21、Spring Boot 3.4、MyBatis-Plus、Redis、Taro 4、React 18、TypeScript。

## Global Constraints

- 固定 token 仅允许 Spring `dev` profile 生效。
- 小程序自动登录仅允许 `http://localhost:8080` 生效。
- 固定 Redis key 不设置过期时间。
- 不修改正常微信登录和 7 天 token 生命周期。
- 不输出 Redis 密码、微信凭证或生产密钥。

---

### Task 1: 后端固定会话初始化

**Files:**
- Create: `backend/src/main/java/com/spacetime/miniapp/config/DevFixedLoginInitializer.java`
- Modify: `backend/src/main/resources/application-dev.yml`
- Test: `backend/src/test/java/com/spacetime/miniapp/config/DevFixedLoginInitializerTest.java`

**Interfaces:**
- Consumes: `AppUserDao`、`StringRedisTemplate`、`ObjectMapper`、`AuthConstant.MINIAPP_TOKEN_PREFIX`。
- Produces: `miniapp:token:dev-fixed-token-17366629764`，值为用户 50 对应的 `UserContext` JSON，无 TTL。

- [ ] **Step 1: Write the failing test**

```java
@Test
void shouldWriteFixedTokenWithoutExpirationForConfiguredPhone() throws Exception {
    AppUser user = new AppUser();
    user.setId(50L);
    user.setPhone("17366629764");
    user.setNickname("筱脑虎");
    when(appUserDao.selectOne(any())).thenReturn(user);

    initializer.run(mock(ApplicationArguments.class));

    verify(valueOperations).set(
            "miniapp:token:dev-fixed-token-17366629764",
            objectMapper.writeValueAsString(expectedContext));
    verify(valueOperations, never()).set(anyString(), anyString(), any(Duration.class));
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn -Dtest=DevFixedLoginInitializerTest test`

Expected: FAIL，因为 `DevFixedLoginInitializer` 尚不存在。

- [ ] **Step 3: Write minimal implementation**

```java
@Component
@Profile("dev")
public class DevFixedLoginInitializer implements ApplicationRunner {
    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (!enabled) return;
        AppUser user = appUserDao.selectOne(new LambdaQueryWrapper<AppUser>().eq(AppUser::getPhone, phone));
        UserContext context = new UserContext(user.getId(), user.getNickname(), List.of(), List.of());
        redisTemplate.opsForValue().set(AuthConstant.MINIAPP_TOKEN_PREFIX + token,
                objectMapper.writeValueAsString(context));
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && mvn -Dtest=DevFixedLoginInitializerTest test`

Expected: PASS，且验证未调用带 `Duration` 的 Redis set。

### Task 2: 小程序本地启动自动登录

**Files:**
- Modify: `miniapp/src/constants/config.ts`
- Modify: `miniapp/src/app.tsx`
- Create: `miniapp/scripts/validate-dev-fixed-login.mjs`
- Modify: `miniapp/package.json`

**Interfaces:**
- Consumes: `useAuthStore.setLogin`、`Taro.switchTab`、`API_BASE_URL`。
- Produces: `DEV_FIXED_LOGIN` 配置和本地启动自动跳转行为。

- [ ] **Step 1: Write the failing gate**

```js
assert.match(config, /dev-fixed-token-17366629764/)
assert.match(config, /API_BASE_URL === 'http:\/\/localhost:8080'/)
assert.match(app, /setLogin\(DEV_FIXED_LOGIN\.token/)
assert.match(app, /Taro\.switchTab\(\{ url: '\/pages\/index\/index' \}\)/)
```

- [ ] **Step 2: Run gate to verify it fails**

Run: `cd miniapp && node scripts/validate-dev-fixed-login.mjs`

Expected: FAIL，因为固定登录配置尚不存在。

- [ ] **Step 3: Write minimal implementation**

```ts
export const DEV_FIXED_LOGIN = {
  enabled: API_BASE_URL === 'http://localhost:8080',
  token: 'dev-fixed-token-17366629764',
  userId: 50,
  phone: '17366629764',
}
```

```ts
useLaunch(() => {
  if (DEV_FIXED_LOGIN.enabled) {
    setLogin(DEV_FIXED_LOGIN.token, DEV_FIXED_LOGIN.userId, '', '', { phone: DEV_FIXED_LOGIN.phone })
    setTimeout(() => void Taro.switchTab({ url: '/pages/index/index' }), 0)
    return
  }
  checkLogin()
})
```

- [ ] **Step 4: Run gate to verify it passes**

Run: `cd miniapp && node scripts/validate-dev-fixed-login.mjs`

Expected: PASS。

### Task 3: 集成验证

**Files:**
- Verify: `backend/src/main/resources/application-dev.yml`
- Verify: `miniapp/dist/`

**Interfaces:**
- Consumes: Task 1 固定 Redis 会话、Task 2 固定客户端 token。
- Produces: 本地预览刷新后直接进入首页，受保护接口返回 200。

- [ ] **Step 1: Run backend tests**

Run: `cd backend && mvn -Dtest=DevFixedLoginInitializerTest test`

Expected: PASS。

- [ ] **Step 2: Run miniapp checks and build**

Run: `cd miniapp && node scripts/validate-dev-fixed-login.mjs && npm run build:weapp`

Expected: 门禁通过且 Webpack 编译成功。

- [ ] **Step 3: Verify fixed token endpoint**

Run: `curl -H 'X-Auth-Token: dev-fixed-token-17366629764' http://localhost:8080/miniapp/profile/detail`

Expected: HTTP 200，返回手机号对应用户资料。
