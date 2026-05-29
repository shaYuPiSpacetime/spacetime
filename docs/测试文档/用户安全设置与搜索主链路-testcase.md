# 用户安全设置与搜索主链路 - 测试用例

> **关联文档**：
> - 技术方案：`docs/技术方案/2026-05-29-PRD-06用户安全设置与搜索主链路-tcdesign.md`
> - 移动端 PRD：`docs/需求文档/移动端/细化PRD-06_认证与安全设置、我的页与搜索.md`
> - 管理后台 PRD：`docs/需求文档/管理后台/管理后台细化PRD-06_认证与安全设置、我的页与搜索.md`
> - 测试报告：`docs/测试文档/用户安全设置与搜索主链路-testreport.md`
>
> **创建日期**：2026-05-29
> **测试模式**：完整模式
> **目标项目**：后端 `backend/` / 前端 `frontend/`

---

## 1. 测试策略决策

### 后端评估

| 维度 | 评估结果 | 得分 |
|------|----------|------|
| A 新增/修改接口数 | 小程序我的页、设置、屏蔽、关键词、反馈、注销、搜索约 22 个接口；后台用户安全、反馈、注销约 12 个接口 | 2 |
| B 状态流转逻辑 | 注销申请存在 `COOLING_OFF/REVOKED/CANCELLED/BLOCKED` 状态机；反馈处理有状态变更；屏蔽关系有启用/解除 | 2 |
| C 纯计算/规则逻辑 | 默认设置初始化、隐私/通知 upsert、屏蔽幂等、关键词数量/长度、搜索违规词和结果过滤、注销阻断校验 | 2 |
| D 数据关联复杂度 | 用户、认证、入口配置、设置、屏蔽关系、关键词、反馈、注销、搜索日志、审计、多 PRD 占位数据 | 2 |
| E 老代码影响范围 | 复用公共内容配置、搜索热词/违规词、RBAC、用户详情页，并为 PRD-01/03/04/05/08 预留联动 | 2 |
| F 安全变更 | 新增后台权限码；小程序写接口必须从 token 取 `userId`；涉及隐私、注销、反馈等敏感能力 | 1 |
| **总分** |  | **11 → L1 + L2 + L3** |

### 前端评估

| 条件 | 命中 | 说明 |
|------|------|------|
| G 多角色权限差异 | ✅ | 客服、运营、安全/风控、超级管理员权限不同 |
| H 复杂交互流程 | ✅ | 反馈处理弹窗、注销备注/阻断、用户详情安全 Tab 多区块加载 |
| I 多页面联动 | ✅ | 小程序提交反馈/注销后，后台列表与用户详情需可查 |
| J 核心业务页面 | ✅ | 设置、搜索、反馈、注销是用户安全主链路 |

**最终策略：L1 + L2 + L3 + 手动 + L4**

> 当前仅生成测试用例设计，不生成脚本、不执行测试。小程序前端不在本仓库内，移动端交互以手动/联调用例记录；后台前端纳入 L4。PRD-01/03/04/05/08 依赖能力在本用例中标为“联动前置/后续联调”。

## 2. 测试数据准备

| 数据需求 | 用途 | 如何准备 | 是否幂等 |
|----------|------|----------|----------|
| 小程序用户 A Token | 我的页、设置、屏蔽、反馈、注销、搜索主流程 | 执行前从登录链路或 `frontend/e2e-tests/.env` 获取 | 是 |
| 小程序用户 B | 黑名单/不看 TA 动态目标用户、搜索结果候选 | 通过测试环境已有用户或注册链路准备 | 是 |
| 小程序用户 C | 搜索结果过滤、越权删除验证 | 通过测试环境已有用户或注册链路准备 | 是 |
| 客服 Token | 用户安全摘要、反馈列表只读验证 | 创建具备 `user:security:view`、`user:feedback:list` 的角色 | 是 |
| 运营 Token | 反馈处理、注销列表查看 | 创建具备 `user:security:view`、`user:feedback:list`、`user:feedback:handle`、`user:cancel:list` 的角色 | 是 |
| 安全/风控 Token | 注销申请查看与备注/阻断 | 创建具备 `user:security:view`、`user:cancel:list`、`user:cancel:handle` 的角色 | 是 |
| 低权限后台 Token | 后台 403 权限测试 | 创建无 PRD-06 权限码的角色 | 是 |
| `app_config` 默认项 | 隐私/通知默认值、关键词上限、注销后悔期 | 使用后台参数或 SQL fixture 准备 | 是 |
| 搜索违规词 `SEARCH_VIOLATION` | 整体拦截搜索 | 复用第一阶段搜索屏蔽词配置 | 是 |
| 搜索结果屏蔽词 `RESULT_BLOCK` | 搜索结果行过滤 | 复用第一阶段搜索屏蔽词配置 | 是 |
| 移动端入口配置 | 我的页、设置页 entries 回显 | 复用 `mobile_entry_config` 测试数据 | 是 |
| 反馈记录 | 后台反馈列表、详情、处理状态 | 小程序接口提交或 SQL fixture | 否 |
| 注销申请记录 | 后台注销列表、详情、备注 | 小程序接口提交或 SQL fixture | 否 |
| PRD-01 认证状态 | 我的页/认证中心聚合展示 | 未完成前用 Mock/fixture，占位字段必须返回 | 是 |
| PRD-03/04/05/08 数据 | 通知、资产、社区、推荐联动验证 | 对应模块完成后联调；当前只验证本模块不写入 | 是 |

## 3. L1 - 接口测试用例

> 本章节描述“测什么”，不含 cURL 脚本。可执行脚本后续派生到 `docs/测试文档/用户安全设置与搜索主链路-test-l1.sh`。

### 3.1 小程序我的页与设置聚合

