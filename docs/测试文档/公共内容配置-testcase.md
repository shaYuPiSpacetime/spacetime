# 公共内容配置模块 - 测试用例

> **关联文档**：
> - 技术方案：`docs/技术方案/2026-05-28-公共内容配置-tcdesign.md`
> **创建日期**：2026-05-28
> **测试模式**：L1 已派生 + L3 用例设计（L3 Java 测试待代码实现后派生；L2/L4 后续补充）
> **目标项目**：后端 `backend/` / 前端 `frontend/`

> **执行边界**：本文档面向 `docs/技术方案/2026-05-28-公共内容配置-tcdesign.md` 的方案级测试设计。当前生产代码尚未落地公共内容配置接口时，不应将 L1 脚本作为现有代码回归测试执行；实现完成并具备数据库表、菜单权限、测试 Token 后再执行。

---

## 1. 测试策略

| 层级 | 内容 | 技术 |
|------|------|------|
| L1 | 接口连通、参数校验、权限拦截、业务分支、小程序公共接口 | cURL 脚本（bash），已派生 |
| L3 | Service 纯业务逻辑：校验、状态过滤、批量保存、屏蔽词匹配 | JUnit 5 + Mockito，用例已设计，Java 测试待实现后派生 |

### 1.1 执行前置条件

| 前置项 | 要求 | 缺失处理 |
|--------|------|----------|
| 后端地址 | 优先从 `frontend/e2e-tests/.env` 读取 `API_URL`，或执行时传环境变量 | 缺失则默认 `http://localhost:8080` |
| 管理员 Token | 优先传 `TOKEN`；否则用 `ADMIN_ACCOUNT`/`ADMIN_PASSWORD` 登录获取（默认 peter/000000） | 登录失败则退出 |
| 低权限 Token | 可选传 `LOW_PRIV_TOKEN`，用于 403 权限测试 | 缺失则跳过 403 用例 |
| 数据库与菜单 | 已执行 `schema-content.sql`，并为管理员授予 content 菜单权限 | 未完成会导致接口 404/403，需先完成实现或 seed |
| 配置回滚 | 脚本修改配置前先读取原值，退出时恢复原值 | 读取原值失败则跳过恢复，避免写入错误默认值 |

---

## 2. 代码变更概览

### 后端 Controller 接口

