---
name: techni-design
description: >-
  Spacetime 成家立业项目专用技术方案设计：基于现有需求文档、架构规范和代码结构，
  输出可实施的技术方案文档（tcdesign.md），覆盖管理后台后端、小程序后端、React 管理后台前端、
  数据库、权限、接口、测试与交付清单。触发场景：用户说“技术方案/方案设计/架构设计/
  technical design/出个方案/实施方案/落地方案/tcdesign”。本 skill 仅适用于 spacetime 仓库。
---

# Spacetime 技术方案设计

本 skill 用于把需求转成可落地的技术方案，不直接写代码。若用户要求“开发/实现/修 bug”，先判断是否已有清晰方案；没有方案时先产出 tcdesign。

## 产出物

技术方案统一写到：

`docs/技术方案/{yyyy-mm-dd}-{功能名称}-tcdesign.md`

若目录不存在则创建。不要写到隐藏目录、临时 plan、聊天摘要或旧项目目录。

## 必读上下文

按需读取，避免一次性塞满上下文：

1. 项目总规范：`AGENTS.md`、`TEAM_STANDARDS.md`
2. 架构文档：`docs/superpowers/specs/2026-05-09-chengjialiye-architecture-design.md`
3. 需求文档：
   - 移动端：`docs/需求文档/移动端/`
   - 管理后台：`docs/需求文档/管理后台/`
   - 甲方资料与阻塞项：`docs/相关资料/`
4. 已有测试规范与报告：`docs/测试文档/`
5. 当前代码：
   - 后端：`backend/src/main/java/com/spacetime/`
   - 后端 SQL：`backend/docs/sql/`
   - 管理后台前端：`frontend/src/`

需求涉及量表、推荐算法、推广、商业化等模块时，优先读取对应 PRD 与 `docs/相关资料/` 下的梳理/阻塞清单。

特别约束：后续任何技术方案只要涉及注册登录、用户资料、三项认证、成家币、VIP/支付、通知、OSS、小程序码，必须读取 `docs/技术方案/2026-05-22-推广裂变与邀请奖励-tcdesign.md` 的“10.1 跨 PRD 联调契约与反向约束 / 10.2 其他 PRD 技术方案编写要求”，并在新方案中增加“PRD-07 推广裂变联动影响”小节。

## 核心原则

- 不确定就停下来问：需求边界、字段语义、状态流转、权限、计费、算法口径、第三方资料缺失时，不要写“假设”糊过去。
- 先找现有机制：优先复用当前单体架构、六层分层、RBAC、字典管理、Token 鉴权、统一返回体、现有 UI 组件和 API 封装。
- 单体优先：本项目暂不引入微服务、消息队列、Spring Security、复杂工作流引擎，除非用户明确要求。
- 方案是设计，不是代码实现：用表格、流程图、字段清单、变更清单表达；不要贴大段 Java/TSX/SQL 实现。
- 甲方未给资料时必须暴露阻塞项，尤其是小程序端、算法、支付/退款、认证、量表版权/题库/计分规则等。

## 工作流

复制并维护此 checklist：

```markdown
Technical Design:
- [ ] Step 1: 明确需求目标、范围和成功标准
- [ ] Step 2: 读取项目规范、PRD、阻塞清单和相关代码
- [ ] Step 3: 梳理现状调用链、数据模型、权限和前端入口
- [ ] Step 3.5: Decision Gate，列出歧义/矛盾/多方案，等待用户拍板
- [ ] Step 4: 设计技术方案和取舍
- [ ] Step 5: 生成 tcdesign 文档
- [ ] Step 6: 自检方案完整性
```

## Step 1：需求澄清

至少确认：

| 维度 | 必答问题 |
|------|----------|
| 业务目标 | 解决什么问题，谁使用，成功标准是什么 |
| 端范围 | 管理后台、后端、小程序 API、独立小程序前端是否都涉及 |
| 角色权限 | 管理员、角色、按钮权限、小程序用户身份边界 |
| 数据来源 | 表结构、甲方资料、第三方接口、算法输入输出是否已明确 |
| 交付边界 | 仅方案、方案+测试计划、还是后续要按方案开发 |

## Step 2：项目约束

方案必须符合 Spacetime 当前架构：