| 用例ID | 优先级 | 场景 | 接口 | 前置条件 | 数据来源 | 期望结果 | 验证方式 |
|--------|--------|------|------|----------|----------|----------|----------|
| F1-P0-01 | P0 | 获取我的页聚合 | `GET /miniapp/profile/home` | 用户 A 已登录 | 小程序 Token | 返回用户摘要、资料完成度、认证状态、入口配置；`vipStatus/coinBalance` 可为 null 但字段存在 | 响应断言 |
| F1-P0-02 | P0 | 获取认证中心聚合 | `GET /miniapp/profile/certification-center` | 用户 A 已登录 | 小程序 Token | 返回实名、头像、学历三项认证状态；不修改认证状态 | 响应断言 |
| F1-P0-03 | P0 | 获取设置页聚合 | `GET /miniapp/settings/home` | 用户 A 已登录 | 小程序 Token | 返回 `phoneBindStatus`、`wechatBindStatus`、`entries`、`currentVersion` | 响应断言 |
| F1-P1-01 | P1 | 我的页入口配置为空 | `GET /miniapp/profile/home` | 对应入口配置停用 | 配置 fixture | 返回空 entries 或默认空态，不报错 | 响应断言 |
| F1-P1-02 | P1 | 认证状态缺失占位 | `GET /miniapp/profile/certification-center` | PRD-01 认证记录不存在 | 用户 fixture | 返回未认证/待完善状态，不 500 | 响应断言 |
| F1-P3-01 | P3 | 未登录访问我的页 | `GET /miniapp/profile/home` | 无 Token | 无需数据 | 返回 401 | HTTP 状态断言 |

### 3.2 隐私与通知设置

| 用例ID | 优先级 | 场景 | 接口 | 前置条件 | 数据来源 | 期望结果 | 验证方式 |
|--------|--------|------|------|----------|----------|----------|----------|
| F2-P0-01 | P0 | 首次查询隐私设置 | `GET /miniapp/settings/privacy` | 用户 A 无设置记录 | 新用户 fixture | 按 `app_config` 默认值返回，并可初始化记录 | 查询记录/响应断言 |
| F2-P0-02 | P0 | 保存隐私设置 | `PUT /miniapp/settings/privacy` | 用户 A 已登录 | 构造请求 | 返回成功，设置表 upsert，写安全审计 | 重新查询验证状态 |
| F2-P0-03 | P0 | 首次查询通知设置 | `GET /miniapp/settings/notifications` | 用户 A 无通知设置记录 | 新用户 fixture | 按默认通知开关返回 | 响应断言 |
| F2-P0-04 | P0 | 保存通知设置 | `PUT /miniapp/settings/notifications` | 用户 A 已登录 | 构造请求 | 返回成功，通知设置 upsert，不直接生成/删除通知 | 重新查询 + 联动断言 |
| F2-P1-01 | P1 | 部分字段更新隐私设置 | `PUT /miniapp/settings/privacy` | 已有隐私设置 | 构造只含部分字段请求 | 未传字段保持原值 | 重新查询验证状态 |
| F2-P1-02 | P1 | 部分字段更新通知设置 | `PUT /miniapp/settings/notifications` | 已有通知设置 | 构造只含部分字段请求 | 未传字段保持原值 | 重新查询验证状态 |
| F2-P2-01 | P2 | 隐私设置字段类型非法 | `PUT /miniapp/settings/privacy` | 用户 A 已登录 | 非布尔值/非法 JSON | 返回参数错误，原设置不变 | 响应断言 + 重新查询 |
| F2-P3-01 | P3 | 请求体携带他人 userId | `PUT /miniapp/settings/privacy` | 用户 A 登录，body 传用户 B id | 构造越权请求 | 只更新 token 用户 A，不影响用户 B | 分别查询 A/B 设置 |
| F2-P3-02 | P3 | 未登录保存通知设置 | `PUT /miniapp/settings/notifications` | 无 Token | 无需数据 | 返回 401 | HTTP 状态断言 |

### 3.3 黑名单与不看 TA 动态

| 用例ID | 优先级 | 场景 | 接口 | 前置条件 | 数据来源 | 期望结果 | 验证方式 |
|--------|--------|------|------|----------|----------|----------|----------|
| F3-P0-01 | P0 | 加入黑名单 | `POST /miniapp/settings/blocks/blacklist` | 用户 A、B 存在 | 自构建用户 | 返回屏蔽关系 id，`blockType=BLACKLIST` 生效 | 查询黑名单列表 |
| F3-P0-02 | P0 | 查询黑名单列表 | `GET /miniapp/settings/blocks/blacklist` | 存在黑名单记录 | 链式 | 分页返回目标用户信息和来源场景 | 响应断言 |
| F3-P0-03 | P0 | 解除黑名单 | `DELETE /miniapp/settings/blocks/blacklist/{id}` | 黑名单记录存在 | 链式 | 记录失效或逻辑删除，不恢复历史关系 | 重新查询验证状态 |
| F3-P0-04 | P0 | 加入不看 TA 动态 | `POST /miniapp/settings/blocks/hidden-dynamics` | 用户 A、B 存在 | 自构建用户 | 返回屏蔽关系 id，`blockType=HIDDEN_DYNAMIC` 生效 | 查询动态屏蔽列表 |
| F3-P0-05 | P0 | 移除不看 TA 动态 | `DELETE /miniapp/settings/blocks/hidden-dynamics/{id}` | 动态屏蔽记录存在 | 链式 | 记录失效或逻辑删除 | 重新查询验证状态 |
| F3-P1-01 | P1 | 重复加入同一黑名单 | `POST /miniapp/settings/blocks/blacklist` | A 已拉黑 B | 链式重复请求 | 幂等返回已有 id 或成功，不产生重复有效记录 | 查询记录数量 |
| F3-P1-02 | P1 | 同一目标分别加入两类屏蔽 | 两个 POST 接口 | 用户 A、B 存在 | 自构建用户 | 黑名单和动态屏蔽作为不同 `blockType` 独立存在 | 查询两类列表 |
| F3-P2-01 | P2 | 拉黑自己 | `POST /miniapp/settings/blocks/blacklist` | 用户 A 登录 | targetUserId=A | 返回业务错误，不创建记录 | 响应断言 + 查询 |
| F3-P2-02 | P2 | 删除不存在的屏蔽关系 | `DELETE /miniapp/settings/blocks/blacklist/999999999` | 用户 A 登录 | 固定值 | 返回业务错误或幂等成功，不能影响他人数据 | 响应断言 |
| F3-P3-01 | P3 | 删除他人的屏蔽关系 | `DELETE /miniapp/settings/blocks/blacklist/{id}` | 记录属于用户 C | fixture | 返回无权限/不存在，不删除用户 C 记录 | 查询用户 C 记录 |

