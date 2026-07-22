# 字典管理 - 测试用例

> **关联文档**：
> - 测试报告：`docs/测试文档/字典管理-testreport.md`
> **创建日期**：2026-05-13
> **测试模式**：轻量模式（用户指定 L1+L2+L3+L4 全量）；2026-07-22 按分页缺陷进入增量模式
> **目标项目**：后端 `backend/` / 前端 `frontend/`

---

## 1. 测试策略决策

用户明确要求 L1+L2+L3+L4 全量生成，跳过自动评分。

| 层级 | 内容 | 技术 |
|------|------|------|
| L1 | 接口连通、参数校验、权限拦截、业务分支 | cURL 脚本（bash） |
| L2 | Controller 路由绑定、注解生效、响应结构 | MockMvc + JUnit 5 |
| L3 | Service 纯业务逻辑：树构建、级联删除、重复校验 | JUnit 5 + Mockito |
| L4 | 前端 UI 交互：字典类型 CRUD、字典数据树形管理 | Playwright |

---

## 2. 代码变更概览

### 后端 Controller 接口

| 控制器 | 方法 | 路径 | 权限 |
|--------|------|------|------|
| DictTypeController | GET | `/admin/dict-type/list` | `system:dict:list` |
| DictTypeController | GET | `/admin/dict-type/all` | `system:dict:list` |
| DictTypeController | POST | `/admin/dict-type` | `system:dict:add` |
| DictTypeController | PUT | `/admin/dict-type/{id}` | `system:dict:edit` |
| DictTypeController | DELETE | `/admin/dict-type/{id}` | `system:dict:delete` |
| DictDataController | GET | `/admin/dict-data/children` | `system:dict:list` |
| DictDataController | POST | `/admin/dict-data` | `system:dict:add` |
| DictDataController | PUT | `/admin/dict-data/{id}` | `system:dict:edit` |
| DictDataController | DELETE | `/admin/dict-data/{id}` | `system:dict:delete` |

### 后端 Service 关键分支

| 方法 | 分支条件 | 行为 |
|------|---------|------|
| DictTypeServiceImpl.create | 编码已存在 | 抛 `BusinessException("字典类型编码已存在")` |
| DictTypeServiceImpl.create | 正常 | 默认 dictSort=0, status=ENABLED |
| DictTypeServiceImpl.update | 实体不存在 | 抛 `BusinessException("字典类型不存在")` |
| DictTypeServiceImpl.update | 编码被其他记录占用 | 抛 `BusinessException("字典类型编码已被其他字典使用")` |
| DictTypeServiceImpl.delete | 实体存在 | 先删关联 dictData（by dictType），再删自身 |
| DictDataServiceImpl.children | dictType/parentId 无数据 | 返回空数组 |
| DictDataServiceImpl.children | 有数据 | 返回直接子级并标识 `hasChildren`，由前端懒加载 |
| DictDataServiceImpl.create | 正常 | 默认 parentId=0, dictSort=0, status=ENABLED |
| DictDataServiceImpl.update | 实体不存在 | 抛 `BusinessException("字典数据不存在")` |
| DictDataServiceImpl.delete | 有子节点 | 递归收集子孙 ID，批量级联删除 |

### 前端页面

| 页面 | 路由 | 组件 |
|------|------|------|
| 字典类型管理 | `/system/dict-type` | `DictTypeManagement.tsx` |
| 字典数据管理 | `/system/dict-data` | `DictDataManagement.tsx` |

---

## 3. L1 - 接口测试用例

### 3.1 字典类型管理（DictTypeController）

