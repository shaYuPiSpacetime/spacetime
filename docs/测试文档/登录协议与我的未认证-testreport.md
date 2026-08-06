# 登录协议与我的未认证 - 测试报告

> **关联文档**：
>
> - 测试用例：`docs/测试文档/登录协议与我的未认证-testcase.md`
> - 验收报告：`docs/验收报告/2026-08-05-登录协议与我的未认证-蓝湖还原-acceptance.md`

---

## 1. 测试概况

| 项目 | 信息 |
| --- | --- |
| 功能名称 | 登录协议弹窗层级、我的未认证状态分流与蓝湖还原 |
| 测试环境 | 微信开发者工具 iPhone 12/13 (Pro)，390×844，SDK 3.16.1；本机隔离 E2E API |
| 执行日期 | 2026-08-05 |
| 执行人 | Codex |
| 代码基线 | `master` / `aa311c4` + 当前未提交变更 |
| 测试策略 | 静态/TDD + 微信小程序 L4 等价自动化 + 完整生产构建 |
| 测试模式 | 完整模式 |

## 2. 测试结果汇总

| 层级 | 总数 | 通过 ✅ | 失败 ❌ | 跳过 ⏭️ | 通过率 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Node/TDD 与关联静态回归 | 93 | 93 | 0 | 0 | 100% |
| 微信小程序运行态 L4 | 9 | 8 | 0 | 1 | 88.9% |
| 生产构建产物门禁 | 3 | 3 | 0 | 0 | 100% |
| 手动验收项 | 5 | 5 | 0 | 0 | 100% |
| **合计** | **110** | **109** | **0** | **1** | **99.1%** |

## 3. 测试结论

**判定结果：✅ 通过**

判定依据：

- P0/P1 功能用例全部通过，没有失败用例。
- 唯一跳过项是 P2 截图像素差异，原因是本机未给微信开发者工具开放屏幕录制权限；运行态 DOM、原生组件树和关键像素几何均已通过自动化断言。
- 最终生产构建成功，75 个页面均只注册一次，产物无开发 Token、本次 E2E 本机地址未进入 `dist`。
- 包体门禁通过：主包 1.32 MiB，千寻分包 103.7 KiB，总包 1.98 MiB。

## 4. 失败用例明细

无。

## 5. 跳过用例明细

| 用例ID | 层级 | 优先级 | 场景描述 | 跳过原因 | 是否需要补测 |
| --- | --- | --- | --- | --- | --- |
| L4-09 | L4 | P2 | 微信模拟器截图与像素差异 | 微信开发者工具截图接口被 macOS TCC 屏幕录制权限拒绝 | 是；开放权限后去掉 `SKIP_RUNTIME_SCREENSHOTS` 重跑 |

## 6. 执行详情

### 6.1 专项静态/TDD 回归

```bash
cd miniapp
npm run validate:login-closure
npm run test:login-profile-unverified
node --test scripts/test-prd01-runtime.cjs
node --test scripts/test-handoff-runtime-gates.cjs
node --test scripts/test-verification-onboarding-flow.cjs scripts/test-profile-edit-closure.cjs
node scripts/validate-verification-profile-ui.mjs
node scripts/validate-membership-payment-ui.mjs
```

结果：所有专项和关联用例通过；旧静态门禁已同步到共享认证组件，不降低原有断言标准。

### 6.2 微信小程序运行态

```bash
cd miniapp
WX_AUTO_PORT=9432 \
WX_IDE_PORT=57814 \
SKIP_RUNTIME_SCREENSHOTS=true \
npm run verify:login-profile-unverified-runtime
```

运行态结果：

| 用例 | 结果 | 证据 |
| --- | --- | --- |
| 协议遮罩覆盖完整视口 | ✅ | 390×844 几何断言 |
| 弹窗打开时卸载原生 Video | ✅ | `page.$('video') === null` |
| 弹窗打开时卸载 CoverImage Logo | ✅ | `page.$('cover-image') === null` |
| 普通 Image Logo 位于遮罩下层 | ✅ | Logo 291.2×135.2、遮罩 z=100、Logo z=2 |
| 我的未认证初始节点 | ✅ | `#profile-unverified` 与插画节点存在 |
| 我的部分资料节点 | ✅ | `#verification-entry-checklist` 存在 |
| 普通个人中心不得提前渲染 | ✅ | `#profile-header-edit-area === null` |
| 我的 Tab 保持点亮 | ✅ | 激活切图 `tab-profile-active.png`、opacity=1 |

### 6.3 最终生产构建

```bash
cd miniapp
npm run build:weapp
```

结果：Webpack 编译成功；前置全量门禁、构建注册、固定登录产物、包体门禁全部通过。

## 7. 遗留问题

无产品功能遗留。截图证据受本机系统权限限制，限制说明已保存至：

`docs/验收报告/截图证据/2026-08-05-登录协议与我的未认证-蓝湖还原/微信运行-390x844/截图限制说明.txt`

## 8. 后续建议

- 保留 `test:login-profile-unverified` 作为登录发布门禁的后置测试，防止原生层和“我的”准入分流回退。
- 开放微信开发者工具屏幕录制权限后补采三张运行截图，无需修改代码或测试数据。