### 3.4 个人关键词屏蔽

| 用例ID | 优先级 | 场景 | 接口 | 前置条件 | 数据来源 | 期望结果 | 验证方式 |
|--------|--------|------|------|----------|----------|----------|----------|
| F4-P0-01 | P0 | 新增个人关键词 | `POST /miniapp/settings/keyword-blocks` | 用户 A 已登录 | 构造关键词 | 返回关键词 id，列表可查 | 查询关键词列表 |
| F4-P0-02 | P0 | 查询个人关键词列表 | `GET /miniapp/settings/keyword-blocks` | 存在关键词 | 链式 | 返回当前用户关键词，不包含他人 | 响应断言 |
| F4-P0-03 | P0 | 删除个人关键词 | `DELETE /miniapp/settings/keyword-blocks/{id}` | 关键词存在 | 链式 | 删除成功，列表不再返回 | 重新查询验证状态 |
| F4-P1-01 | P1 | 重复新增同一关键词 | `POST /miniapp/settings/keyword-blocks` | 用户 A 已有该关键词 | 链式重复请求 | 返回幂等成功或业务错误，不产生重复有效记录 | 查询记录数量 |
| F4-P2-01 | P2 | 超过关键词数量上限 | `POST /miniapp/settings/keyword-blocks` | 已达到 `app_config` 上限 | fixture | 返回业务错误，不新增 | 响应断言 |
| F4-P2-02 | P2 | 关键词过长或空白 | `POST /miniapp/settings/keyword-blocks` | 用户 A 已登录 | 空字符串/超长字符串 | 返回参数错误 | 响应断言 |
| F4-P1-02 | P1 | 关键词不影响搜索结果 | `GET /miniapp/search/results` | 用户 A 有个人关键词 | 链式 | 搜索结果不因个人关键词被整体拦截；社区生效由 PRD-05 联调验证 | 响应断言 |

### 3.5 反馈提交与后台处理接口

| 用例ID | 优先级 | 场景 | 接口 | 前置条件 | 数据来源 | 期望结果 | 验证方式 |
|--------|--------|------|------|----------|----------|----------|----------|
| F5-P0-01 | P0 | 小程序提交反馈 | `POST /miniapp/feedback` | 用户 A 已登录 | 构造内容和 OSS 图片 URL | 返回反馈 id，后台列表可查 | 后台详情查询 |
| F5-P0-02 | P0 | 后台查询反馈列表 | `GET /admin/user-security/feedback/list` | 存在反馈 | 客服/运营 Token | 分页返回反馈类型、用户、状态、提交时间 | 响应断言 |
| F5-P0-03 | P0 | 后台查询反馈详情 | `GET /admin/user-security/feedback/{id}` | 反馈存在 | 链式 | 返回内容、图片 URL、联系方式、处理信息 | 响应断言 |
| F5-P0-04 | P0 | 后台更新反馈状态 | `PUT /admin/user-security/feedback/{id}/status` | 反馈未处理 | 运营 Token | 状态更新成功，必须记录处理备注 | 详情查询 |
| F5-P1-01 | P1 | 按反馈类型和状态筛选 | `GET /admin/user-security/feedback/list` | 多类型反馈存在 | 自动查询 | 只返回匹配记录 | 响应断言 |
| F5-P2-01 | P2 | 反馈内容为空 | `POST /miniapp/feedback` | 用户 A 已登录 | 缺参请求 | 返回参数错误，不创建记录 | 响应断言 |
| F5-P2-02 | P2 | 图片 URL 超过 9 张或非 OSS URL | `POST /miniapp/feedback` | 用户 A 已登录 | 构造非法图片列表 | 返回参数错误 | 响应断言 |
| F5-P2-03 | P2 | 处理反馈不填备注 | `PUT /admin/user-security/feedback/{id}/status` | 反馈存在 | 运营 Token | 返回参数错误，状态不变 | 详情查询 |
| F5-P3-01 | P3 | 客服无处理权限 | `PUT /admin/user-security/feedback/{id}/status` | 客服仅有查看权限 | 客服 Token | 返回 403 | HTTP 状态断言 |

### 3.6 注销申请与退出登录

