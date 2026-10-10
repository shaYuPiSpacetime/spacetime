# 理想型全量查询性能 - 测试报告

日期：2026-10-10。关联：理想型全量查询性能-20261010-testcase.md。

## 结论

通过：本地64项定向测试及部署后2组L1搜索/分页验证通过。

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

- 代码提交：`7abefb19d78d5274f82f396ad7ce45796a193f4f`，已Push master，实际远端SHA核对一致。
- 后端自动部署：[38034291646](https://github.com/shaYuPiSpacetime/spacetime/actions/runs/38034291646)，build/deploy全部success。
- 体验版：`1.0.20261010.1525`，官方CLI确认`√ upload`，回执2,847,970 bytes。
- 发布前重新fetch并ff同步master，从该提交导出干净miniapp源码构建，上传前核对实际远端与构建SHA一致。其余任务工作区修改保留；87页面注册、无开发Token、包体门禁通过。

| 条件 | 部署后人数 | 搜索耗时 | 首屏耗时 | 第二页耗时 |
|---|---:|---:|---:|---:|
| 无附加条件 | 488 | 1.733s | 2.199s | 1.652s |
| 喜欢旅行 | 369 | 1.413s | 2.066s | 1.524s |

两组均每页20条，两页无重复、偏好不变。使用相同脚本及实际meta筛选范围。当前账号可见人数与基线相同，不能宣称本次线上人数增加；取消截断的正确性由1201候选尾部命中测试和生成查询无LIMIT/ORDER BY验证。实际生产样本搜索从4.008/4.474秒降至1.733/1.413秒，页面也改善；包含网络，不代表并发或所有设备下相同耗时。

规模边界：去掉人数上限，但一次搜索仍在内存保存所有基础条件候选与匹配快照，结果页仍读取完整快照条目以计算总数。已消除主要逐人数据库往返；更大规模的内存与并发性能需按实际数据量另行压测，不能由千人回归推断无限容量。
