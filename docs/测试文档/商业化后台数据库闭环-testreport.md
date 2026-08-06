# 商业化后台数据库闭环 - 测试报告

> 日期：2026-08-05
> 关联用例：`docs/测试文档/商业化后台数据库闭环-testcase.md`  
> 覆盖模块：商业化管理后台、后端聚合配置、会员一次性购买、数据库迁移、微信小程序会员中心与千寻币页

## 2026-08-05 增量回归：商业化配置 7 个 Tab 与 Demo 列契约对齐

本轮按静态 Demo 与线上页面逐列核对了会员权益、会员套餐、千寻币套餐、千寻币消费场景、解锁保留期、社交与订单参数、曝光包预留 7 个 Tab。确认并修复了三类偏差：后台固定名称误显示为移动端营销名称、消费场景缺少“影响页面”列且编辑方式偏离 Demo、后三个参数 Tab 缺少字段说明与只读订单关闭项。

连续订阅属于过期 Demo 口径，本轮没有恢复；静态 Demo 与正式页面均保持当前已上线业务不变量“普通套餐 + 一次性购买”。套餐、价格、次数、图标键和开关等动态值仍以聚合接口数据库响应为准。

### 自动化与浏览器结果

| 层级 | 命令/方式 | 结果 |
|------|-----------|------|
| TDD 红灯 | 新增 `L4-08` 后先运行 | 按预期失败：`heart_list` 名称列错误显示“心动名单一键揭晓”，证明用例命中原问题 |
| L4 Playwright | `commercial-database-closure.spec.ts` | 6/6 PASS；覆盖 7 Tab 契约、消费场景内联编辑与 ID 保存、套餐编辑、推荐互斥、一次性购买归一化、接口失败空态 |
| 静态门禁 | `node docs/测试文档/商业化-PRD04-static-check.mjs` | 164 项 PASS；同时校验正式前端和静态 Demo 的核心表头、说明与一次性购买边界 |
| Demo JavaScript | `node --check` 检查 `assets/demo.js`、`mock/demo-data.js` | PASS |
| 管理后台构建 | `npm --prefix frontend run build` | PASS；仅保留既有主 chunk 大小告警 |
| L2/L3 定向回归 | `CommercialConfigControllerTest`、`CommercialAdminServiceImplTest`、`VipPackageAdminServiceImplTest` | 17/17 PASS，0 失败、0 错误、0 跳过 |
| 浏览器逐 Tab 复核 | 本地静态 Demo + Playwright 本地正式页截图 | 7/7 PASS；Demo 为 9 项权益、3 个会员套餐、3 个千寻币套餐、8 个消费场景，后三个参数 Tab 字段与说明完整 |

### 本轮结论

**判定结果：✅ 通过。**

- 会员权益“名称”列现在展示后台固定名称，移动端营销名称不再串列。
- 会员套餐列统一为“套餐类型、购买方式、有效天数”，仅展示普通套餐和一次性购买。
- 千寻币消费场景恢复“启停、影响页面”列，名称、图标、单价可在表格内直接编辑并随聚合保存携带稳定 ID。
- 解锁保留期、社交与订单参数、曝光包预留已补齐 Demo 对应字段说明和只读项。
- 本轮未执行发布，不将本地通过冒充线上已生效；发布后仍需对生产 URL 做一次只读 7 Tab 复核。

## 2026-08-05 增量回归：会员套餐统一一次性购买

本轮已将会员套餐口径统一为“普通套餐 + 一次性购买”。管理后台不再提供连续套餐或月/季/年周期扣费选项，后端聚合保存与独立套餐增改接口均拒绝非 `normal/once` 数据；小程序删除订阅管理页、连续订阅协议和自动续费入口，仍通过既有微信 JSAPI 订单执行单次支付。

### 自动化结果

| 层级 | 命令/方式 | 结果 |
|------|-----------|------|
| L3 定向测试 | `CommercialAdminServiceImplTest`、`VipPackageAdminServiceImplTest` | 13/13 PASS；已先验证 3 条新增约束用例在修复前失败 |
| 后端全量 | `mvn test`（项目指定 JDK） | 497/497 PASS，0 失败、0 错误、0 跳过 |
| 商业化静态门禁 | `node docs/测试文档/商业化后台数据库闭环-static-check.mjs` | PASS |
| 管理后台构建 | `frontend/npm run build` | PASS，仅有既有 chunk 体积告警 |
| L4 Playwright | `commercial-database-closure.spec.ts` | 5/5 PASS，新增历史连续套餐归一化保存验证 |
| 小程序商业化门禁 | `validate-membership-payment-ui.mjs`、`validate-membership-benefit-pages.mjs`、`validate-commerce-ui-coverage.mjs` | PASS |
| 微信小程序编译 | `miniapp/npm run build:weapp` | PASS；75 个页面注册正常，主包 1.30 MiB，总包 1.96 MiB |
| 生产代码关键字核查 | `miniapp/src`、`frontend/src`、`backend/src/main/java` | 无连续套餐/订阅管理残留；仅保留“不会自动续费”的一次性购买说明 |
| 自动发布 | GitHub Actions `30974157031`（后台）、`30974157043`（后端） | 均为 `completed/success`；生产容器已重建，健康接口 HTTP 200 |
| 线上只读回归 | `GET /api/miniapp/vip/packages` | 返回 3 个套餐：年卡、季卡、月卡均为 `normal/once`，微信商品 ID 和签约配置均为 `null` |

### 数据迁移状态