| 用例ID | 优先级 | 场景 | 接口 | 前置条件 | 数据来源 | 期望结果 | 验证方式 |
|--------|--------|------|------|----------|----------|----------|----------|
| F6-P0-01 | P0 | 查询无注销申请状态 | `GET /miniapp/account/cancel-status` | 用户 A 无有效申请 | 小程序 Token | 返回未申请状态、后悔期配置 | 响应断言 |
| F6-P0-02 | P0 | 提交注销申请进入后悔期 | `POST /miniapp/account/cancel` | 用户 A 无阻断项 | 构造 `confirm=true` | 返回申请 id，状态为 `COOLING_OFF`，`coolingEndTime` 正确 | 查询注销状态 |
| F6-P0-03 | P0 | 后悔期内撤销注销 | `POST /miniapp/account/cancel/revoke` | 用户 A 存在 `COOLING_OFF` 申请 | 链式 | 状态转为 `REVOKED` | 查询注销状态 |
| F6-P0-04 | P0 | 退出登录 | `POST /miniapp/logout` | 用户 A 已登录 | 小程序 Token | 当前 token 失效，后续需重新登录 | 再调需登录接口 |
| F6-P1-01 | P1 | 重复提交注销申请 | `POST /miniapp/account/cancel` | 已存在 `COOLING_OFF` 申请 | 链式重复请求 | 返回已有申请，不创建第二条有效记录 | 查询记录数量 |
| F6-P1-02 | P1 | 注销前置校验阻断 | `POST /miniapp/account/cancel` | 用户存在处罚/退款/争议/未到期 VIP 任一阻断 | fixture | 返回阻断原因，不创建 `COOLING_OFF` 记录 | 查询注销状态 |
| F6-P2-01 | P2 | 未勾选确认提交注销 | `POST /miniapp/account/cancel` | 用户 A 已登录 | `confirm=false` | 返回参数/业务错误，不创建申请 | 响应断言 |
| F6-P2-02 | P2 | 非后悔期撤销注销 | `POST /miniapp/account/cancel/revoke` | 状态为 `REVOKED/CANCELLED/BLOCKED` 或无申请 | fixture | 返回状态不允许 | 响应断言 |
| F6-P0-05 | P0 | 后台查询注销申请列表 | `GET /admin/user-security/cancel-requests/list` | 存在注销申请 | 运营/风控 Token | 分页返回状态、用户、申请时间、阻断原因 | 响应断言 |
| F6-P0-06 | P0 | 后台查询注销详情 | `GET /admin/user-security/cancel-requests/{id}` | 注销申请存在 | 链式 | 返回阻断项、后悔期、备注、状态历史 | 响应断言 |
| F6-P0-07 | P0 | 后台备注/阻断注销申请 | `PUT /admin/user-security/cancel-requests/{id}/remark` | 申请存在 | 风控 Token | 备注或阻断原因更新，写审计 | 详情查询 |
| F6-P3-01 | P3 | 运营无注销处理权限 | `PUT /admin/user-security/cancel-requests/{id}/remark` | 运营仅有列表权限 | 运营 Token | 返回 403 | HTTP 状态断言 |

### 3.7 搜索结果聚合

| 用例ID | 优先级 | 场景 | 接口 | 前置条件 | 数据来源 | 期望结果 | 验证方式 |
|--------|--------|------|------|----------|----------|----------|----------|
| F7-P0-01 | P0 | 搜索全部类型 | `GET /miniapp/search/results?keyword=xx&type=all` | 用户 A 已登录，存在候选用户 | 自动查询 | 返回 `keyword/type/tabs/items/hasMore/totalCount/violation=false` | 响应断言 |
| F7-P0-02 | P0 | 只搜用户 | `GET /miniapp/search/results?keyword=xx&type=user` | 存在昵称/学校/城市命中用户 | 自动查询 | 用户结果分页返回，过滤黑名单/封禁/隐私限制 | 响应断言 |
| F7-P0-03 | P0 | 命中搜索违规词 | `GET /miniapp/search/results?keyword=违规词` | 配置 `SEARCH_VIOLATION` | 配置 fixture | 返回 `violation=true` 和提示文案，不返回正常结果 | 响应断言 |
| F7-P1-01 | P1 | 命中结果屏蔽词 | `GET /miniapp/search/results?keyword=xx&type=user` | 候选用户昵称含 `RESULT_BLOCK` 词 | 配置 fixture | 该结果行被剔除，其他结果正常返回 | 响应断言 |
| F7-P1-02 | P1 | 搜索写日志 | `GET /miniapp/search/results` | 用户 A 已登录 | 构造关键词 | 写入 `app_user_search_log`，超长关键词被限制后记录 | 查询日志 |
| F7-P1-03 | P1 | 动态/话题未接 PRD-05 | `GET /miniapp/search/results?keyword=xx&type=post/topic` | PRD-05 表未落地 | 无需数据 | 返回空列表和配置空态，不 500 | 响应断言 |
| F7-P2-01 | P2 | 关键词为空 | `GET /miniapp/search/results?keyword=` | 用户 A 已登录 | 缺参请求 | 返回参数错误或空态，不能写污染日志 | 响应断言 |
| F7-P2-02 | P2 | 分页参数越界 | `GET /miniapp/search/results?page=-1&size=9999` | 用户 A 已登录 | 构造参数 | 返回参数错误或按最大分页限制处理 | 响应断言 |
| F7-P3-01 | P3 | 未登录搜索 | `GET /miniapp/search/results?keyword=xx` | 无 Token | 无需数据 | 返回 401 | HTTP 状态断言 |

### 3.8 后台用户安全详情

| 用例ID | 优先级 | 场景 | 接口 | 前置条件 | 数据来源 | 期望结果 | 验证方式 |
|--------|--------|------|------|----------|----------|----------|----------|
| F8-P0-01 | P0 | 查询用户安全摘要 | `GET /admin/user-security/users/{userId}/summary` | 用户存在 | 客服 Token | 返回隐私、通知、屏蔽、关键词、反馈、注销摘要 | 响应断言 |
| F8-P0-02 | P0 | 查询用户隐私设置 | `GET /admin/user-security/users/{userId}/privacy` | 用户存在 | 客服 Token | 返回只读隐私设置 | 响应断言 |
| F8-P0-03 | P0 | 查询用户通知设置 | `GET /admin/user-security/users/{userId}/notifications` | 用户存在 | 客服 Token | 返回只读通知设置 | 响应断言 |
| F8-P0-04 | P0 | 查询用户黑名单记录 | `GET /admin/user-security/users/{userId}/blacklist` | 用户存在黑名单 | 客服 Token | 分页返回屏蔽对象和状态 | 响应断言 |
| F8-P0-05 | P0 | 查询用户动态屏蔽记录 | `GET /admin/user-security/users/{userId}/hidden-dynamics` | 用户存在动态屏蔽 | 客服 Token | 分页返回屏蔽对象和状态 | 响应断言 |
| F8-P0-06 | P0 | 查询用户关键词记录 | `GET /admin/user-security/users/{userId}/keyword-blocks` | 用户存在关键词 | 客服 Token | 返回用户个人关键词 | 响应断言 |
| F8-P2-01 | P2 | 查询不存在用户 | `GET /admin/user-security/users/999999999/summary` | 有查看权限 | 固定值 | 返回业务错误或空摘要，不 500 | 响应断言 |
| F8-P3-01 | P3 | 无权限查看用户安全详情 | `GET /admin/user-security/users/{userId}/summary` | 低权限 Token | 自动查询 | 返回 403 | HTTP 状态断言 |