| 层面 | 项目约束 |
|------|----------|
| 后端 | Java 21、Spring Boot 3.4、MyBatis-Plus 3.5、MySQL 8、Redis 7、Hutool、Knife4j、阿里云 OSS |
| 包结构 | `common/` 公共模块，`admin/` 管理后台，`miniapp/` 小程序后端；`admin` 与 `miniapp` 不互相 import |
| 分层 | `Controller → Service → ServiceImpl → DAO → DAOImpl → Mapper`，每层只调用紧邻下一层 |
| 返回 | Controller 精确返回 `R<T>`，禁止 `R<?>` |
| 鉴权 | Header 使用 `X-Auth-Token`；后台 token 前缀 `admin:token:`，小程序 token 前缀 `miniapp:token:` |
| 权限 | 后台接口按现有 RBAC 与 `@RequirePermission` / `PermissionInterceptor` 设计 |
| 数据库 | 所有业务表包含 `id/create_time/update_time/created_by/updated_by/deleted`；逻辑删除；实体继承 `BaseEntity` |
| 前端 | React 18 + TypeScript + Vite + Tailwind + shadcn/ui + Zustand；API 统一放 `frontend/src/api/` |
| 测试 | 测试产物放 `docs/测试文档/`；后端 Maven/JUnit，前端 Playwright |

## Step 3：代码与文档探索

优先用 `rg`/`rg --files`：

```bash
rg "关键词" docs/需求文档 docs/相关资料
rg "关键词|Permission|RequirePermission|X-Auth-Token" backend/src/main/java/com/spacetime
rg "关键词|route|permission|axios" frontend/src
rg --files backend/docs/sql frontend/src/api frontend/src/pages
```

必须识别：

- 后端入口：Controller 路径、Method、入参 DTO、出参 VO、权限注解
- 业务链路：Service/ServiceImpl/DAO/DAOImpl/Mapper/XML，每一步职责是否符合六层规范
- 数据模型：相关表、实体、枚举、索引、逻辑删除、审计字段
- 前端入口：路由、菜单、权限按钮、页面组件、API 模块、Zustand store
- 认证与权限：是否需要新增菜单、按钮权限、接口权限、角色授权
- 现有相似实现：优先参考用户管理、角色管理、菜单管理、字典管理
- 跨 PRD 影响：涉及注册登录、资料、认证、成家币、支付、通知、OSS、小程序码时，必须检查 PRD-07 推广裂变联动契约，明确是否触发推广事件、事件幂等键、失败策略和测试覆盖

## Step 3.5：Decision Gate

代码/文档分析完成后、写方案前，必须把不确定项一次性列给用户。

```markdown
分析阶段发现以下问题，需要确认后再继续：

🔴 必须确认
1. {需求缺失或矛盾，说明为什么阻塞}
2. {字段/状态/计费/算法口径无法唯一推导}

🟡 建议确认
3. {方案 A/B/C 的选择，各自影响}

🟢 风险提醒
4. {不阻塞，但需在方案中记录的风险}
```

规则：

- 🔴 和 🟡 都是阻塞项，未确认不得进入最终方案。
- 不要把未确认内容写成“默认假设”。
- 用户拍板后，在 tcdesign 的“关键决策”中记录来源。

## Step 4：方案设计

至少给出三个粒度，除非需求非常小：

| 方案 | 用途 |
|------|------|
| 最小改动 | 复用现有表、接口、页面和权限，最快可交付 |
| 平衡方案 | 适度新增表/接口/页面，兼顾扩展性和周期 |
| 完整方案 | 支持更复杂运营、审计、配置、算法或商业化闭环 |

选择方案时优先考虑：

1. 是否能复用现有六层结构和 RBAC。
2. 是否能避免新增复杂基础设施。
3. 是否覆盖管理后台和小程序 API 的边界。
4. 数据是否有明确来源、去向和生命周期。
5. 另一个 agent 是否能按文档直接实现。

## tcdesign 文档模板

