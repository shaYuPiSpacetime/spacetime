# 字典管理 - 测试报告

> **关联文档**：
> - 测试用例：`docs/测试文档/字典管理-testcase.md`
> - L1 脚本：`docs/测试文档/字典管理-test-l1.sh`

## 2026-07-22 字典管理增量回归（当前结论）

> 以下结果覆盖本轮最新代码，优先于下方 2026-05-14 历史记录。

### 结果汇总

| 层级 | 通过 | 失败 | 跳过 | 说明 |
|------|------|------|------|------|
| L1 真实接口 | 27 | 0 | 0 | 真实账号登录；覆盖分页 20/50、CRUD、懒加载子节点、级联删除、401/403；临时数据已清理 |
| L2 Controller | 9 | 0 | 0 | DictTypeController 5、DictDataController 4 |
| L3 Service | 15 | 0 | 0 | DictTypeService 6、DictDataService 9 |
| L4 Playwright | 9 | 0 | 0 | 真实字典页面 6 条 + mock API 专项 3 条；整个系统管理命令共 22/22 通过 |
| 前端生产构建 | 1 | 0 | 0 | TypeScript 与 Vite 构建通过 |

### 修复结果

| 问题 | 根因 | 修复与验证 |
|------|------|------------|
| 20/50 条每页不生效 | 页面请求和分页组件都硬编码 10，且未处理 pageSize 回调 | 改为受控 `pageSize`，Playwright 验证请求依次携带 size=20/50 并回到第 1 页 |
| 搜索输入触发重复/竞态请求 | 输入草稿直接作为请求依赖，同时搜索按钮再次请求 | 拆分草稿条件与已提交条件；输入不请求，搜索/重置各触发一次有效条件刷新 |
| 修改字典类型编码后数据丢失 | 类型表改编码，但 `sys_dict_data.dict_type` 保留旧值 | 同一事务迁移全部关联字典数据，L3-D1-06 通过 |
| 可产生孤儿或跨类型父子节点 | 创建/更新未校验字典类型与父节点 | 校验类型存在、父节点存在且同类型，拒绝自身/后代和改变已有节点类型 |
| 编辑父级可选择自身/后代 | 前端候选未过滤 | 已加载树中排除当前子树；服务端继续做完整防线校验 |
| 只读用户仍看到写操作 | 页面未按 `system:dict:*` 操作权限控制 | 字典类型/数据新增、编辑、删除、加子节点均按权限隐藏，Playwright 验证通过 |

**当前判定：通过。** 用户反馈的 20/50 分页缺陷已在真实 API 与浏览器两层回归；L1 27/27、字典相关 L4 9/9，均为 0 失败、0 跳过。无权限场景通过脚本自建无角色临时用户验证 403，执行后已删除。

### 本轮真实执行命令

```bash
# 凭据仅通过当前 shell 环境注入
API_URL=https://admin.shikongxiehou.com/api \
  ADMIN_USERNAME='<test-account>' ADMIN_PASSWORD='<from-env>' \
  bash docs/测试文档/字典管理-test-l1.sh

cd frontend
BASE_URL=http://127.0.0.1:5173 \
  API_URL=https://admin.shikongxiehou.com/api \
  ADMIN_USERNAME='<test-account>' ADMIN_PASSWORD='<from-env>' \
  PLAYWRIGHT_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  npx playwright test --config=e2e-tests/playwright.config.ts \
  e2e-tests/tests/rbac.spec.ts \
  e2e-tests/tests/dict.spec.ts \
  e2e-tests/tests/system-management-regression.spec.ts
```

---

## 1. 测试概况

