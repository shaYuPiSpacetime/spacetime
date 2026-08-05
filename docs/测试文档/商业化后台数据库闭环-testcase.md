# 商业化后台数据库闭环 - 测试用例

> **关联文档**：
> - `docs/需求文档/需求文档-正式版/04-商业化（VIP、千寻币、解锁与资产中心）/管理后台/页面规格/商业化配置页.md`
> - `docs/需求文档/需求文档-正式版/04-商业化（VIP、千寻币、解锁与资产中心）/移动端/页面规格/APP-02_千寻币充值页.md`
> - 测试报告：`docs/测试文档/商业化后台数据库闭环-testreport.md`
>
> **创建日期**：2026-07-10  
> **测试模式**：完整模式  
> **目标项目**：后端 `backend/`、管理后台 `frontend/`、小程序 `miniapp/`

---

## 1. 测试策略决策

### 后端评估

| 维度 | 评估结果 | 得分 |
|------|----------|------|
| A 接口数 | 聚合查询/保存、套餐增改查启停、移动端套餐/场景查询 | 2 |
| B 状态流转 | 套餐启停、推荐互斥、固定目录约束 | 2 |
| C 规则逻辑 | 价格、普通套餐/一次性购买、固定 9 项权益和 8 个场景校验 | 2 |
| D 数据关联 | 权益、会员套餐、币包、场景、审计日志 | 2 |
| E 老代码影响 | 修改商业化核心聚合 Service 和移动端响应契约 | 2 |
| F 安全变更 | 保留既有 RBAC 权限，不移除安全注解 | 0 |
| **总分** |  | **10 -> L1 + L2 + L3** |

### 前端评估

| 条件 | 命中 | 说明 |
|------|------|------|
| G 多角色权限差异 | 是 | 配置查看与编辑权限分离 |
| H 复杂交互流程 | 是 | 套餐/场景编辑回显、保存二次确认、启停 |
| I 多页面联动 | 是 | 后台保存后由小程序套餐和场景接口消费 |
| J 核心业务页面 | 是 | 商业化配置和支付入口 |

**最终策略：L1 + L2 + L3 + 手动 + L4。**

## 2. 测试数据准备

| 数据需求 | 用途 | 如何准备 | 是否幂等 |
|----------|------|----------|----------|
| 开发库商业化配置 | 数据库迁移和真实回读 | 执行幂等迁移，按固定 code/name 更新 | 是 |
| 聚合保存请求 | 后端 Service 单测 | Mockito 构造实体和请求，不连接真实库 | 是 |
| 管理后台配置响应 | L4 回显与保存交互 | Playwright 路由拦截返回确定性接口响应 | 是 |
| L1 管理员 Token | 真实接口读写验证 | 仅从 `frontend/e2e-tests/.env` 读取 | 是 |

## 3. L1 - 接口测试用例

| 用例 ID | 优先级 | 场景 | 接口 | 前置条件 | 数据来源 | 期望结果 | 验证方式 |
|---------|--------|------|------|----------|----------|----------|----------|
| F1-P0-01 | P0 | 查询数据库商业化配置 | `GET /admin/commercial/config` | 有查看权限 | 自动查询 | 返回 9 项权益、3 个会员套餐、3 个千寻币套餐、8 个场景及稳定 ID | 响应断言 |
| F1-P0-02 | P0 | 修改消费场景后刷新回显 | `PUT/GET /admin/commercial/config` | 有编辑权限 | 自动查询并回写原值 | 修改值写库，重新查询与保存值一致 | 重新查询验证状态 |
| F1-P0-03 | P0 | 套餐改名按 ID 更新 | `PUT/GET /admin/commercial/config` | 选择已有套餐 | 自动查询 | ID 不变、名称更新、记录数不增加 | 重新查询验证状态 |
| F1-P1-04 | P1 | 千寻币推荐档互斥 | `PUT /admin/commercial/config` | 有编辑权限 | 自动查询 | 两个推荐档被拒绝，事务不写入 | 响应断言 + 重新查询 |
| F1-P1-05 | P1 | 非法场景目录 | `PUT /admin/commercial/config` | 有编辑权限 | 自动查询后替换 code | 未知、重复或 `invite_*` 场景被拒绝 | 响应断言 |
| F1-P0-06 | P0 | 查询一次性会员套餐 | `GET /admin/commercial/config` | 有查看权限 | 自动查询 | 所有会员套餐均返回 `packageType=normal`、`subscriptionType=once`，不返回微信签约配置 | 响应断言 |
| F1-P0-07 | P0 | 拒绝连续/周期扣费套餐 | `PUT /admin/commercial/config` | 有编辑权限 | 将任一套餐改为 `continuous/month` | 返回业务校验失败，数据库不写入 | 响应断言 + 重新查询 |
| G-P3-01 | P3 | 未登录读取配置 | `GET /admin/commercial/config` | 无 Token | 无需数据 | HTTP 401 | 状态码断言 |
| G-P3-02 | P3 | 未登录保存配置 | `PUT /admin/commercial/config` | 无 Token | 无需数据 | HTTP 401 | 状态码断言 |