| 控制器 | 方法 | 路径 | 权限 |
|--------|------|------|------|
| ContentArticleController | GET | `/admin/content/articles/list` | `content:article:list` |
| ContentArticleController | GET | `/admin/content/articles/{id}` | `content:article:list` |
| ContentArticleController | POST | `/admin/content/articles` | `content:article:add` |
| ContentArticleController | PUT | `/admin/content/articles/{id}` | `content:article:edit` |
| ContentArticleController | PUT | `/admin/content/articles/{id}/status` | `content:article:publish` |
| ContentArticleController | DELETE | `/admin/content/articles/{id}` | `content:article:delete` |
| AppConfigController | GET | `/admin/content/app-config/list` | `content:config:list` |
| AppConfigController | GET | `/admin/content/app-config/{key}` | `content:config:list` |
| AppConfigController | POST | `/admin/content/app-config/batch` | `content:config:edit` |
| MobileEntryConfigController | GET | `/admin/content/mobile-entries/list` | `content:entry:list` |
| MobileEntryConfigController | POST | `/admin/content/mobile-entries` | `content:entry:add` |
| MobileEntryConfigController | PUT | `/admin/content/mobile-entries/{id}` | `content:entry:edit` |
| MobileEntryConfigController | PUT | `/admin/content/mobile-entries/{id}/status` | `content:entry:edit` |
| MobileEntryConfigController | PUT | `/admin/content/mobile-entries/sort` | `content:entry:edit` |
| MobileEntryConfigController | DELETE | `/admin/content/mobile-entries/{id}` | `content:entry:delete` |
| SearchHotWordController | GET | `/admin/content/search-hot-words/list` | `content:hotWord:list` |
| SearchHotWordController | POST | `/admin/content/search-hot-words` | `content:hotWord:add` |
| SearchHotWordController | PUT | `/admin/content/search-hot-words/{id}` | `content:hotWord:edit` |
| SearchHotWordController | PUT | `/admin/content/search-hot-words/{id}/status` | `content:hotWord:edit` |
| SearchHotWordController | DELETE | `/admin/content/search-hot-words/{id}` | `content:hotWord:delete` |
| SearchBlockWordController | GET | `/admin/content/search-block-words/list` | `content:blockWord:list` |
| SearchBlockWordController | POST | `/admin/content/search-block-words` | `content:blockWord:add` |
| SearchBlockWordController | PUT | `/admin/content/search-block-words/{id}` | `content:blockWord:edit` |
| SearchBlockWordController | PUT | `/admin/content/search-block-words/{id}/status` | `content:blockWord:edit` |
| SearchBlockWordController | DELETE | `/admin/content/search-block-words/{id}` | `content:blockWord:delete` |
| ContentOperationLogController | GET | `/admin/content/operation-logs/list` | `content:operationLog:list` |
| MiniappContentController | GET | `/miniapp/content/announcements` | 公共放行 |
| MiniappContentController | GET | `/miniapp/content/help-docs` | 公共放行 |
| MiniappContentController | GET | `/miniapp/content/rules` | 公共放行 |
| MiniappContentController | GET | `/miniapp/content/articles/{id}` | 公共放行 |
| MiniappContentController | GET | `/miniapp/content/config` | 公共放行 |
| MiniappMobileConfigController | GET | `/miniapp/mobile-config/entries` | 公共放行 |
| MiniappSearchConfigController | GET | `/miniapp/search/hot-words` | 公共放行 |
| MiniappSearchConfigController | GET | `/miniapp/search/config` | 公共放行 |

### 后端 Service 关键分支

| 方法 | 分支条件 | 行为 |
|------|---------|------|
| ContentArticleAdminServiceImpl.create | contentType=H5 且 contentUrl 为空 | 抛 BusinessException |
| ContentArticleAdminServiceImpl.create | contentType=NATIVE 且 contentBody 为空 | 抛 BusinessException |
| ContentArticleAdminServiceImpl.updateStatus | 实体不存在 | 抛 BusinessException |
| AppConfigAdminServiceImpl.batchSave | configType=URL 且值非合法 URL | 抛 BusinessException |
| AppConfigAdminServiceImpl.batchSave | configType=JSON 且值非合法 JSON | 抛 BusinessException |
| MobileEntryConfigAdminServiceImpl.create | pageCode+entryKey 已存在 | 抛 BusinessException |
| SearchHotWordAdminServiceImpl.create | 同 scene 下 word 重复且启用 | 抛 BusinessException |
| SearchBlockWordAdminServiceImpl.create | 同 blockType 下 word 重复且启用 | 抛 BusinessException |
| MiniappContentServiceImpl.getAnnouncements | 过滤 effective_time/expire_time | 仅返回已生效未过期 |
| MiniappContentServiceImpl.getPublicConfigs | public_visible=0 | 不返回 |
| MiniappMobileConfigServiceImpl.getEntries | jumpTarget 以 config: 开头 | 解析为真实 URL |
| MiniappSearchConfigServiceImpl.validateKeyword | 命中 SEARCH_VIOLATION 屏蔽词 | 返回违规标记+提示文案 |

---

## 3. L1 - 接口测试用例

### 3.1 内容文章管理

