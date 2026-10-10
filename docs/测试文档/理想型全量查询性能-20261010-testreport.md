# 理想型全量查询性能 - 测试报告

日期：2026-10-10。关联：理想型全量查询性能-20261010-testcase.md。

## 结论

本地64项定向测试通过，部署后L1待验证。

## 变更

- AppUser候选查询去掉LIMIT 500、最近登录与用户ID排序；保留基础业务过滤，仅选择12个匹配/准入字段。
- 新快照用同一固定时间和查询位置序号保存数据库返回顺序，后续登录不影响翻页；兼容历史快照固定顺序。删除应用层重复排序。
- 候选落库从逐条INSERT改为每批最多500行的参数化多行INSERT；1201行只需3次SQL调用，保留审计/逻辑删除字段。
- 搜索及结果页按500人批量检查有效解锁状态；结果页按20个快照位置批量加载用户、认证和屏蔽关系，不可见用户跳过后继续补足一页。

## 测试结果

| 测试类 | 通过 |
|---|---:|
| IdealServiceImplTest | 46 |
| IdealControllerTest | 3 |
| IdealUnlockServiceImplTest | 5 |
| IdealHistoryServiceImplTest | 6 |
| IdealSnapshotCandidateBatchTest | 3 |
| Prd08RecommendIdealDaoArchitectureTest | 1 |
| 合计 | 64 |

无失败、无跳过。新增1201候选尾部命中、全量保存与固定查询顺序、千人列表批量检查、不可见补位/跨页不漏、批量SQL及参数绑定测试。首次测试补齐了测试环境Lambda列元数据初始化后通过；生产代码使用Spring/MyBatis正常元数据。

执行命令：Java21，`mvn -Dtest=IdealServiceImplTest,IdealControllerTest,IdealUnlockServiceImplTest,IdealHistoryServiceImplTest,IdealSnapshotCandidateBatchTest,Prd08RecommendIdealDaoArchitectureTest test`。

## 线上基线（修复前）

账号173****9764，采用实时meta城市/年龄，未修改偏好；仅免费筛选，不解锁。

| 条件 | 人数 | 搜索耗时 | 首屏耗时 | 第二页耗时 |
|---|---:|---:|---:|---:|
| 无附加条件 | 488 | 4.008s | 4.130s | 3.234s |
| 喜欢旅行 | 369 | 4.474s | 3.533s | 3.014s |

每页20条，两页无重复。耗时包含客户端网络，仅为实际样本，非并发压测/SLA。无本次前端变更，L4不适用。

## 交付与上线验证

待记录代码SHA、自动部署、体验版、部署后相同条件人数和耗时。

规模边界：去掉人数上限，但一次搜索仍在内存保存所有基础条件候选与匹配快照，结果页仍读取完整快照条目以计算总数。已消除主要逐人数据库往返；更大规模的内存与并发性能需按实际数据量另行压测，不能由千人回归推断无限容量。
