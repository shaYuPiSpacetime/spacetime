# 管理后台 PRD-04 / PRD-05 验收操作手册

> **适用范围**：仅管理后台（React Admin），不依赖小程序端联调。  
> **日期**：2026-06-03  
> **关联 PRD**：  
> - `docs/需求文档/管理后台/管理后台细化PRD-04_商业化（VIP、成家币、解锁与资产管理后台）.md`  
> - `docs/需求文档/管理后台/管理后台细化PRD-05_推荐模块（朋友、社区与内容互动）.md`  
> **关联测试用例**：  
> - `docs/测试文档/商业化-PRD04-测试用例.md`  
> - `docs/测试文档/社区互动-PRD05-testcase.md`

---

## 1. 文档目的

在**只有管理后台可访问**的前提下，按菜单逐项验收 PRD-04（商业化）与 PRD-05（社区互动）已落地能力，记录通过/失败与备注。

验收分两层：

| 层级 | 说明 | 是否必须 |
| --- | --- | --- |
| **A. 页面与配置** | 菜单、路由、列表、表单、筛选、权限、配置保存 | 必须 |
| **B. 业务数据联动** | 订单、流水、审核、举报等需库里有数据 | 可选；无数据时用附录 SQL 造数 |

---

## 2. 环境与账号

### 2.1 服务地址

| 服务 | 默认地址 |
| --- | --- |
| 管理后台前端 | `http://localhost:5173` |
| 后端 API | `http://localhost:8080` |

### 2.2 登录账号

使用具备**超级管理员**或已授权商业化/社区菜单的角色登录。

常见测试账号（以环境实际为准）：

| 账号 | 密码 | 说明 |
| --- | --- | --- |
| `admin` | `admin123` | RBAC 测试文档默认 |
| `peter` | `000000` | L1 脚本默认 |

登录路径：`/login` → 输入账号密码 → 进入 Dashboard。

### 2.3 数据库初始化（首次验收前）

在 MySQL 中执行（若已执行可跳过）：

```bash
# 商业化表 + 菜单 800 段
mysql ... < backend/docs/sql/schema-commercial.sql

# 社区表 + 字典 + 菜单 880 段
mysql ... < backend/docs/sql/schema-community.sql
```

执行后左侧菜单应出现：

- **财务中心**
- **移动端配置管理**（VIP 权益 / VIP 套餐 / 成家币套餐）
- **社区互动管理**（内容审核 / 评论审核 / 举报处理 / 社区配置）

若菜单缺失：到 **系统管理 → 角色管理**，为当前角色勾选上述菜单，或确认 `sys_role_menu` 已包含 800–819、880–888。

### 2.4 权限码速查

| 模块 | 权限码 | 能力 |
| --- | --- | --- |
| VIP 权益 | `vip:benefit:list` / `add` / `edit` | 列表、新增、编辑、启停 |
| VIP 套餐 | `vip:package:list` / `add` / `edit` | 同上 |
| 成家币套餐 | `coin:package:list` / `add` / `edit` | 同上 |
| 订单 | `finance:order:list` | 订单列表、详情 |
| 流水 | `finance:flow:list` | 流水列表 |
| 退款 | `finance:refund:list` / `finance:refund:process` | 退款列表、处理退款 |
| 内容审核 | `community:post:list` / `community:post:audit` | 列表、审核 |
| 评论审核 | `community:comment:list` / `community:comment:audit` | 列表、审核 |
| 举报 | `community:report:list` / `community:report:handle` | 列表、处理 |
| 社区配置 | `community:config:list` / `community:config:edit` | 查看、保存 |

---

## 3. 菜单与路由对照

### 3.1 PRD-04 商业化

| 菜单名称 | 路由 | 页面功能 |
| --- | --- | --- |
| VIP 权益配置 | `/config/vip-benefits` | 权益 CRUD、启停 |
| VIP 套餐配置 | `/config/vip-packages` | 套餐 CRUD、启停 |
| 成家币套餐配置 | `/config/coin-packages` | 币套餐 CRUD、启停 |
| 订单管理 | `/finance/orders` | 订单筛选、详情 |
| 流水管理 | `/finance/flows` | 成家币流水筛选 |
| 退款管理 | `/finance/refunds` | 退款记录、处理退款 |