迁移文件：`deploy/sql/prod/064_vip_packages_one_time_purchase.sql`。2026-08-05 已将文件上传到生产服务器并核对本地/远端 SHA-256 一致；随后连续执行两次验证幂等，两次均返回 `active_package_count=3`、`invalid_package_count=0`。历史套餐现已统一为 `package_type=normal`、`subscription_type=once`，微信商品 ID 与签约配置已清空。

### 本轮暂未执行项

| 项目 | 状态 | 原因 |
|------|------|------|
| 真实管理后台 L1 写入 | SKIP | 本机未配置管理员 `TOKEN`，不虚构账号或凭证 |
| 真实微信支付 | SKIP | 依赖真实用户、商户回调与微信客户端；本轮仅验证真实支付代码链路和编译门禁 |
| 生产 SQL | PASS | 已连续执行两次，均为 3 个套餐、0 个非法套餐 |

---

## 1. 测试结论

本轮已完成商业化配置从数据库、后端聚合接口、管理后台编辑回显到小程序动态展示契约的闭环修复。后端全量测试、管理后台构建与 E2E、微信小程序编译均通过；生产代码未使用 Demo 业务数据兜底。

真实接口 L1 写入测试因本机未配置管理员 `TOKEN` 而未执行，脚本已生成且具备修改、回读、按原快照恢复能力。小程序 H5 按用户约束未编译。

## 2. 数据库验证

迁移文件：`backend/docs/sql/migration-20260710-commercial-ui-baseline.sql`

迁移已对开发库连续执行两次，均成功，证明当前数据写入过程可重复执行。执行后直接查询数据库结果：

| 配置 | 实际数量 | 关键结果 | 状态 |
|------|----------|----------|------|
| 会员权益 | 9 | 固定 code、中文名称、OSS 图标键、次数/分数均已写库 | PASS |
| VIP 套餐 | 3 | 连续包年 568、包季 318、包月 198 | PASS |
| 千寻币套餐 | 3 | 1000/99、3000/268、6000/428；原价和折扣标签完整 | PASS |
| 千寻币消费场景 | 8 | 名称、图标键、真实扣费价格、状态完整 | PASS |
| 商业化通用参数 | 8 | 保留期、查看配额、到期提醒、退款与曝光预留均在 `app_config` | PASS |

数据库稳定 ID 已核对：权益 `10-18`，VIP 套餐 `8/10/7`，千寻币套餐 `10-12`，消费场景 `9-16`。

## 3. 自动化结果

| 层级 | 命令/方式 | 结果 |
|------|-----------|------|
| 静态门禁 | `node docs/测试文档/商业化后台数据库闭环-static-check.mjs` | PASS |
| L1 cURL | `docs/测试文档/商业化后台数据库闭环-test-l1.sh` | SKIP，缺少真实 `API_URL/TOKEN` |
| L2/L3 定向测试 | Controller、DTO、聚合 Service、小程序 CoinService | 18/18 PASS |
| 后端全量 | `mvn test`（Java 21） | 179 条，0 失败，0 错误，1 条条件跳过 |
| 管理后台构建 | `frontend/npm run build` | PASS |
| L4 Playwright | `commercial-database-closure.spec.ts` | 4/4 PASS |
| 小程序静态闭环 | `node miniapp/scripts/validate-coin-closure.mjs` | PASS |
| 微信小程序编译 | `miniapp/npm run build:weapp` | PASS |

构建仅有既有体积告警：后台主 chunk 大于 500 kB，小程序 `qianxun-center.png` 大于推荐体积；不影响本轮编译和功能测试。

## 4. 关键用例结果

| 用例 | 结果 |
|------|------|
| 套餐改名按数据库 ID 更新，不插入重复记录 | PASS |
| 固定权益名称、类型、说明不可被请求覆盖 | PASS |
| 消费场景 ID 与 code 不匹配时拒绝保存 | PASS |
| 漏传已有套餐时拒绝隐式删除，要求使用下架 | PASS |
| 千寻币最多一个推荐档 | PASS |
| 原价、优惠价、到账币数、移动端标签进入小程序 VO | PASS |
| 后台消费场景编辑完整回显并携带 ID 保存 | PASS |
| 切换 Tab 不重新请求覆盖未保存草稿 | PASS |
| 720px 高视口下弹窗确认按钮保持可操作 | PASS |
| 接口失败显示空态，不回退 Demo 数据 | PASS |

## 5. 修复的测试问题

首次全量测试发现 `AssetServiceImplTest` 在公共 `setUp` 中创建未被所有用例使用的 Mockito 桩，导致 3 条 `UnnecessaryStubbingException`。已将消费场景与扣币桩移动到需要它们的用例，资产测试 5/5 和全量 179 条测试随后全部通过。

## 6. 未执行项与风险

| 项目 | 原因 | 风险控制 |
|------|------|----------|
| 真实管理后台 L1 写入 | 环境没有管理员 Token | 已提供可恢复原快照的 L1 脚本，不写死账号或 Token |
| 微信开发者工具运行截图 | 本机未安装微信开发者工具 CLI | 已通过 `build:weapp`、接口映射测试和静态门禁；不使用 H5 替代冒充 |
| 真实微信支付 | 依赖商户、商品和回调环境 | 本轮全量单测已覆盖订单创建、主动确认、幂等入账与未支付状态 |

## 7. 最终判定

数据库数据、后台配置增改查与下架语义、配置审计、小程序动态套餐/场景契约已闭环，自动化门禁通过。发布前仍需在有管理员 Token 和微信开发者工具的环境执行 L1 写入恢复脚本及小程序真机视觉终验。