| 用例ID | 优先级 | 场景 | 接口 | 期望结果 |
|--------|-------|------|------|---------|
| CA-P0-01 | P0 | 创建公告（H5 类型） | `POST /admin/content/articles` | 200, data=id |
| CA-P0-02 | P0 | 创建帮助文档（NATIVE 类型） | `POST /admin/content/articles` | 200, data=id |
| CA-P0-03 | P0 | 分页查询文章列表 | `GET /admin/content/articles/list?type=ANNOUNCEMENT&page=1&size=10` | 200, data.records[] |
| CA-P0-04 | P0 | 查询文章详情 | `GET /admin/content/articles/{id}` | 200, data.title 匹配 |
| CA-P0-05 | P0 | 更新文章 | `PUT /admin/content/articles/{id}` | 200 |
| CA-P0-06 | P0 | 更新文章状态（发布/下线） | `PUT /admin/content/articles/{id}/status` | 200 |
| CA-P0-07 | P0 | 删除文章 | `DELETE /admin/content/articles/{id}` | 200 |
| CA-P1-01 | P1 | H5 类型但 contentUrl 为空 | `POST /admin/content/articles` | 400 或 code=4001 |
| CA-P1-02 | P1 | NATIVE 类型但 contentBody 为空 | `POST /admin/content/articles` | 400 或 code=4001 |
| CA-P1-03 | P1 | 缺少必填字段 title | `POST /admin/content/articles` | 400 |
| CA-P1-04 | P1 | 未登录访问 | `GET /admin/content/articles/list`（无 Token） | 401 |
| CA-P2-01 | P2 | 按 type+status 筛选 | `GET /admin/content/articles/list?type=HELP_DOC&status=ENABLED` | 200, records 全部匹配 |
| CA-P2-02 | P2 | 按标题模糊搜索 | `GET /admin/content/articles/list?title=公告` | 200, records 标题含"公告" |
| CA-P2-03 | P2 | 删除后列表不可见 | 删除后再查列表 | 不包含已删除记录 |
| CA-P2-04 | P2 | 发布/下线写审计日志 | 状态变更后查操作日志 | 日志中有对应记录 |

### 3.2 应用配置管理

| 用例ID | 优先级 | 场景 | 接口 | 期望结果 |
|--------|-------|------|------|---------|
| AC-P0-01 | P0 | 查询配置列表（按 group） | `GET /admin/content/app-config/list?group=AGREEMENT` | 200, data[] |
| AC-P0-02 | P0 | 查询单个配置 | `GET /admin/content/app-config/agreement.user_agreement` | 200, data.configKey 匹配 |
| AC-P0-03 | P0 | 批量保存配置 | `POST /admin/content/app-config/batch` | 200 |
| AC-P1-01 | P1 | configType=URL 但值非 URL | `POST /admin/content/app-config/batch` | code=4001/5001 |
| AC-P1-02 | P1 | configType=JSON 但值非 JSON | `POST /admin/content/app-config/batch` | code=4001/5001 |
| AC-P1-03 | P1 | 未登录访问 | `GET /admin/content/app-config/list`（无 Token） | 401 |
| AC-P2-01 | P2 | 保存后重新查询值已更新 | 保存 → 查询 | 值一致 |
| AC-P2-02 | P2 | 批量保存写审计日志 | 保存后查操作日志 | 有记录 |

### 3.3 移动端入口配置

| 用例ID | 优先级 | 场景 | 接口 | 期望结果 |
|--------|-------|------|------|---------|
| ME-P0-01 | P0 | 查询入口列表（按 pageCode） | `GET /admin/content/mobile-entries/list?pageCode=MY_PAGE` | 200, data[] |
| ME-P0-02 | P0 | 创建入口配置 | `POST /admin/content/mobile-entries` | 200, data=id |
| ME-P0-03 | P0 | 更新入口配置 | `PUT /admin/content/mobile-entries/{id}` | 200 |
| ME-P0-04 | P0 | 更新入口状态 | `PUT /admin/content/mobile-entries/{id}/status` | 200 |
| ME-P0-05 | P0 | 批量排序 | `PUT /admin/content/mobile-entries/sort` | 200 |
| ME-P0-06 | P0 | 删除入口 | `DELETE /admin/content/mobile-entries/{id}` | 200 |
| ME-P1-01 | P1 | pageCode+entryKey 重复 | `POST /admin/content/mobile-entries` | code=5001 |
| ME-P1-02 | P1 | jumpType=H5 但 jumpTarget 为空 | `POST /admin/content/mobile-entries` | 400 或 code=4001 |
| ME-P1-03 | P1 | 未登录访问 | `GET /admin/content/mobile-entries/list`（无 Token） | 401 |