财务中心三个子页共用顶部 Tab：**订单管理 | 流水管理 | 退款管理**，点击 Tab 会切换 URL。

### 3.2 PRD-05 社区互动

| 菜单名称 | 路由 | 页面功能 |
| --- | --- | --- |
| 内容审核 | `/community/posts` | 动态/诚意贴审核 |
| 评论审核 | `/community/comments` | 评论审核 |
| 举报处理 | `/community/reports` | 举报单处理 |
| 社区配置 | `/community/configs` | 社区规则参数 |

四个子页共用顶部 Tab，逻辑同财务中心。

### 3.3 配套：字典管理（发帖话题 / 举报原因）

| 菜单 | 路由 | 字典类型 |
| --- | --- | --- |
| 字典数据 | `/system/dict-data` | `community_topic`、`community_report_reason` |

种子 SQL 已写入默认话题与举报原因；验收时确认均为 **ENABLED**。

---

## 4. PRD-04 验收步骤（仅管理后台）

### 4.1 VIP 权益配置

**路径**：移动端配置管理 → VIP 权益配置 → `/config/vip-benefits`

| 步骤 | 操作 | 预期结果 |
| --- | --- | --- |
| 1 | 打开页面 | 表格正常加载，无报错 Toast |
| 2 | 点击 **新增** | 弹出表单：权益编码、名称、类型、描述、排序、状态 |
| 3 | 填写并保存 | 提示成功，列表出现新行 |
| 4 | 点击 **编辑** | 表单回显，修改名称后保存成功 |
| 5 | 点击 **停用** | 状态 Badge 变为停用；再 **启用** 恢复 |
| 6 | 顶部搜索（如有） | 按关键字过滤列表 |

**记录**：□ 通过　□ 失败　备注：__________

---

### 4.2 VIP 套餐配置

**路径**：`/config/vip-packages`

| 步骤 | 操作 | 预期结果 |
| --- | --- | --- |
| 1 | 打开页面 | 列表含套餐名、类型、价格、天数、推荐、状态等列 |
| 2 | **新增** | 必填：套餐名、类型（普通/连续订阅）、价格、有效天数；可选：原价、推荐、标签、排序 |
| 3 | 保存 | 列表刷新，新套餐状态为启用 |
| 4 | **编辑** | 改价格或天数后保存成功 |
| 5 | **停用** | 状态变更；启用后恢复 |
| 6 | 验证停用逻辑 | 停用套餐在 DB `vip_package.status=DISABLED`（后续小程序接入时再验接口过滤） |

**记录**：□ 通过　□ 失败　备注：__________

---

### 4.3 成家币套餐配置

**路径**：`/config/coin-packages`

| 步骤 | 操作 | 预期结果 |
| --- | --- | --- |
| 1 | 打开页面 | 列表含套餐名、金额、币数、赠送币、标签、状态 |
| 2 | **新增** | 填写金额、成家币数量、赠送币、描述、排序 |
| 3 | **编辑** / **启停** | 与 VIP 套餐一致 |
| 4 | 停用后 | 列表状态正确，无接口 500 |

**记录**：□ 通过　□ 失败　备注：__________

---

### 4.4 财务中心 — 订单管理

**路径**：财务中心 → 订单管理 → `/finance/orders`

| 步骤 | 操作 | 预期结果 |
| --- | --- | --- |
| 1 | 打开页面 | 顶部 Tab 高亮「订单管理」 |
| 2 | 无数据时 | 表格显示「暂无数据」，非白屏/报错 |
| 3 | 筛选：订单类型 | VIP / 成家币 下拉可选 |
| 4 | 筛选：订单状态 | 待支付、已支付、已关闭、退款中等 |
| 5 | 输入订单号 + **查询** | 条件生效（有数据时应命中） |
| 6 | **重置** | 筛选清空，列表恢复 |
| 7 | 有数据时点 **查看详情** | 弹窗展示订单号、用户 ID、类型、金额、状态、支付/退款时间等 |
| 8 | 切换到 **流水管理** Tab | URL 变为 `/finance/flows` |

**记录**：□ 通过　□ 失败　备注：__________

---

### 4.5 财务中心 — 流水管理

**路径**：`/finance/flows`