> L1 写入用例必须保存原快照并在验证后回写；缺少有效 `API_URL` 或 `TOKEN` 时只生成脚本，不执行写入。

## 4. L2 - Controller 测试用例

| 用例 ID | 测试方法 | 验证点 | 期望 |
|---------|----------|--------|------|
| L2-01 | `config_shouldReturnAggregateData` | 聚合查询路由和响应泛型 | HTTP 200，`data` 为配置对象 |
| L2-02 | `saveConfig_shouldBindStableIds` | 套餐、权益、场景 ID 能绑定请求 DTO | Service 收到完整 ID |
| L2-03 | `saveConfig_shouldRejectMissingRequiredFields` | Bean Validation | 缺名称/价格/场景 code 返回业务码 `4001`，Service 不执行 |

## 5. L3 - Service 单元测试用例

| 用例 ID | 测试方法 | 输入 | 期望输出 |
|---------|----------|------|----------|
| L3-01 | `saveConfig_shouldUpdateVipPackageByIdWhenNameChanges` | 已有套餐 ID + 新名称 | 调用 `updateById`，不调用 `insert` |
| L3-02 | `saveConfig_shouldUpdateCoinPackageByIdWhenNameChanges` | 已有币包 ID + 新名称 | 调用 `updateById`，不调用 `insert` |
| L3-03 | `saveConfig_shouldKeepFixedBenefitIdentityWhenSavingEditableFields` | 全量合法权益配置 | 仅更新图标、数值、状态，固定名称/类型/说明不被覆盖 |
| L3-04 | `saveConfig_shouldRejectInvalidBenefitCatalog` | 非固定 9 项权益 | 抛业务异常，事务回滚 |
| L3-05 | `saveConfig_shouldRejectInvalidSceneCatalog` | 未知/重复/邀请场景 code | 抛业务异常，事务回滚 |
| L3-06 | `saveConfig_shouldRejectMultipleRecommendedCoinPackages` | 两个 `recommendFlag=1` | 抛业务异常，事务回滚 |
| L3-07 | `saveConfig_shouldRejectInvalidPackagePrice` | 优惠价大于原价或金额非正 | 抛业务异常 |
| L3-08 | `saveConfig_shouldRejectSceneIdCodeMismatch` | 消费场景 ID 与固定 code 不对应 | 抛业务异常，不更新记录 |
| L3-09 | `getPackages_shouldExposeLanhuPriceFields` | 币包含原价/优惠价/移动端标签 | 移动端 VO 字段完整 |
| L3-10 | `saveConfig_shouldRejectOmittedExistingPackage` | 聚合保存漏传已有套餐 | 拒绝保存，提示使用下架而非隐式删除 |
| L3-11 | `getScenes_shouldExposeDatabaseMobileFields` | 数据库场景移动端名称、图标键和价格 | 小程序 VO 字段完整 |
| L3-12 | `saveConfig_shouldRejectContinuousVipPackage` | `packageType=continuous` | 抛业务异常，事务不写入 |
| L3-13 | `saveConfig_shouldRejectRecurringVipPurchaseMode` | `subscriptionType=month` | 抛业务异常，事务不写入 |
| L3-14 | `create/update_shouldRejectNonOneTimePurchase` | 独立套餐接口传连续类型或周期扣费 | 抛业务异常，无法绕过聚合接口约束 |