| 用例ID | 优先级 | 场景 | 接口 | 期望结果 |
|--------|-------|------|------|---------|
| D1-P0-01 | P0 | 分页查询字典类型列表 | `GET /admin/dict-type/list?page=1&size=10` | 200, data.records[] |
| D1-P2-01 | P2 | 按关键词搜索 | `GET /admin/dict-type/list?keyword=性别` | 200, records 中所有 name/type 含"性别" |
| D1-P2-02 | P2 | 按状态筛选 | `GET /admin/dict-type/list?status=ENABLED` | 200, records 中 all status=ENABLED |
| D1-P0-02 | P0 | 查询全部启用字典类型 | `GET /admin/dict-type/all` | 200, data[] |
| D1-P0-03 | P0 | 创建字典类型 | `POST /admin/dict-type` | 200, data=id |
| D1-P2-03 | P2 | 创建时编码重复 | `POST /admin/dict-type` (已存在编码) | 200 body, code=5001, msg="字典类型编码已存在" |
| D1-P2-04 | P2 | 缺少必填字段 | `POST /admin/dict-type` (缺 dictName) | 400 |
| D1-P0-04 | P0 | 更新字典类型 | `PUT /admin/dict-type/{id}` | 200 |
| D1-P2-05 | P2 | 更新不存在的 ID | `PUT /admin/dict-type/999999` | 200 body, code=5001, msg="字典类型不存在" |
| D1-P2-06 | P2 | 编码被其他记录占用 | `PUT /admin/dict-type/{id}` (编码=已有) | 200 body, code=5001, msg="字典类型编码已被其他字典使用" |
| D1-P0-05 | P0 | 删除字典类型（级联删数据） | `DELETE /admin/dict-type/{id}` | 200 |
| D1-P3-01 | P3 | 未登录调列表 | `GET /admin/dict-type/list` (无 Token) | 401 |
| D1-P3-02 | P3 | 无权限调创建 | `POST /admin/dict-type` (无 system:dict:add) | 403 |

### 3.2 字典数据管理（DictDataController）

| 用例ID | 优先级 | 场景 | 接口 | 期望结果 |
|--------|-------|------|------|---------|
| D2-P0-01 | P0 | 查询字典数据直接子级 | `GET /admin/dict-data/children?dictType=gender&parentId=0` | 200, data[]，节点含 hasChildren |
| D2-P2-01 | P2 | 不存在的字典类型 | `GET /admin/dict-data/children?dictType=not_exist&parentId=0` | 200, data=[] |
| D2-P0-02 | P0 | 创建顶级字典数据 | `POST /admin/dict-data` (parentId=0) | 200, data=id |
| D2-P0-03 | P0 | 创建子级字典数据 | `POST /admin/dict-data` (parentId=父ID) | 200, data=id |
| D2-P2-02 | P2 | 缺少必填字段 | `POST /admin/dict-data` (缺 dictLabel) | 400 |
| D2-P0-04 | P0 | 更新字典数据 | `PUT /admin/dict-data/{id}` | 200 |
| D2-P2-03 | P2 | 更新不存在的 ID | `PUT /admin/dict-data/999999` | 200 body, code=5001 |
| D2-P0-05 | P0 | 级联删除字典数据 | `DELETE /admin/dict-data/{parentId}` (有子节点) | 200 |
| D2-P3-01 | P3 | 未登录调子级接口 | `GET /admin/dict-data/children?dictType=gender&parentId=0` (无 Token) | 401 |
| D2-P3-02 | P3 | 无权限调创建 | `POST /admin/dict-data` (无 system:dict:add) | 403 |

---

## 4. L2 - Controller 测试用例

| 用例ID | 优先级 | 场景 | 被测方法 | Mock | 验证 |
|--------|-------|------|---------|------|------|
| L2-D1-01 | P1 | DictType 分页列表路由绑定 | `GET /admin/dict-type/list` | service.list() 返回 Page | jsonPath $.code=200, $.data.records 存在 |
| L2-D1-02 | P1 | DictType 全部枚举路由绑定 | `GET /admin/dict-type/all` | service.all() 返回 List | jsonPath $.code=200, $.data 为数组 |
| L2-D1-03 | P1 | DictType 创建路由+校验 | `POST /admin/dict-type` | service.create() 返回 1L | jsonPath $.code=200, $.data=1 |
| L2-D1-04 | P1 | DictType 创建失败（缺少字段） | `POST /admin/dict-type` (body={}) | — | 400 |
| L2-D1-05 | P1 | DictType 更新路由绑定 | `PUT /admin/dict-type/1` | service.update() 无返回值 | jsonPath $.code=200 |
| L2-D1-06 | P1 | DictType 删除路由绑定 | `DELETE /admin/dict-type/1` | service.delete() 无返回值 | jsonPath $.code=200 |
| L2-D2-01 | P1 | DictData 子级查询路由绑定 | `GET /admin/dict-data/children?dictType=gender&parentId=0` | service.children() 返回 List | jsonPath $.code=200, $.data 为数组 |
| L2-D2-02 | P1 | DictData 创建路由+校验 | `POST /admin/dict-data` | service.create() 返回 1L | jsonPath $.code=200, $.data=1 |
| L2-D2-03 | P1 | DictData 创建失败（缺少字段） | `POST /admin/dict-data` (body={}) | — | 400 |
| L2-D2-04 | P1 | DictData 更新路由绑定 | `PUT /admin/dict-data/1` | service.update() 无返回值 | jsonPath $.code=200 |
| L2-D2-05 | P1 | DictData 删除路由绑定 | `DELETE /admin/dict-data/1` | service.delete() 无返回值 | jsonPath $.code=200 |