| 步骤 | 操作 | 预期结果 |
| --- | --- | --- |
| 1 | 筛选：用户 ID | 输入数字后查询 |
| 2 | 筛选：流水类型 | 收入 / 支出 |
| 3 | 筛选：业务场景 | 充值、购买 VIP、退款、后台发放等 |
| 4 | 日期范围 + 查询 | 列表按时间过滤 |
| 5 | 有流水时 | 变动数量正负色区分，变动后余额列有值 |

**记录**：□ 通过　□ 失败　备注：__________

---

### 4.6 财务中心 — 退款管理

**路径**：`/finance/refunds`

| 步骤 | 操作 | 预期结果 |
| --- | --- | --- |
| 1 | 打开页面 | 列表可加载；无数据时显示暂无数据 |
| 2 | 按订单号 / 用户 ID 查询 | 筛选区正常 |
| 3 | 有待处理记录时 | 点击 **退款处理**，填写退款原因（必填）、退款金额，**确认退款** |
| 4 | 成功后 | Toast 成功；订单状态变为已退款（需到订单管理核对） |

**已知问题（验收时记录）**：

- 后端退款接口要求订单状态为 **已支付（success）** 才可退款。
- 退款列表接口仅返回 **退款中 / 已退款** 订单。
- 前端「退款处理」按钮依赖 `refundStatus === 'pending'`，与后端字段可能不一致，导致**按钮长期禁用**。
- **仅后台验收时**：若 UI 无法操作，可用附录 **B.2** 接口验证退款逻辑，并在备注中记为 UI 缺陷。

**记录**：□ 通过　□ 失败　备注：__________

---

### 4.7 PRD-04 权限（可选）

使用**无财务权限**角色登录：

| 步骤 | 预期 |
| --- | --- |
| 侧边栏无「财务中心」或进入后无数据/403 | 权限隔离生效 |
| 直接访问 `/finance/orders` | 被拦截或提示无权限 |

**记录**：□ 通过　□ 失败　□ 跳过

---

## 5. PRD-05 验收步骤（仅管理后台）

### 5.1 字典 — 社区话题与举报原因

**路径**：系统管理 → 字典数据 → `/system/dict-data`

| 步骤 | 操作 | 预期结果 |
| --- | --- | --- |
| 1 | 字典类型选 `community_topic` | 至少 3 条启用数据（如露营交友、周末搭子） |
| 2 | 字典类型选 `community_report_reason` | 至少 3 条（广告营销、辱骂攻击、不实信息） |
| 3 | 新增一条话题并启用 | 保存成功，排序正常 |
| 4 | 停用一条话题 | 状态变更成功 |

**记录**：□ 通过　□ 失败　备注：__________

---

### 5.2 社区配置

**路径**：社区互动管理 → 社区配置 → `/community/configs`  
（也可从内容审核页顶部 Tab 切到「社区配置」）

| 步骤 | 操作 | 预期结果 |
| --- | --- | --- |
| 1 | 打开页面 | 展示多条 `community.*` 配置项及说明 |
| 2 | 查看「社区首页 Tab 轻配置」 | 只读展示 Tab 名称与状态 |
| 3 | 修改 `community.interaction_gate_mode` | 建议保持 `LOGIN_ONLY`（三项认证未落地时不要改为 `FULL_CERT`） |
| 4 | 修改数值类配置（如图片上限、文字长度） | 输入框可编辑（需 `community:config:edit`） |
| 5 | 点击 **保存配置** | Toast「社区配置已保存」，刷新后值保留 |
| 6 | 无编辑权限账号 | 输入框 disabled，无保存按钮 |

**记录**：□ 通过　□ 失败　备注：__________

---

### 5.3 内容审核（动态 / 诚意贴）

**路径**：`/community/posts`

| 步骤 | 操作 | 预期结果 |
| --- | --- | --- |
| 1 | 打开页面 | 标题「内容审核」，筛选区：关键词、内容类型、审核状态 |
| 2 | 无数据 | 「暂无数据」 |
| 3 | 有数据（见附录 A） | 列表展示作者、类型、摘要、话题、赞/评/举报数、状态、审核状态 |
| 4 | 筛选 **待审核** | 仅 PENDING 记录 |
| 5 | 筛选类型 `community` / `sincere_post` | 分类正确 |
| 6 | 点击 **审核** | 弹窗：通过 / 驳回 + 可选说明 |
| 7 | 提交 **审核通过** | 审核状态 APPROVED，内容状态 PUBLISHED，列表刷新 |
| 8 | 对另一条 **审核驳回** | 审核 REJECTED，内容 REJECTED |
| 9 | 无 `community:post:audit` 权限 | 操作列显示 `-` |