### 3.9 跨模块与非触发断言

| 用例ID | 优先级 | 场景 | 接口 | 前置条件 | 数据来源 | 期望结果 | 验证方式 |
|--------|--------|------|------|----------|----------|----------|----------|
| F9-P1-01 | P1 | 设置保存不触发推广事件 | `PUT /miniapp/settings/privacy` | 用户 A 有推广关系也可 | fixture/Mock | 不调用 `PromotionInviteEventService.handleInviteEvent` | L3 Mock 验证 |
| F9-P1-02 | P1 | 反馈提交不触发推广事件 | `POST /miniapp/feedback` | 用户 A 已登录 | 构造反馈 | 不调用推广事件，不写奖励流水 | L3 Mock/查询 |
| F9-P1-03 | P1 | 搜索不触发推荐算法 | `GET /miniapp/search/results` | 用户 A 已登录 | 构造关键词 | 只做轻量查询，不调用 PRD-08 推荐排序 | L3 Mock 验证 |
| F9-P1-04 | P1 | 个人关键词只影响社区 | `POST /miniapp/settings/keyword-blocks` | 用户 A 已登录 | 构造关键词 | 本模块只保存规则；PRD-05 社区列表后续读取生效 | 联动前置 |

## 4. L2 - Controller 测试用例

| 用例ID | 测试方法 | 验证点 | 期望 |
|--------|----------|--------|------|
| L2-01 | `MiniappProfileControllerTest.home_shouldRequireLoginAndReturnProfileVO` | 我的页路由、登录拦截、VO 字段 | 无 Token 401；有 Token 返回 `MiniappProfileHomeVO` |
| L2-02 | `MiniappProfileControllerTest.certificationCenter_shouldReturnReadonlyStatus` | 认证中心只读聚合 | 返回三项认证状态，不调用认证写服务 |
| L2-03 | `MiniappSettingControllerTest.settingsHome_shouldReturnBindStatusAndEntries` | 设置页聚合字段 | 返回 `phoneBindStatus/wechatBindStatus/entries/currentVersion` |
| L2-04 | `MiniappSettingControllerTest.privacyGet_shouldInitializeDefault` | 隐私设置首次查询 | Service 返回默认值，Controller 包装 `R<MiniappPrivacySettingVO>` |
| L2-05 | `MiniappSettingControllerTest.privacyPut_shouldIgnoreBodyUserId` | token 用户上下文 | Service 入参 userId 来自 token，不来自 body |
| L2-06 | `MiniappSettingControllerTest.notificationPut_shouldValidateBody` | 通知设置参数绑定 | 非法 body 返回参数错误 |
| L2-07 | `MiniappRelationBlockControllerTest.addBlacklist_shouldValidateTarget` | 黑名单新增入参 | 缺少 targetUserId 返回参数错误 |
| L2-08 | `MiniappRelationBlockControllerTest.deleteBlacklist_shouldBindPathId` | 黑名单删除路径参数 | path id 正确传入 Service |
| L2-09 | `MiniappKeywordBlockControllerTest.addKeyword_shouldValidateKeyword` | 关键词必填校验 | 空关键词返回参数错误 |
| L2-10 | `MiniappFeedbackControllerTest.submit_shouldValidateContentAndImages` | 反馈内容、图片数量校验 | 缺 content 或图片超限返回参数错误 |
| L2-11 | `MiniappAccountSecurityControllerTest.applyCancel_shouldValidateConfirm` | 注销确认标记校验 | `confirm=false` 返回业务错误 |
| L2-12 | `MiniappAccountSecurityControllerTest.logout_shouldRequireLogin` | 退出登录拦截 | 无 Token 返回 401 |
| L2-13 | `MiniappSearchResultControllerTest.search_shouldValidateKeywordAndPage` | 搜索参数校验 | 空关键词/分页越界返回参数错误 |
| L2-14 | `UserSecurityControllerTest.summary_shouldRequireSecurityViewPermission` | 后台用户安全摘要权限 | 无 `user:security:view` 返回 403 |
| L2-15 | `UserSecurityControllerTest.listBlocks_shouldBindUserIdAndPage` | 后台屏蔽记录分页参数 | `userId/page/size` 正确传入 Service |
| L2-16 | `UserSecurityFeedbackControllerTest.list_shouldRequireFeedbackListPermission` | 反馈列表权限 | 无 `user:feedback:list` 返回 403 |
| L2-17 | `UserSecurityFeedbackControllerTest.updateStatus_shouldRequireHandlePermissionAndRemark` | 反馈处理权限与备注 | 无权限 403；无备注参数错误 |
| L2-18 | `UserSecurityCancelControllerTest.list_shouldRequireCancelListPermission` | 注销列表权限 | 无 `user:cancel:list` 返回 403 |
| L2-19 | `UserSecurityCancelControllerTest.remark_shouldRequireCancelHandlePermission` | 注销备注/阻断权限 | 无 `user:cancel:handle` 返回 403 |

## 5. L3 - Service 单元测试用例