### 3.4 搜索热词管理

| 用例ID | 优先级 | 场景 | 接口 | 期望结果 |
|--------|-------|------|------|---------|
| HW-P0-01 | P0 | 分页查询热词列表 | `GET /admin/content/search-hot-words/list?page=1&size=10` | 200, data.records[] |
| HW-P0-02 | P0 | 创建热词 | `POST /admin/content/search-hot-words` | 200, data=id |
| HW-P0-03 | P0 | 更新热词 | `PUT /admin/content/search-hot-words/{id}` | 200 |
| HW-P0-04 | P0 | 更新热词状态 | `PUT /admin/content/search-hot-words/{id}/status` | 200 |
| HW-P0-05 | P0 | 删除热词 | `DELETE /admin/content/search-hot-words/{id}` | 200 |
| HW-P1-01 | P1 | 同 scene 下 word 重复 | `POST /admin/content/search-hot-words` | code=5001 |
| HW-P1-02 | P1 | word 超长（>30） | `POST /admin/content/search-hot-words` | 400 |
| HW-P1-03 | P1 | 未登录访问 | `GET /admin/content/search-hot-words/list`（无 Token） | 401 |

### 3.5 搜索屏蔽词管理

| 用例ID | 优先级 | 场景 | 接口 | 期望结果 |
|--------|-------|------|------|---------|
| BW-P0-01 | P0 | 分页查询屏蔽词列表 | `GET /admin/content/search-block-words/list?page=1&size=10` | 200, data.records[] |
| BW-P0-02 | P0 | 创建屏蔽词 | `POST /admin/content/search-block-words` | 200, data=id |
| BW-P0-03 | P0 | 更新屏蔽词 | `PUT /admin/content/search-block-words/{id}` | 200 |
| BW-P0-04 | P0 | 更新屏蔽词状态 | `PUT /admin/content/search-block-words/{id}/status` | 200 |
| BW-P0-05 | P0 | 删除屏蔽词 | `DELETE /admin/content/search-block-words/{id}` | 200 |
| BW-P1-01 | P1 | 同 blockType 下 word 重复 | `POST /admin/content/search-block-words` | code=5001 |
| BW-P1-02 | P1 | 未登录访问 | `GET /admin/content/search-block-words/list`（无 Token） | 401 |
| BW-P2-01 | P2 | 创建/修改/删除写审计日志 | 操作后查操作日志 | 有记录 |
| BW-P3-01 | P3 | 低权限用户访问屏蔽词列表 | `GET /admin/content/search-block-words/list`（LOW_PRIV_TOKEN） | 403 |

### 3.6 操作日志查询

| 用例ID | 优先级 | 场景 | 接口 | 期望结果 |
|--------|-------|------|------|---------|
| OL-P0-01 | P0 | 分页查询操作日志 | `GET /admin/content/operation-logs/list?page=1&size=10` | 200, data.records[] |
| OL-P1-01 | P1 | 按 bizType 筛选 | `GET /admin/content/operation-logs/list?bizType=ARTICLE` | 200, records 全部 bizType=ARTICLE |
| OL-P1-02 | P1 | 未登录访问 | `GET /admin/content/operation-logs/list`（无 Token） | 401 |

### 3.7 小程序公共接口