```markdown
# {功能名称} 技术方案设计

> 日期：{yyyy-mm-dd}
> 关联需求：
> - `docs/需求文档/...`
> - `docs/相关资料/...`

## 1. 背景与目标

## 2. 范围

| 模块 | 是否涉及 | 说明 |
|------|----------|------|
| 管理后台前端 | 是/否 | |
| 管理后台后端 | 是/否 | |
| 小程序后端 | 是/否 | |
| 小程序前端 | 是/否 | 本仓库不包含，需输出接口约定 |
| 数据库 | 是/否 | |
| 算法/第三方 | 是/否 | |

## 3. 关键决策与待确认项

| 类型 | 内容 | 决策/状态 | 来源 |
|------|------|-----------|------|

## 4. 总体架构与调用链

用文本流程图描述，例如：

管理后台页面
  → frontend/src/api/{module}.ts
  → POST /admin/{module}/...
  → {Controller}.{method}()
  → {Service}.{method}()
  → {ServiceImpl}.{method}()
  → {Dao}.{method}()
  → {Mapper/XML}
  → MySQL/Redis/OSS

## 5. 后端设计

### 5.1 接口清单

| 功能 | URL | Method | 权限码 | 入参 | 出参 | 备注 |
|------|-----|--------|--------|------|------|------|

### 5.2 DTO/VO 字段

| 对象 | 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|------|

### 5.3 Service/DAO 设计

| 层 | 类/接口 | 方法 | 职责 |
|----|---------|------|------|

## 6. 数据库设计

### 6.1 表结构变更

只写必要 DDL 或字段表；必须说明索引、逻辑删除、审计字段。

### 6.2 状态/枚举

| 枚举 | 值 | 含义 | 流转规则 |
|------|----|------|----------|

## 7. 前端设计

### 7.1 页面与路由

| 页面 | 路由 | 权限 | 说明 |
|------|------|------|------|

### 7.2 交互流程

#### 流程 1：{流程名称}

**入口**：{页面/按钮/菜单}
**权限**：{权限码或无}
**组件/API**：`frontend/src/pages/...`、`frontend/src/api/...`

**正常流：**
1. 用户...
2. 系统...

**异常/边界：**
- 无权限 → ...
- 空数据 → ...
- 接口失败 → ...

## 8. 权限与安全

| 项 | 设计 |
|----|------|
| Token | `X-Auth-Token` |
| 后台权限 | 菜单/按钮/API 权限 |
| 数据权限 | |
| 敏感信息 | |

## 9. 测试方案

| 层级 | 覆盖内容 | 产物 |
|------|----------|------|
| L1 cURL | 接口冒烟、鉴权、参数校验 | `docs/测试文档/{模块}-test-l1.sh` |
| L2 MockMvc | Controller 路由/注解 | `backend/src/test/...` |
| L3 JUnit | Service 规则/状态流转 | `backend/src/test/...` |
| L4 Playwright | 前端核心流程 | `frontend/e2e-tests/tests/...` |

## 10. 变更文件清单

| 类型 | 文件路径 | 新增/修改 | 说明 |
|------|----------|-----------|------|

## 11. 风险与回滚

## 12. 实施顺序
```

若方案涉及注册登录、用户资料、三项认证、成家币、VIP/支付、通知、OSS、小程序码，必须额外增加：

```markdown
## PRD-07 推广裂变联动影响

| 项 | 设计 |
|----|------|
| 是否触发推广事件 | 是/否，说明原因 |
| 触发事件 | `register_login_reward/profile_complete_reward/verify_complete_reward/first_vip_reward/first_coin_recharge_reward/...` |
| 幂等键 | `userId + eventType + bizNo` 或等价字段 |
| 失败策略 | 是否影响主流程、是否重试/补偿/人工处理 |
| 关联数据 | 是否关联 `promotion_reward_log`、`promotion_agent_event`、`promotion_agent_bonus_log` |
| 测试覆盖 | 跨模块用例与验收点 |
```

## 质量检查

交付前逐项自检：

- [ ] 已读取 `TEAM_STANDARDS.md` 和相关 PRD/阻塞清单
- [ ] 没有引用其他项目名称、目录、RPC、MQ、Angular、Dubbo 等非 Spacetime 约定
- [ ] 后端方案遵守六层调用，不让 ServiceImpl 直连 Mapper
- [ ] `admin/` 与 `miniapp/` 没有互相依赖
- [ ] 接口返回为 `R<T>`，时间字段按 `yyyy-MM-dd HH:mm:ss`
- [ ] 数据库包含基础审计字段、逻辑删除、索引说明
- [ ] 权限、菜单、按钮、Token、401/403 行为已说明
- [ ] 前端 API、路由、页面、状态管理和异常/空态已说明
- [ ] 小程序前端不在本仓库时，已明确只输出 API 契约和联调要求
- [ ] 涉及注册登录、资料、认证、成家币、支付、通知、OSS、小程序码时，已读取 PRD-07 技术方案第 10.1/10.2 节，并写入“PRD-07 推广裂变联动影响”
- [ ] 测试覆盖 L1-L4 的取舍理由明确
- [ ] 所有 🔴/🟡 待确认项已得到用户确认或仍在文档中标为阻塞，未伪装成假设

## 常见反模式

| 反模式 | 正确做法 |
|--------|----------|
| 引入旧项目 Dubbo/MQ/Angular 约定 | 改为 Spacetime 单体、HTTP Controller、React |
| 直接写完整 Java/TSX 实现 | 改为接口表、字段表、流程图、变更清单 |
| 新建表前不查现有表 | 先查实体、Mapper、SQL、PRD 核心表清单 |
| ServiceImpl 直接调用 Mapper | 补 DAO/DAOImpl 设计 |
| 忽略小程序端独立项目边界 | 本仓库只设计小程序后端 API 和联调契约 |
| 缺少权限设计 | 明确菜单/按钮/API 权限码、401/403 行为 |
| 算法/量表口径自行脑补 | 读取相关资料，缺失时列为阻塞项 |