**记录**：□ 通过　□ 失败　备注：__________

---

### 5.4 评论审核

**路径**：`/community/comments`

| 步骤 | 操作 | 预期结果 |
| --- | --- | --- |
| 1 | Tab 切换到评论审核 | URL 为 `/community/comments` |
| 2 | 搜索评论内容 + 审核状态筛选 | 查询/重置正常 |
| 3 | **审核通过** | 评论 audit_status=APPROVED |
| 4 | **审核驳回** | 评论 audit_status=REJECTED |

**记录**：□ 通过　□ 失败　备注：__________

---

### 5.5 举报处理

**路径**：`/community/reports`

| 步骤 | 操作 | 预期结果 |
| --- | --- | --- |
| 1 | 筛选目标类型 post / comment / user | 下拉正常 |
| 2 | 筛选状态 PENDING | 待处理举报 |
| 3 | 点击 **处理** | 弹窗：处理状态、处理动作、说明 |
| 4 | 动作 **驳回举报** DISMISS | 举报单 RESOLVED 或 REJECTED（以接口为准） |
| 5 | 动作 **下架动态** BLOCK_POST | 对应动态 status=BLOCKED |
| 6 | 动作 **屏蔽评论** BLOCK_COMMENT | 对应评论 BLOCKED |

**记录**：□ 通过　□ 失败　备注：__________

---

### 5.6 Tab 与路由

| 步骤 | 预期 |
| --- | --- |
| 内容审核 → 评论审核 → 举报处理 → 社区配置 | 每次切换 URL 路径正确，页面标题对应 |

**记录**：□ 通过　□ 失败

---

### 5.7 PRD-05 权限（可选）

无社区审核权限角色：审核/处理按钮为 `-`，配置不可保存。

**记录**：□ 通过　□ 失败　□ 跳过

---

## 6. 验收检查总表

复制下表填写验收人、日期、结论。

### 6.1 PRD-04

| 编号 | 验收项 | 结果 | 验收人 | 日期 | 备注 |
| --- | --- | --- | --- | --- | --- |
| P04-01 | VIP 权益 CRUD + 启停 | | | | |
| P04-02 | VIP 套餐 CRUD + 启停 | | | | |
| P04-03 | 成家币套餐 CRUD + 启停 | | | | |
| P04-04 | 订单管理列表/筛选/详情 | | | | |
| P04-05 | 流水管理列表/筛选 | | | | |
| P04-06 | 退款管理（含 UI 缺陷记录） | | | | |
| P04-07 | 财务中心 Tab 切换 | | | | |
| P04-08 | 权限隔离（可选） | | | | |

### 6.2 PRD-05

| 编号 | 验收项 | 结果 | 验收人 | 日期 | 备注 |
| --- | --- | --- | --- | --- | --- |
| P05-01 | 字典 community_topic / report_reason | | | | |
| P05-02 | 社区配置查看与保存 | | | | |
| P05-03 | 内容审核通过/驳回 | | | | |
| P05-04 | 评论审核通过/驳回 | | | | |
| P05-05 | 举报处理（含下架/屏蔽） | | | | |
| P05-06 | 社区 Tab 路由切换 | | | | |
| P05-07 | 权限隔离（可选） | | | | |

**结果填写**：通过 / 失败 / 跳过 / 阻塞

---

## 7. 自动化辅助（仅后台接口与 E2E）

不打开浏览器时，可跑 L1 脚本覆盖后台 API（小程序段可忽略）：

```bash
# PRD-04 后台段（无需 MINIAPP_TOKEN）
API_URL=http://localhost:8080 \
ADMIN_USERNAME=admin \
ADMIN_PASSWORD=admin123 \
bash docs/测试文档/商业化-test-l1.sh

# PRD-05 后台段（脚本前半段不依赖 MINIAPP_TOKEN）
API_URL=http://localhost:8080 \
ADMIN_USERNAME=admin \
ADMIN_PASSWORD=admin123 \
bash docs/测试文档/社区互动-PRD05-test-l1.sh
```