| 用例ID | 测试方法 | 输入 | 期望输出 |
|--------|----------|------|----------|
| L3-01 | `MiniappProfileServiceTest.home_shouldComposeProfileAuthAssetsAndEntries` | 用户基础、认证状态、入口配置、资产占位 | 聚合 VO 字段完整；PRD-04 字段可为 null |
| L3-02 | `MiniappSettingServiceTest.getPrivacy_shouldReturnConfigDefaultsWhenMissing` | 用户无隐私记录，存在默认配置 | 返回默认开关并可初始化记录 |
| L3-03 | `MiniappSettingServiceTest.savePrivacy_shouldUpsertAndAudit` | 已有隐私记录，部分字段更新 | upsert 成功，未传字段保持，写审计 |
| L3-04 | `MiniappSettingServiceTest.saveNotification_shouldNotCreateNotificationMessage` | 更新通知开关 | 只写设置，不调用 PRD-03 消息生产 |
| L3-05 | `MiniappRelationBlockServiceTest.addBlock_shouldRejectSelf` | `userId == targetUserId` | 抛业务异常，不创建记录 |
| L3-06 | `MiniappRelationBlockServiceTest.addBlock_shouldBeIdempotentByUserTargetType` | 同一 user/target/type 重复添加 | 只保留一条有效记录，返回同一 id 或等价成功 |
| L3-07 | `MiniappRelationBlockServiceTest.removeBlock_shouldNotRestoreHistoryRelation` | 删除黑名单记录 | 仅失效屏蔽，不调用关系恢复服务 |
| L3-08 | `MiniappKeywordBlockServiceTest.addKeyword_shouldEnforceLimitAndLength` | 达到数量上限、超长、空白 | 抛业务异常，不新增 |
| L3-09 | `MiniappKeywordBlockServiceTest.addKeyword_shouldDeduplicate` | 重复关键词 | 不产生重复有效记录 |
| L3-10 | `MiniappFeedbackServiceTest.submit_shouldPersistImagesAndContact` | 正常反馈、OSS 图片、联系方式 | 保存反馈，状态初始正确 |
| L3-11 | `FeedbackAdminServiceTest.updateStatus_shouldRequireRemarkAndAudit` | 更新反馈状态 | 状态变更、处理人/备注写入、审计记录写入 |
| L3-12 | `MiniappAccountSecurityServiceTest.applyCancel_shouldCreateCoolingOffWhenPass` | 无阻断、`confirm=true` | 创建 `COOLING_OFF`，设置 `coolingEndTime` |
| L3-13 | `MiniappAccountSecurityServiceTest.applyCancel_shouldReturnExistingCoolingOff` | 已存在 `COOLING_OFF` | 返回已有申请，不新增 |
| L3-14 | `MiniappAccountSecurityServiceTest.applyCancel_shouldReturnBlockReasonWithoutRecord` | 命中处罚/退款/争议/VIP 阻断 | 返回阻断原因，不创建 `COOLING_OFF` 记录 |
| L3-15 | `MiniappAccountSecurityServiceTest.revoke_shouldOnlyAllowCoolingOff` | `COOLING_OFF/REVOKED/CANCELLED/BLOCKED` 状态 | 仅 `COOLING_OFF` 可转 `REVOKED` |
| L3-16 | `CancelRequestAdminServiceTest.remark_shouldUpdateBlockReasonAndAudit` | 后台备注/阻断 | 更新备注/阻断原因，写审计 |
| L3-17 | `MiniappSearchResultServiceTest.searchViolation_shouldShortCircuit` | 关键词命中 `SEARCH_VIOLATION` | 返回 `violation=true`，不查询业务结果 |
| L3-18 | `MiniappSearchResultServiceTest.resultBlock_shouldFilterRows` | 候选结果昵称命中 `RESULT_BLOCK` | 剔除命中记录，保留其他记录 |
| L3-19 | `MiniappSearchResultServiceTest.search_shouldFilterRelationAndUserStatus` | 候选用户被拉黑/封禁/隐私限制 | 不返回不可见用户 |
| L3-20 | `MiniappSearchResultServiceTest.postTopic_shouldReturnEmptyBeforePrd05` | PRD-05 表未接入 | 返回空列表和空态文案，不抛异常 |
| L3-21 | `UserSecurityAdminServiceTest.summary_shouldComposeAllSecuritySignals` | 用户存在设置、屏蔽、反馈、注销 | 返回安全摘要字段完整 |
| L3-22 | `UserSecurityNoPromotionEventTest.securityActions_shouldNotTriggerPromotion` | 设置、屏蔽、关键词、反馈、搜索、注销 | 不调用 `PromotionInviteEventService.handleInviteEvent` |

## 6. L4 - E2E 浏览器测试用例

| 用例ID | 优先级 | 页面 | 操作步骤 | 期望结果 |
|--------|--------|------|----------|----------|
| L4-01 | P0 | 用户安全详情 Tab | 客服登录 → 进入 `/system/user` → 打开用户详情 → 切换安全/设置 Tab | 隐私、通知、黑名单、动态屏蔽、关键词、反馈、注销摘要正常加载 |
| L4-02 | P0 | 反馈箱 | 运营登录 → 进入 `/user-security/feedback` → 按类型/状态筛选 → 打开详情 | 列表和详情展示正确，图片 URL 可预览或跳转 |
| L4-03 | P0 | 反馈处理 | 运营在反馈详情中选择处理状态并填写备注 → 保存 | toast 成功，列表状态刷新，详情回显处理备注 |
| L4-04 | P0 | 注销申请 | 风控登录 → 进入 `/user-security/cancel-requests` → 按状态筛选 → 打开详情 | 展示用户、状态、后悔期、阻断项、备注 |
| L4-05 | P0 | 注销备注/阻断 | 风控在详情中填写备注或阻断原因 → 保存 | 保存成功，详情与列表状态/备注刷新 |
| L4-06 | P1 | 权限菜单 | 客服登录后台 | 可见用户安全详情和反馈箱，只读按钮可见，反馈处理/注销处理按钮不可见 |
| L4-07 | P1 | 权限菜单 | 运营登录后台 | 可处理反馈，可查看注销列表，但注销处理按钮不可见 |
| L4-08 | P1 | 权限菜单 | 安全/风控登录后台 | 可查看用户安全详情和注销申请，可备注注销；反馈处理入口不可见 |
| L4-09 | P2 | 反馈处理异常 | 运营处理反馈但不填写备注 | 前端拦截或接口错误 toast，弹窗不关闭 |
| L4-10 | P2 | 列表空态/错误态 | 使用无数据筛选条件、模拟接口失败 | 空态友好；错误时 toast 提示且页面不白屏 |
| L4-11 | P3 | 无权限访问 | 低权限账号直接访问 `/user-security/feedback`、`/user-security/cancel-requests` | 显示无权限或路由不可达 |