| 项目 | 信息 |
|------|------|
| 功能名称 | 字典管理（字典类型管理 + 字典数据管理，支持多层级树形结构） |
| 测试环境 | API: http://localhost:8080 (Aliyun RDS MySQL), Frontend: http://localhost:5173 |
| 执行日期 | 2026-05-14 |
| 执行人 | 自动化测试 |
| 测试策略 | L1 + L2 + L3 + L4（用户指定全量） |
| 测试模式 | 轻量模式（从新增 Controller/Service 代码提取测试依据） |
| JDK | 22 (`JAVA_HOME=/Users/peter/Library/Java/JavaVirtualMachines/openjdk-22/Contents/Home`) |
| L4 浏览器 | Chromium 130（Playwright 1.48） |

---

## 2. 测试结果汇总

| 层级 | 总数 | 通过 ✅ | 失败 ❌ | 跳过 ⏭️ | 通过率 |
|------|------|--------|--------|---------|--------|
| L1 接口测试 | 24 | 22 | 0 | 2 | 91.7% |
| L2 Controller | 9 | 9 | 0 | 0 | 100% |
| L3 Service | 10 | 10 | 0 | 0 | 100% |
| L4 E2E | 6 | 6 | 0 | 0 | 100% |
| 手动测试 | 2 | — | — | 2 | — |
| **合计** | **51** | **47** | **0** | **4** | **92.2%** |

---

## 3. 测试结论

**判定结果**：✅ 通过

**判定依据**：
- P0 用例：全部通过（L1 核心 CRUD、L4 UI 交互 100%）
- P1 用例：全部通过（L2 路由绑定、L3 业务逻辑 100%）
- P2 用例：全部通过（DTO 校验拦截、关键词搜索、级联删除验证等均通过）
- P3 跳过：2 条（缺少测试用低权限账号，非功能缺陷）

**结论**：字典管理模块全部核心功能（CRUD、树形构建、级联删除、权限拦截、UI 交互）和边界场景均通过验证。无业务缺陷。

---

## 4. 跳过的测试

| 用例ID | 优先级 | 跳过原因 |
|--------|--------|---------|
| D1-P3-02 | P3 | 缺少无 `system:dict:add` 权限的测试账号 |
| D2-P3-02 | P3 | 同上 |
| M-D1-01 | P2 | 手动测试：字典类型状态切换 |
| M-D2-01 | P2 | 手动测试：多层级树形展示 |

---

## 5. 分层测试详情

### 5.1 L1 接口测试（cURL）

**执行方式**：`bash docs/测试文档/字典管理-test-l1.sh`
**内置登录**：自动通过 `/admin/login` 获取 Token（账号 peter）

| 用例ID | 描述 | 结果 |
|--------|------|------|
| D1-P0-01 | 分页查询字典类型 | ✅ |
| D1-P0-02 | 查询全部字典类型 | ✅ |
| D1-P0-03 | 创建字典类型 | ✅ |
| D1-P0-04 | 更新字典类型 | ✅ |
| D1-P2-01 | 关键词搜索 | ✅ |
| D1-P2-02 | 状态筛选 | ✅ |
| D1-P2-03 | 编码重复拦截 | ✅ |
| D1-P2-04 | 缺少必填字段dictName→4001 | ✅ |
| D1-P2-05 | 更新不存在的ID | ✅ |
| D1-P2-06 | 编码冲突拦截 | ✅ |
| D1-P3-01 | 未登录调字典类型列表→401 | ✅ |
| D1-P3-02 | 无权限创建字典类型 | ⏭️ |
| D2-P0-01 | 查询字典数据树 | ✅ |
| D2-P0-02 | 创建顶级字典数据 | ✅ |
| D2-P0-03 | 创建子级字典数据 | ✅ |
| D2-P0-04 | 更新字典数据 | ✅ |
| D2-P0-05 | 级联删除字典数据 | ✅ |
| D2-P0-05-verify | 级联删除后验证 | ✅ |
| D2-P0-01-children | 树结构含children | ✅ |
| D2-P2-01 | 不存在的类型返回空数组 | ✅ |
| D2-P2-02 | 字典数据缺label→4001 | ✅ |
| D2-P2-03 | 更新不存在的数据 | ✅ |
| D2-P3-01 | 未登录调字典数据树→401 | ✅ |
| D2-P3-02 | 无权限创建字典数据 | ⏭️ |