---

## 5. L3 - Service 测试用例

| 用例ID | 优先级 | 场景 | Mock DAO 行为 | 验证 |
|--------|-------|------|-------------|------|
| L3-D1-01 | P1 | DictType 创建成功（含默认值） | dictTypeDao.selectByCode → null | dictTypeDao.insert() 被调用，entity.dictSort=0, status=ENABLED |
| L3-D1-02 | P1 | DictType 创建-编码重复 | dictTypeDao.selectByCode → 已存在实体 | 抛 BusinessException("字典类型编码已存在") |
| L3-D1-03 | P1 | DictType 更新-实体不存在 | dictTypeDao.selectById → null | 抛 BusinessException("字典类型不存在") |
| L3-D1-04 | P1 | DictType 更新-编码冲突 | selectById → entity(id=1), selectByCode → other(id=2) | 抛 BusinessException("字典类型编码已被其他字典使用") |
| L3-D1-05 | P1 | DictType 删除-级联删数据 | selectById → entity(dictType="gender") | dictDataDao.deleteByDictType("gender") 先调，dictTypeDao.deleteById(1L) 后调 |
| L3-D2-01 | P1 | DictData 树构建-多级嵌套 | selectList → [parent(id=1,parentId=0), child(id=2,parentId=1)] | 返回 1 个根节点，根节点含 1 个子节点 |
| L3-D2-02 | P1 | DictData 树构建-空数据 | selectList → [] | 返回空列表 |
| L3-D2-03 | P1 | DictData 创建-默认值 | — | dictDataDao.insert() 被调用，parentId=0, dictSort=0, status=ENABLED |
| L3-D2-04 | P1 | DictData 更新-不存在 | selectById → null | 抛 BusinessException("字典数据不存在") |
| L3-D2-05 | P1 | DictData 级联删除 3 层嵌套 | selectList → [grandpa(id=1,pid=0), dad(id=2,pid=1), son(id=3,pid=2)] | deleteById(1), deleteById(2), deleteById(3) 均被调用 |

---

## 6. L4 - E2E 测试用例

| 用例ID | 优先级 | 场景 | 操作步骤 | 期望结果 |
|--------|-------|------|---------|---------|
| L4-D1-01 | P1 | 字典类型管理页面加载 | 登录 → 导航到 /system/dict-type | 表格可见，"字典类型管理"标题可见 |
| L4-D1-02 | P1 | 字典类型新增 Dialog 交互 | 点击"新增字典类型" → 填写表单 → 取消 | Dialog 弹出/关闭正常 |
| L4-D1-03 | P1 | 字典类型搜索 | 输入关键词 → 点击搜索 | 表格刷新 |
| L4-D2-01 | P1 | 字典数据管理页面加载 | 登录 → 导航到 /system/dict-data | 字典类型下拉框可见 |
| L4-D2-02 | P1 | 字典数据树形展开/折叠 | 选择有数据的字典类型 → 点击展开/折叠按钮 | 子行显示/隐藏 |
| L4-D2-03 | P1 | 字典数据新增 Dialog 交互 | 点击"新增字典数据" → 填写表单 → 取消 | Dialog 弹出/关闭正常 |

---

## 7. 手动测试用例

| 用例ID | 优先级 | 场景 | 操作步骤 | 期望结果 | 实际结果 | 状态 |
|--------|-------|------|---------|---------|---------|------|
| M-D1-01 | P2 | 字典类型状态切换 | 编辑字典类型 → 将状态改为 DISABLED → 保存 | 列表状态列显示"禁用" | | |
| M-D2-01 | P2 | 字典数据多层级展示 | 创建3级字典数据 → 在字典数据页展开 | 树形缩进正确，3级可见 | | |