## 7. 前端手动测试用例

| 用例ID | 优先级 | 操作步骤 | 期望结果 | 实际结果 | 状态 |
|--------|--------|----------|----------|----------|------|
| M-01 | P0 | 小程序进入我的页，检查资料、认证、资产占位、入口配置 | 字段展示完整；资产占位为空时不崩溃 |  |  |
| M-02 | P0 | 小程序进入设置页，检查手机号/微信绑定状态、设置入口、版本号 | 与接口返回一致，未绑定状态可识别 |  |  |
| M-03 | P0 | 小程序修改隐私和通知开关后退出重进 | 开关状态持久化，未传字段不丢失 |  |  |
| M-04 | P0 | 小程序拉黑用户 B，再访问关系/聊天/推荐相关入口 | 本模块记录生效；具体拦截由 PRD-02/03/08 联调确认 |  |  |
| M-05 | P0 | 小程序添加“不看 TA 动态”，再查看社区动态流 | 本模块记录生效；PRD-05 接入后动态被过滤 |  |  |
| M-06 | P0 | 小程序添加个人关键词，再查看社区动态/评论 | 本模块保存成功；PRD-05 接入后包含关键词内容被过滤 |  |  |
| M-07 | P0 | 小程序提交反馈，后台反馈箱查看并处理 | 后台能查到反馈，处理状态回显到详情 |  |  |
| M-08 | P0 | 小程序提交注销申请，再撤销 | 状态从未申请到后悔期，再到已撤销 |  |  |
| M-09 | P0 | 小程序搜索正常关键词、违规关键词、无结果关键词 | 正常展示结果；违规词提示；无结果空态正确 |  |  |
| M-10 | P1 | 检查手机号、联系方式等敏感字段展示 | 后台默认脱敏；无特殊权限不能看到完整敏感信息 |  |  |
| M-11 | P1 | 检查长昵称、长学校名、长反馈内容、长备注 | 后台表格/详情不溢出，移动端布局不遮挡 |  |  |
| M-12 | P2 | 检查网络失败、接口 401、接口 403 场景 | 前端提示明确，不白屏，登录失效可回登录 |  |  |

## 8. 补充用例（来自交叉验证 2026-05-29）

> 核验人：皮林雄
> 核验依据：技术方案 §16 交叉验证修正项、移动端 PRD-06、管理后台 PRD-06、现有代码结构

### 8.1 修正 1 相关：注销状态机简化（去掉 APPLIED）

| 用例ID | 来源 | 优先级 | 层级 | 场景 | 接口/方法 | 期望结果 |
|--------|------|--------|------|------|-----------|----------|
| X1-P0-01 | 修正1 | P0 | L1 | 提交注销直接进入 COOLING_OFF | `POST /miniapp/account/cancel` | 创建记录 status=`COOLING_OFF`，不存在 `APPLIED` 中间态 |
| X1-P0-02 | 修正1 | P0 | L3 | 枚举不含 APPLIED | `CancelRequestStatusEnum` | 枚举值只有 `COOLING_OFF/REVOKED/CANCELLED/BLOCKED`，无 `APPLIED` |
| X1-P1-01 | 修正1 | P1 | L1 | 后台注销列表按状态筛选 | `GET /admin/user-security/cancel-requests/list?status=COOLING_OFF` | 只返回后悔期中的记录，不存在 APPLIED 状态记录 |

### 8.2 修正 2 相关：MiniappSettingsHomeVO 字段完整性

| 用例ID | 来源 | 优先级 | 层级 | 场景 | 接口/方法 | 期望结果 |
|--------|------|--------|------|------|-----------|----------|
| X2-P0-01 | 修正2 | P0 | L1 | 设置页返回手机绑定状态 | `GET /miniapp/settings/home` | 响应包含 `phoneBindStatus` 字段，值为 `BOUND` 或 `UNBOUND` |
| X2-P0-02 | 修正2 | P0 | L1 | 设置页返回微信绑定状态 | `GET /miniapp/settings/home` | 响应包含 `wechatBindStatus` 字段，值为 `BOUND` 或 `UNBOUND` |
| X2-P1-01 | 修正2 | P1 | L1 | 设置页返回版本号 | `GET /miniapp/settings/home` | 响应包含 `currentVersion` 字段（可为 null） |
| X2-P1-02 | 修正2 | P1 | L2 | Controller 返回精确类型 | `MiniappSettingControllerTest` | 返回类型为 `R<MiniappSettingsHomeVO>`，非通配符 |

### 8.3 修正 3 相关：RESULT_BLOCK 搜索结果过滤

| 用例ID | 来源 | 优先级 | 层级 | 场景 | 接口/方法 | 期望结果 |
|--------|------|--------|------|------|-----------|----------|
| X3-P0-01 | 修正3 | P0 | L1 | 用户昵称命中 RESULT_BLOCK 被剔除 | `GET /miniapp/search/results?keyword=xx&type=user` | 昵称含屏蔽词的用户不出现在结果中，其他用户正常返回 |
| X3-P0-02 | 修正3 | P0 | L3 | Service 层 RESULT_BLOCK 过滤逻辑 | `MiniappSearchResultServiceTest.resultBlock_shouldFilterByNickname` | 加载 `blockType=RESULT_BLOCK` 词库，对结果集昵称做匹配过滤 |
| X3-P1-01 | 修正3 | P1 | L1 | RESULT_BLOCK 不影响搜索词本身 | `GET /miniapp/search/results?keyword=屏蔽词` | 关键词本身不被 RESULT_BLOCK 拦截（只有 SEARCH_VIOLATION 才整体拦截） |
| X3-P1-02 | 修正3 | P1 | L3 | RESULT_BLOCK 支持三种匹配模式 | `MiniappSearchResultServiceTest` | EXACT/FUZZY/PREFIX 三种 matchType 均能正确过滤结果行 |

