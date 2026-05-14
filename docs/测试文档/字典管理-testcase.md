# 字典管理 - 测试用例

> **关联文档**：
> - 测试报告：`docs/测试文档/字典管理-testreport.md`
> **创建日期**：2026-05-13
> **测试模式**：轻量模式（用户指定 L1+L2+L3+L4 全量）
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
| DictTypeController | GET | `/admin/dict-type/all` | — |
| DictTypeController | POST | `/admin/dict-type` | `system:dict:add` |
| DictTypeController | PUT | `/admin/dict-type/{id}` | `system:dict:edit` |
| DictTypeController | DELETE | `/admin/dict-type/{id}` | `system:dict:delete` |
| DictDataController | GET | `/admin/dict-data/tree` | `system:dict:list` |
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
| DictDataServiceImpl.tree | dictType 无数据 | 返回空数组 |
| DictDataServiceImpl.tree | 有数据 | 递归构建树形 VO |
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
| D2-P0-01 | P0 | 查询字典数据树 | `GET /admin/dict-data/tree?dictType=gender` | 200, data[] |
| D2-P2-01 | P2 | 不存在的字典类型 | `GET /admin/dict-data/tree?dictType=not_exist` | 200, data=[] |
| D2-P0-02 | P0 | 创建顶级字典数据 | `POST /admin/dict-data` (parentId=0) | 200, data=id |
| D2-P0-03 | P0 | 创建子级字典数据 | `POST /admin/dict-data` (parentId=父ID) | 200, data=id |
| D2-P2-02 | P2 | 缺少必填字段 | `POST /admin/dict-data` (缺 dictLabel) | 400 |
| D2-P0-04 | P0 | 更新字典数据 | `PUT /admin/dict-data/{id}` | 200 |
| D2-P2-03 | P2 | 更新不存在的 ID | `PUT /admin/dict-data/999999` | 200 body, code=5001 |
| D2-P0-05 | P0 | 级联删除字典数据 | `DELETE /admin/dict-data/{parentId}` (有子节点) | 200 |
| D2-P3-01 | P3 | 未登录调树接口 | `GET /admin/dict-data/tree?dictType=gender` (无 Token) | 401 |
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
| L2-D2-01 | P1 | DictData 树查询路由绑定 | `GET /admin/dict-data/tree?dictType=gender` | service.tree() 返回 List | jsonPath $.code=200, $.data 为数组 |
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
