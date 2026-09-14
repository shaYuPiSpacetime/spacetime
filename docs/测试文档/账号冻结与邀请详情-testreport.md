# 账号冻结与邀请详情 - 测试报告

## 1. 测试概况

| 项目 | 信息 |
|---|---|
| 日期 | 2026-09-14 |
| 范围 | 用户反馈 1、3、4；工作区 master 未提交改动 |
| 测试设计 | [账号冻结与邀请详情-testcase.md](./账号冻结与邀请详情-testcase.md) |
| 执行方式 | 增量 L3、实际 TSX 渲染/点击回归、小程序编译及产物门禁 |
| 本机环境 | macOS、JDK 22、Node.js 25.6.0、Taro 4.1.9 |

## 2. 修复及复现证据

1. 准入评估原先先检查首登进度，再检查账号异常；冻结且资料未完成时返回“请先完善基础资料”。移动端还把所有非核心准入状态统一渲染为认证引导。现将账号限制提前，准入响应增加 `accountStatus`，千寻、我的和通用拦截页据此展示账号说明、客服和刷新入口。
2. 普通邀请的 `agentId` 正常为空，`relationDetail()` 原先调用 `List.of(null)`。修复前两条普通邀请用例均在该行抛出空指针；现在复用批量查询的空值过滤链路，空代理 ID 不查询代理表。
3. 邀请关系列表和邀请奖励流水均通过 `RelationDetailDrawer` 调用同一详情接口，因此反馈 3、4 由同一后端修复覆盖。生产请求 ID 未做日志关联，结论来自代码路径与本地复现。

修复前：后端定向 29 项中 26 项通过、1 项断言失败、2 项空指针；新增小程序 8 项中 3 项通过、5 项失败。首次修复后奖励合计测试暴露测试数据误用了大写状态码，已改为项目枚举的正式代码，未修改合计业务逻辑。

## 3. 最终结果

| 验证项 | 数量 | 通过 | 失败 | 未执行 |
|---|---:|---:|---:|---:|
| 后端 L3 | 53 | 53 | 0 | 0 |
| 小程序针对性回归 | 20 | 20 | 0 | 0 |
| 修改的 TypeScript 文件 ESLint | 6 | 6 | 0 | 0 |
| Taro 代码编译 | 1 | 1 | 0 | 0 |
| 构建后产物门禁 | 3 | 3 | 0 | 0 |
| 完整 npm 构建流程 | 1 | 0 | 1 | 0 |
| ENV-01 接口/后台页面联调 | 1 | 0 | 0 | 1 |
| ENV-02 真机冻结/解冻 | 1 | 0 | 0 | 1 |

**结论：本次代码修复的本地回归通过；完整交付验收有条件通过。** 完整构建前置门禁存在工作区素材缺失，两个环境验收场景尚未执行，不能据此宣称已完成线上或真机验收。

## 4. 执行详情

### 后端

```bash
cd backend
JAVA_HOME=/Users/peter/Library/Java/JavaVirtualMachines/openjdk-22/Contents/Home mvn -q -Dtest=PromotionAdminServiceImplTest,ProfileServiceImplTest,VerificationServiceImplTest,AuthMiniappServiceImplTest test
```

| 测试类 | 通过数 | 覆盖 |
|---|---:|---|
| PromotionAdminServiceImplTest | 4 | 普通邀请空代理 ID、有/无奖励、成功奖励合计、校园代理及现金奖励、不存在关系 404 |
| ProfileServiceImplTest | 25 | 原资料流程及新增冻结优先级、正常资料拦截、解冻恢复、未认证非核心准入 |
| VerificationServiceImplTest | 14 | 认证服务兼容回归 |
| AuthMiniappServiceImplTest | 10 | 登录服务兼容回归 |

结果由 `backend/target/surefire-reports/TEST-*.xml` 核对，全部无失败、无错误、无跳过。Maven 最初受沙箱对本机依赖缓存的写入限制影响，授权复跑后完成。

### 小程序

```bash
cd miniapp
node --test scripts/test-account-frozen-access.cjs scripts/test-login-modal-profile-unverified.cjs scripts/test-unverified-menu-states.cjs
./node_modules/.bin/eslint src/components/AccessBlockedPage.tsx src/domain/accessStatus.ts src/pages/index/index.tsx src/pages/profile/index.tsx src/hooks/useProfile.ts src/types/prd01.ts
```

新增冻结回归 8 项、已有登录/我的页 6 项、未认证菜单 6 项均通过。新增用例执行实际页面和拦截组件，覆盖客服点击、失败重试、缓存正常态被冻结态覆盖、解冻后重新渲染及旧缓存兼容。新测试已接入 `test:login-profile-unverified`，随既有开发/发布前置门禁执行。

```bash
npm run build:weapp
# 前置门禁因以下既有参考图缺失停止，未执行到正式编译：
# .lanhu-ref/lanhu-full-2026-07-07/images/08-会员中心-全.png

# 单独验证编译与产物；不代表完整前置门禁已通过。
./node_modules/.bin/taro build --type weapp
npm run postbuild:weapp
```

Taro 最初在沙箱读取 macOS 系统配置时异常，终止该次进程并授权复跑后编译成功（12.44 秒）。编译仍提示私信页超过 Webpack 建议体积；项目包体门禁通过。

- 页面注册：85 个页面均只注册一次，App 注册一次。
- 发布产物：登录首页及无开发 Token 检查通过。
- 包体：主包 1.24 MiB，总包 2.25 MiB，通过现有门禁。
- `git diff --check` 通过。

## 5. 未执行及遗留项

| 项目 | 原因 | 后续验收 |
|---|---|---|
| 完整前置门禁 | 当前工作区缺少会员中心的既有蓝湖参考图；该门禁脚本未被本次修改 | 补齐参考素材后执行完整 `npm run build:weapp` |
| ENV-01 | `frontend/e2e-tests/.env` 指向本机 5173/8080，Token 为空；没有有效登录凭证 | 在部署本次代码的测试环境，从邀请关系和奖励流水分别打开同一普通邀请详情，验证概览、时间线和奖励明细 |
| ENV-02 | 未提供可登录并执行冻结/解冻的专用测试账号 | 后端和小程序均更新后，验证已登录账号冻结提示与解冻刷新；保留正常未认证引导 |

本次完成源码与回归测试，未提交或发布版本，未修改生产数据。