## 6. L4 - E2E 浏览器测试用例

| 用例 ID | 优先级 | 页面 | 操作步骤 | 期望结果 |
|---------|--------|------|----------|----------|
| L4-01 | P0 | `/commercial/config` | 打开千寻币消费场景 Tab，编辑一行 | 弹窗完整回显名称、图标、说明、价格、状态 |
| L4-02 | P0 | `/commercial/config` | 保存编辑后的场景 | PUT 请求携带场景 ID；成功后 GET 回读值一致 |
| L4-03 | P0 | `/commercial/config` | 编辑千寻币套餐 | 原价、优惠价、币数、标签、推荐和状态完整回显 |
| L4-04 | P1 | `/commercial/config` | 将第二个币包设为推荐 | 其他币包推荐标记自动取消 |
| L4-05 | P1 | `/commercial/config` | 切换 Tab 再返回 | 未保存编辑不被意外重新请求覆盖 |
| L4-06 | P1 | `/commercial/config` | 接口为空/失败 | 展示明确空态或错误提示，不回退 demo 假数据 |
| L4-07 | P0 | `/commercial/config` | 加载历史 `continuous/month` 套餐，打开编辑并保存 | 页面固定显示“普通套餐/一次性购买”；保存请求归一化为 `normal/once`，清空微信商品与签约配置 |

## 7. 前端手动测试用例

| 用例 ID | 优先级 | 操作步骤 | 期望结果 | 实际结果 | 状态 |
|---------|--------|----------|----------|----------|------|
| M-01 | P0 | 开发库编辑消费场景并保存，刷新浏览器 | 数据保持且完整回显 | 待执行 | 待执行 |
| M-02 | P0 | 微信小程序打开千寻币页 | 仅展示数据库启用的 3 个币包和 8 个用途 | 待执行 | 待执行 |
| M-03 | P0 | 后台停用一个币包/场景后重新进入小程序 | 对应项目不展示 | 待执行 | 待执行 |
| M-04 | P1 | 检查千寻币三档价格卡 | 与蓝湖 `1000/99`、`3000/268`、`6000/428` 展示一致 | 待执行 | 待执行 |
| M-05 | P1 | 检查 8 个用途图标和名称 | 图标来自 OSS，名称按数据库配置展示 | 待执行 | 待执行 |
| M-06 | P0 | 打开会员套餐编辑弹窗 | 套餐类型和购买方式为只读“普通套餐/一次性购买”，无连续订阅选项和微信签约字段 | 自动化覆盖 | PASS |
| M-07 | P0 | 微信小程序进入会员中心并再次购买 | 使用微信 JSAPI 一次性下单；没有订阅管理入口、连续订阅协议或自动续费文案 | 编译与静态门禁覆盖 | PASS |

## 8. 补充用例（来自审查报告）

| 用例 ID | 来源 | 审查级别 | 场景 | 期望结果 |
|---------|------|----------|------|----------|
| R-P0-01 | 后端只读审查 | P0 | 套餐改名 | 不新增重复记录 |
| R-P0-02 | 后端只读审查 | P0 | 固定权益/场景目录 | 后端拒绝越界配置 |
| R-P1-03 | 后端只读审查 | P1 | 独立接口绕过审计 | 商业化聚合页面统一写入配置审计 |

## 9. 数据迁移验证

| 用例 ID | 优先级 | 场景 | 期望结果 |
|---------|--------|------|----------|
| DB-P0-01 | P0 | 执行 `064_vip_packages_one_time_purchase.sql` | 历史启用套餐统一为 `normal/once`，微信商品 ID 与签约配置清空 |
| DB-P0-02 | P0 | 重复执行迁移 | SQL 幂等，套餐数量、价格和有效期不变 |
| DB-P0-03 | P0 | 执行迁移末尾核对查询 | `invalid_package_count=0` |