Playwright（需前端已启动）：

```bash
cd frontend/e2e-tests
BASE_URL=http://localhost:5173 API_URL=http://localhost:8080 \
npx playwright test tests/commercial.spec.ts --project=chromium

BASE_URL=http://localhost:5173 API_URL=http://localhost:8080 \
npx playwright test tests/community.spec.ts --project=chromium
```

---

## 8. 本期后台未实现（勿判为验收失败项）

对照 PRD 全文，以下能力**不在当前管理后台页面**，验收时标注为「后续」即可：

| 能力 | PRD 描述 | 当前替代方式 |
| --- | --- | --- |
| 用户详情 — 商业化 Tab | 会员订单、流水、解锁记录 | 财务中心按用户 ID 查 |
| 用户详情 — 社区 Tab | 动态、评论、举报记录 | 社区各审核列表按作者筛选 |
| 财务日统计页面 | 按日 VIP/币/退款统计 | 仅 API `GET /admin/finance/stats/daily` |
| 微信内容机审 | 发布先过机审 | 纯人工审核 |
| 审核/互动通知 | 通知中心下发 | PRD-03 未接入 |
| 三项认证准入 | `FULL_CERT` 模式 | 保持 `LOGIN_ONLY` |

---

## 附录 A：无小程序时的测试数据（SQL 造数）

仅验收 **内容/评论/举报审核** 且库中无数据时，可在测试库执行（`author_id` / `reporter_id` 改为你们已有的 `app_user.id`）：

```sql
-- 1. 待审核社区动态
INSERT INTO community_post (author_id, post_type, content, topic_id, status, audit_status)
VALUES (1, 'community', '【验收】待审核社区动态', 1, 'PENDING', 'PENDING');

-- 2. 待审核诚意贴
INSERT INTO community_post (author_id, post_type, title, content, topic_id, status, audit_status)
VALUES (1, 'sincere_post', '诚意贴标题', '【验收】诚意贴正文超过二十字用于测试审核流程', 1, 'PENDING', 'PENDING');

-- 3. 待审核评论（post_id 用上一步插入后的 id）
INSERT INTO community_comment (post_id, author_id, content, status, audit_status)
VALUES (1, 2, '【验收】待审核评论', 'PUBLISHED', 'PENDING');

-- 4. 待处理举报（target_id 对应 post_id）
INSERT INTO community_report (reporter_id, target_type, target_id, reason_code, status)
VALUES (2, 'post', 1, 'spam', 'PENDING');
```

执行后刷新 **内容审核 / 评论审核 / 举报处理** 页面即可做 5.3–5.5 的 B 层验收。

订单/流水无小程序时：可暂时只验 **空列表 + 筛选 UI**；有交易数据需求时再导入 `trade_order` / `user_coin_log` 或等小程序联调。

---

## 附录 B：接口快验（UI 异常时）

### B.1 管理员登录

```bash
curl -s -X POST http://localhost:8080/admin/login \
  -H "Content-Type: application/json" \
  -d '{"account":"admin","password":"admin123"}'
```

取响应 `data.token` 作为 `TOKEN`。

### B.2 处理退款（订单须为 success）

```bash
curl -s -X PUT "http://localhost:8080/admin/finance/orders/{orderId}/refund" \
  -H "X-Auth-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"refundReason":"管理后台验收-特批退款"}'
```

### B.3 内容审核

```bash
curl -s -X PUT "http://localhost:8080/admin/community/posts/{postId}/audit" \
  -H "X-Auth-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"auditStatus":"APPROVED","auditRemark":"验收通过"}'
```

---

## 9. 验收结论模板

```
验收范围：管理后台 PRD-04 + PRD-05（无小程序）
验收环境：前端 ______  后端 ______  数据库 ______
验收人：______
验收日期：______

PRD-04：共 __ 项，通过 __，失败 __，跳过 __
PRD-05：共 __ 项，通过 __，失败 __，跳过 __

阻塞问题：
1.
2.

建议：
1.
2.

总体结论：□ 可发布  □ 有条件通过  □ 不通过
```

---

*文档维护：功能变更时请同步更新路由、权限码与检查表。*