| 用例ID | 优先级 | 场景 | 接口 | 期望结果 |
|--------|-------|------|------|---------|
| MP-P0-01 | P0 | 公告列表（免登录） | `GET /miniapp/content/announcements?page=1&size=10` | 200, 仅返回已启用+已生效+未过期 |
| MP-P0-02 | P0 | 帮助文档列表 | `GET /miniapp/content/help-docs?page=1&size=10` | 200, 仅返回已启用 |
| MP-P0-03 | P0 | 规则内容列表 | `GET /miniapp/content/rules?type=RULE` | 200 |
| MP-P0-04 | P0 | 内容详情 | `GET /miniapp/content/articles/{id}` | 200, 仅返回启用内容 |
| MP-P0-05 | P0 | 获取公开配置 | `GET /miniapp/content/config?keys=agreement.user_agreement,about.app_version` | 200, 仅返回 public_visible=1 |
| MP-P0-06 | P0 | 移动端入口 | `GET /miniapp/mobile-config/entries?pageCode=MY_PAGE` | 200, 已启用入口按 sort 排序 |
| MP-P0-07 | P0 | 热门搜索词 | `GET /miniapp/search/hot-words?limit=10` | 200, 已启用按 sort 排序 |
| MP-P0-08 | P0 | 搜索展示配置 | `GET /miniapp/search/config` | 200, 含 emptyStateText/violationText/tabs |
| MP-P1-01 | P1 | 已下线公告不出现在列表 | 下线后查公告列表 | 不包含 |
| MP-P1-02 | P1 | 未生效公告不出现 | effective_time 在未来 | 不包含 |
| MP-P1-03 | P1 | 已过期公告不出现 | expire_time 已过 | 不包含 |
| MP-P1-04 | P1 | public_visible=0 配置不返回 | 查询含非公开 key | 不返回该 key |
| MP-P1-05 | P1 | 入口 config: 引用解析 | 入口 jumpTarget=config:agreement.user_agreement | 返回真实 URL |
| MP-P1-06 | P1 | 已禁用入口不返回 | 禁用后查入口列表 | 不包含 |
| MP-P1-07 | P1 | 已禁用搜索 Tab 不返回 | 禁用 topic Tab 后查 config | tabs 不含 topic |
| MP-P1-08 | P1 | 已禁用热词不返回 | 禁用后查热词列表 | 不包含 |
| MP-P2-01 | P2 | 已禁用内容详情返回 404/空 | 查已禁用文章详情 | 返回空或 code=5001 |

---

## 4. L3 - Service 单元测试用例

### 4.1 ContentArticleAdminServiceImpl

| 用例ID | 场景 | 输入 | 期望 |
|--------|------|------|------|
| L3-CA-01 | 创建 H5 公告成功 | type=ANNOUNCEMENT, contentType=H5, contentUrl 有值 | insert 被调用，entity 字段正确 |
| L3-CA-02 | 创建 NATIVE 帮助文档成功 | type=HELP_DOC, contentType=NATIVE, contentBody 有值 | insert 被调用 |
| L3-CA-03 | H5 类型缺 URL 抛异常 | contentType=H5, contentUrl=null | 抛 BusinessException |
| L3-CA-04 | NATIVE 类型缺正文抛异常 | contentType=NATIVE, contentBody=null | 抛 BusinessException |
| L3-CA-05 | 更新不存在的文章抛异常 | id=999999 | 抛 BusinessException |
| L3-CA-06 | 状态变更写审计日志 | updateStatus(id, DISABLED) | ContentOperationLogDao.insert 被调用 |

### 4.2 AppConfigAdminServiceImpl

| 用例ID | 场景 | 输入 | 期望 |
|--------|------|------|------|
| L3-AC-01 | 批量保存成功 | 合法 items | batchUpsert 被调用 |
| L3-AC-02 | URL 类型校验失败 | configType=URL, value="not-a-url" | 抛 BusinessException |
| L3-AC-03 | JSON 类型校验失败 | configType=JSON, value="{invalid" | 抛 BusinessException |
| L3-AC-04 | 批量保存写审计日志 | 正常保存 | ContentOperationLogDao.insert 被调用 |

### 4.3 MobileEntryConfigAdminServiceImpl