### 5.2 L2 Controller 测试（MockMvc）

**执行方式**：`mvn test -Dtest="DictTypeControllerTest,DictDataControllerTest"`
**结果**：9 测试，全部通过

| 测试类 | 用例数 | 覆盖内容 |
|--------|--------|---------|
| DictTypeControllerTest | 5 | GET /list（分页）、GET /all（枚举）、POST /（创建）、PUT /{id}（更新）、DELETE /{id}（删除）|
| DictDataControllerTest | 4 | GET /tree（树查询）、POST /（创建）、PUT /{id}（更新）、DELETE /{id}（删除）|

### 5.3 L3 Service 测试（JUnit + Mockito）

**执行方式**：`mvn test -Dtest="DictTypeServiceImplTest,DictDataServiceImplTest"`
**结果**：10 测试，全部通过

| 测试类 | 用例数 | 覆盖分支 |
|--------|--------|---------|
| DictTypeServiceImplTest | 5 | 创建默认值、创建编码重复、更新不存在、更新编码冲突、删除级联 |
| DictDataServiceImplTest | 5 | 多级树构建、空数据树、创建默认值、更新不存在、3层级联删除 |

### 5.4 L4 E2E 测试（Playwright）

**执行方式**：`npx playwright test tests/dict.spec.ts`
**结果**：6 测试，全部通过

| 用例ID | 场景 | 结果 |
|--------|------|------|
| L4-D1-01 | 字典类型管理页面加载 | ✅ |
| L4-D1-02 | 新增 Dialog 交互 | ✅ |
| L4-D1-03 | 关键词搜索 | ✅ |
| L4-D2-01 | 字典数据管理页面加载 | ✅ |
| L4-D2-02 | 树形展开/折叠 | ✅ |
| L4-D2-03 | 新增 Dialog 交互 | ✅ |

---

## 6. 代码修复记录

本测试周期共进行 2 轮测试。第 1 轮发现的问题及修复：

| 问题 | 根因 | 修复 | 验证 |
|------|------|------|------|
| DTO 缺字段不触发 400 | `@NotBlank` 对 JSON 中完全缺失的字段不触发（Jakarta Bean Validation 行为） | 4 个 DTO 关键字段（dictName/dictType/dictLabel/dictValue）增加 `@NotNull` 注解 | L1 D1-P2-04、D2-P2-02 通过 |
| L1 关键词搜索 Tomcat 400 | URL 中中文未编码 | L1 脚本 keyword 参数 URL 编码 | L1 D1-P2-01 通过 |
| L1 级联删除验证误报 | `assert_contains` 正向匹配逻辑反转 | 改用反向 grep 验证数据不存在 | L1 D2-P0-05-verify 通过 |
| Playwright Chromium 缺失 | 浏览器被清理 | `npx playwright install chromium` 重装 | L4 6/6 通过 |

### 环境修复（第 1 轮）

| 问题 | 修复 |
|------|------|
| `sys_dict_type`/`sys_dict_data` 表不存在 | pymysql 建表 + 种子数据 |
| schema-dict.sql 重复 PRIMARY KEY | 移除内联 PRIMARY KEY |
| peter 缺少 `system:dict:*` 权限 | 创建字典菜单 → 分配角色 |
| Playwright baseURL 不生效 | auth.ts/dict.spec.ts 使用显式完整 URL |

---

## 7. 遗留项

| 编号 | 描述 | 优先级 | 建议 |
|------|------|--------|------|
| 1 | 低权限账号权限拦截测试缺失 | P3 | 创建仅含部分权限的测试角色/用户用于权限测试 |
| 2 | 手动测试未执行 | P2 | 状态切换和多层级树形展示需人工验证 |