## 8. 2026-07-22 字典管理回归增量

> 本轮覆盖用户反馈的每页 20/50 条失效，以及审计发现的字典类型编码迁移、树形父子完整性和按钮权限问题。

### 8.1 L1 接口增量

| 用例ID | 优先级 | 场景 | 接口 | 期望结果 |
|--------|-------|------|------|---------|
| D1-P0-06 | P0 | 每页 20 条 | `GET /admin/dict-type/list?page=1&size=20` | data.size=20，records 最多 20 条 |
| D1-P0-07 | P0 | 每页 50 条 | `GET /admin/dict-type/list?page=1&size=50` | data.size=50，records 最多 50 条 |
| D1-P1-01 | P1 | 修改存在数据的字典类型编码 | `PUT /admin/dict-type/{id}` | 类型记录与全部关联字典数据在同一事务内迁移到新编码 |
| D2-P2-04 | P2 | 在不存在的字典类型下创建数据 | `POST /admin/dict-data` | code=5001，不写入孤儿数据 |
| D2-P2-05 | P2 | 父节点不存在或属于其他字典类型 | `POST/PUT /admin/dict-data` | code=5001，不写入跨类型父子关系 |
| D2-P2-06 | P2 | 上级选择自身或后代 | `PUT /admin/dict-data/{id}` | code=5001，拒绝形成循环层级 |
| D2-P2-07 | P2 | 修改已有节点所属字典类型 | `PUT /admin/dict-data/{id}` | code=5001，避免子树被拆散；类型迁移只能通过字典类型更新完成 |

### 8.2 L3 Service 增量

| 用例ID | 优先级 | 场景 | Mock DAO 行为 | 验证 |
|--------|-------|------|-------------|------|
| L3-D1-06 | P1 | DictType 编码修改 | 原编码存在且新编码未占用 | 查询旧编码数据并逐条 `updateById` 迁移，新旧编码更新处于同一事务 |
| L3-D2-06 | P1 | DictData 创建校验类型 | `dictTypeDao.selectByCode` 返回 null | 抛 BusinessException，insert 不执行 |
| L3-D2-07 | P1 | DictData 创建校验父级 | 父级不存在/类型不同 | 抛 BusinessException，insert 不执行 |
| L3-D2-08 | P1 | DictData 更新拒绝自身/后代父级 | parent 链回到当前 ID | 抛 BusinessException，update 不执行 |
| L3-D2-09 | P1 | DictData 更新拒绝改变类型 | 请求 dictType 与实体不同 | 抛 BusinessException，update 不执行 |

### 8.3 L4 E2E 增量

| 用例ID | 优先级 | 场景 | 操作步骤 | 期望结果 |
|--------|-------|------|---------|---------|
| L4-D1-04 | P0 | 字典类型每页条数切换 | 进入第 2 页后分别选择 20/50 条每页 | 请求分别携带 size=20/50、页码回到 1，选择器保持选中值 |
| L4-D1-05 | P2 | 搜索条件应用与重置 | 在非第 1 页输入条件后搜索，再重置 | 搜索仅按已提交条件请求；无旧页请求覆盖新结果；重置回到第 1 页 |
| L4-D1-06 | P3 | 字典类型操作权限 | 仅有 `system:dict:list` 权限进入页面 | 新增、编辑、删除入口均不可见 |
| L4-D2-04 | P3 | 字典数据操作权限 | 仅有 `system:dict:list` 权限进入页面 | 新增、添加子节点、编辑、删除入口均不可见 |
| L4-D2-05 | P2 | 编辑节点上级选项 | 打开节点编辑框 | 当前节点及已加载后代不出现在父级候选项中 |

### 8.4 手动增量

| 用例ID | 优先级 | 场景 | 操作步骤 | 期望结果 | 实际结果 | 状态 |
|--------|-------|------|---------|---------|---------|------|
| M-D1-02 | P0 | 字典类型分页 | 数据量大于 50 条时切换 10/20/50 并前后翻页 | 条数、总页数、请求参数与表格行数一致 | | |
| M-D2-02 | P1 | 字典类型编码迁移 | 修改含多层数据的类型编码后打开字典数据页 | 原有多层数据完整显示，无孤儿数据 | | |