### 8.4 修正 5 相关：注销申请幂等

| 用例ID | 来源 | 优先级 | 层级 | 场景 | 接口/方法 | 期望结果 |
|--------|------|--------|------|------|-----------|----------|
| X5-P0-01 | 修正5 | P0 | L3 | 已有 COOLING_OFF 时再次提交 | `MiniappAccountSecurityServiceTest.applyCancel_shouldReturnExistingCoolingOff` | 返回已有申请信息，不创建第二条记录 |
| X5-P1-01 | 修正5 | P1 | L1 | 并发提交注销申请 | `POST /miniapp/account/cancel` 连续两次 | 第二次返回已有申请或幂等成功，数据库只有一条 COOLING_OFF |
| X5-P1-02 | 修正5 | P1 | L3 | 历史 REVOKED 记录不阻塞新申请 | `MiniappAccountSecurityServiceTest` | 用户有历史 REVOKED 记录时，仍可创建新的 COOLING_OFF |

### 8.5 修正 6 相关：权限-角色映射验证

| 用例ID | 来源 | 优先级 | 层级 | 场景 | 接口/方法 | 期望结果 |
|--------|------|--------|------|------|-----------|----------|
| X6-P0-01 | 修正6 | P0 | L1 | 客服只能查看不能处理反馈 | `PUT /admin/user-security/feedback/{id}/status` | 客服 Token 返回 403 |
| X6-P0-02 | 修正6 | P0 | L1 | 运营不能处理注销申请 | `PUT /admin/user-security/cancel-requests/{id}/remark` | 运营 Token 返回 403 |
| X6-P0-03 | 修正6 | P0 | L1 | 风控可以备注注销但不能处理反馈 | 反馈处理 + 注销备注 | 反馈处理 403，注销备注 200 |
| X6-P1-01 | 修正6 | P1 | L4 | 角色菜单可见性 | 各角色登录后台 | 菜单按权限码显隐，与 §16.1 修正 6 映射表一致 |

### 8.6 PRD 需求遗漏补充

| 用例ID | 来源 | 优先级 | 层级 | 场景 | 接口/方法 | 期望结果 |
|--------|------|--------|------|------|-----------|----------|
| X7-P0-01 | PRD§9.1 | P0 | L1 | 黑名单生效后搜索不返回对方 | `GET /miniapp/search/results?keyword=用户B昵称` | A 拉黑 B 后，A 搜索不返回 B |
| X7-P1-01 | PRD§8.2.2 | P1 | L3 | 隐藏访问记录需 VIP 权益校验 | `MiniappSettingServiceTest` | `hideVisitRecord=true` 保存成功但实际生效需 PRD-04 VIP 校验（本模块只存设置） |
| X7-P1-02 | PRD§9.2 | P1 | L1 | 关键词屏蔽不影响搜索结果 | `GET /miniapp/search/results` | 用户 A 有个人关键词"测试"，搜索"测试"仍正常返回结果（个人关键词只影响社区） |
| X7-P1-03 | PRD§11.2.3 | P1 | L1 | 退出登录后 token 失效 | `POST /miniapp/logout` → 再调任意需登录接口 | 第二次请求返回 401 |
| X7-P1-04 | PRD§13.5 | P1 | L1 | 搜索结果过滤封禁用户 | `GET /miniapp/search/results?type=user` | 被封禁的用户不出现在搜索结果中 |
| X7-P2-01 | PRD§12.4 | P2 | L1 | 反馈图片最多 9 张 | `POST /miniapp/feedback` | 提交 10 张图片返回参数错误 |
| X7-P2-02 | PRD§13.6 | P2 | L1 | 搜索关键词超长截断写日志 | `GET /miniapp/search/results?keyword=超长200字` | 不报错，日志记录被截断后的关键词（≤100 字符） |
| X7-P2-03 | 后台PRD§4.3.1 | P2 | L3 | 注销后悔期天数从 app_config 读取 | `MiniappAccountSecurityServiceTest` | `coolingEndTime = applyTime + config(account_cancel.cooling_days)` |
| X7-P3-01 | PRD§8.2.1 | P3 | L3 | 隐私设置对等规则提示 | `MiniappSettingServiceTest` | 关闭"允许展示距离"时，VO 返回对等提示文案（从 app_config 读取） |

### 8.7 审计日志验证补充

| 用例ID | 来源 | 优先级 | 层级 | 场景 | 接口/方法 | 期望结果 |
|--------|------|--------|------|------|-----------|----------|
| X8-P1-01 | 技术方案§8.2 | P1 | L3 | 隐私设置变更写审计 | `MiniappSettingServiceTest` | 保存隐私设置后 `app_user_security_audit_log` 有记录，`bizType=PRIVACY`，`beforeValue/afterValue` 非空 |
| X8-P1-02 | 技术方案§8.3 | P1 | L3 | 黑名单操作写审计 | `MiniappRelationBlockServiceTest` | 加入/解除黑名单后审计日志 `bizType=BLOCK` 有记录 |
| X8-P1-03 | 技术方案§8.6 | P1 | L3 | 注销申请写审计 | `MiniappAccountSecurityServiceTest` | 提交/撤销注销后审计日志 `bizType=CANCEL` 有记录 |
| X8-P1-04 | 后台PRD§4.3.3 | P1 | L3 | 后台备注注销写审计 | `CancelRequestAdminServiceTest` | 后台备注/阻断操作后审计日志 `operatorType=ADMIN` |

---

> 以上补充用例共 **30 条**，覆盖技术方案 6 项修正、PRD 需求遗漏点、审计日志验证。后续 Code Review 发现 Critical/Warning 后，继续追加到本章节。