| 用例ID | 场景 | 输入 | 期望 |
|--------|------|------|------|
| L3-ME-01 | 创建入口成功 | pageCode=MY_PAGE, entryKey=test | insert 被调用 |
| L3-ME-02 | pageCode+entryKey 重复抛异常 | 已存在相同组合 | 抛 BusinessException |
| L3-ME-03 | 批量排序成功 | ids=[1,2,3] | batchUpdateSort 被调用 |

### 4.4 SearchHotWordAdminServiceImpl

| 用例ID | 场景 | 输入 | 期望 |
|--------|------|------|------|
| L3-HW-01 | 创建热词成功 | word="交友", scene=GLOBAL | insert 被调用 |
| L3-HW-02 | 同 scene 重复词抛异常 | 已存在启用的相同 word+scene | 抛 BusinessException |

### 4.5 SearchBlockWordAdminServiceImpl

| 用例ID | 场景 | 输入 | 期望 |
|--------|------|------|------|
| L3-BW-01 | 创建屏蔽词成功 | word="违规词", blockType=SEARCH_VIOLATION | insert 被调用 |
| L3-BW-02 | 同 blockType 重复词抛异常 | 已存在启用的相同 word+blockType | 抛 BusinessException |
| L3-BW-03 | 创建写审计日志 | 正常创建 | ContentOperationLogDao.insert 被调用 |

### 4.6 MiniappContentServiceImpl

| 用例ID | 场景 | 输入 | 期望 |
|--------|------|------|------|
| L3-MP-01 | 公告列表过滤未生效 | effective_time 在未来 | 不在返回列表中 |
| L3-MP-02 | 公告列表过滤已过期 | expire_time 已过 | 不在返回列表中 |
| L3-MP-03 | 公告列表过滤已禁用 | status=DISABLED | 不在返回列表中 |
| L3-MP-04 | getPublicConfigs 过滤非公开 | public_visible=0 | 不在返回 Map 中 |
| L3-MP-05 | getPublicConfigs 过滤已禁用 | status=DISABLED | 不在返回 Map 中 |

### 4.7 MiniappMobileConfigServiceImpl

| 用例ID | 场景 | 输入 | 期望 |
|--------|------|------|------|
| L3-MC-01 | 入口列表按 sort 排序 | 多条入口 | 返回按 sort 升序 |
| L3-MC-02 | config: 引用解析 | jumpTarget="config:agreement.user_agreement" | 返回真实 URL |
| L3-MC-03 | config: 引用目标不存在 | jumpTarget="config:not_exist" | jumpTarget 返回空字符串 |
| L3-MC-04 | 过滤已禁用入口 | status=DISABLED | 不在返回列表中 |

### 4.8 MiniappSearchConfigServiceImpl

| 用例ID | 场景 | 输入 | 期望 |
|--------|------|------|------|
| L3-SC-01 | 热词列表按 sort 排序 | 多条热词 | 返回按 sort 升序 |
| L3-SC-02 | 热词列表过滤已禁用 | status=DISABLED | 不在返回列表中 |
| L3-SC-03 | validateKeyword 命中精确匹配 | keyword="违规词", matchType=EXACT | 返回违规 |
| L3-SC-04 | validateKeyword 命中模糊匹配 | keyword="含违规词的句子", matchType=FUZZY | 返回违规 |
| L3-SC-05 | validateKeyword 命中前缀匹配 | keyword="违规开头", matchType=PREFIX | 返回违规 |
| L3-SC-06 | validateKeyword 未命中 | keyword="正常词" | 返回通过 |
| L3-SC-07 | validateKeyword 返回自定义提示 | 屏蔽词有 hitMessage | 返回该 hitMessage |
| L3-SC-08 | validateKeyword 返回全局提示 | 屏蔽词无 hitMessage | 返回 app_config 中 search.violation_text |
| L3-SC-09 | getSearchConfig 返回 Tab 配置 | SEARCH_RESULT_TAB 有 3 条启用 | tabs 含 3 项 |
| L3-SC-10 | getSearchConfig 过滤禁用 Tab | 禁用 topic | tabs 不含 topic |
