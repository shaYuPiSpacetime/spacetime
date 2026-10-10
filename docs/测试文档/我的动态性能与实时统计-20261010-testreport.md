# 我的动态性能与实时统计 - 测试报告

日期：2026-10-10；用例来源：[testcase](./我的动态性能与实时统计-20261010-testcase.md)。当次开始已 fetch 并快进核对 origin/master，初始基线 0128f209；本次只提交明确任务文件，其他任务的未提交内容保留。共享工作区随后有其他任务正常提交 master，本次发布重新同步其已提交源码。

## 根因与修复

- 独立我的动态页把 meta/home-detail/summary/posts 放在 Promise.all，任何一个慢请求都会拖住全部显示。互动页一次请求四类记录和本人动态，且多个列表与统计共用 loading。
- 后端互动及旧浏览历史先加载全量，逐条加载作者、头像、字典、点赞与关注，再内存分页；互动用户和隐藏名单也存在全量与逐条组装。
- summary 用业务完整列表计数和求和；点赞/关注/删除等成功后没有统一刷新顶部统计。
- 改为当前栏目独立请求，summary 复用其本人资料字段且单独加载；未知数字展示占位，切换使用本人缓存并重新核对。成功写操作触发权威统计刷新，操作前迟到响应丢弃；页面可见时 15 秒轮询，返回刷新，隐藏/卸载清理。
- 后端单条 SQL 聚合，无统计长缓存；四类互动、旧浏览历史、互动用户、隐藏名单先数据库分页，当前页批量资料组装，稳定时间/id 倒序。meta 字典由 21 次查库合并为一次。维护 11 个幂等索引，并挂入生产自动迁移。

## 已执行结果

| 项目 | 结果 | 证据 |
| --- | --- | --- |
| L3 服务回归 | 59/59 通过 | Java 21 + Maven，CommunityServiceImplTest；包含 5 个新增统计/分页/查询次数/空页/名单回归。 |
| MyBatis SQL 分支与 COUNT 解析 | 2/2 通过 | CommunityPersonalQueryMapperTest；四类分支、父动态可见性、COUNT 保留 JOIN、用户名单去重。 |
| 小程序 React 运行态性能回归 | 5/5 通过 | test-community-personal-performance.cjs；真实挂载页面/Hook，注入慢请求、快速切换、迟到响应、账号切换、可见生命周期。 |
| 原千寻互动回归 | 10/10 通过 | test-qianxun-interactions-closure.cjs。 |
| SQL 隔离数据验证 | 通过 | test-community-personal-query-sql.py，SQLite 内存库执行源码 SQL；验证聚合口径、四类记录过滤、稳定分页、评论用户去重、隐藏名单、20,002 条记录分页和迁移接线。此项不是 MySQL 执行计划。 |
| 导航/无闪屏静态门禁 | 通过 | validate-native-navigation-and-qianxun-interactions.mjs。 |
| 生产部署配置门禁 | 通过 | validate-prod-deploy-config.mjs。 |
| 完整 tsc | 未通过（既有基线问题） | Taro 第三方声明缺失和已有业务类型错误；本次新 Hook/事件/服务无新增诊断，删除本次引入的未使用函数。最终微信构建、预构建和产物门禁均通过；完整 tsc 的已有错误未视为通过。 |

## 跳过与限制

- L1：现有已配置测试账号正常 phone-login 返回业务码 5001，未获得有效会话；没有发送短信、提取 Redis Token 或持久化会话。只读 L1 脚本已生成，等待正常测试会话。
- SQL-01 生产 EXPLAIN/SHOW INDEX：本机 backend/.env.local 不存在，没有可用数据库连接信息；生产迁移已由 CI 成功的 Deploy backend over SSH 步骤执行；脚本显式包含 110_community_personal_query_indexes.sql，set -e 下无迁移错误。没有直接 SHOW INDEX 或生产 MySQL EXPLAIN 证据，GitHub 原始日志 API 返回 403。
- L4 真机首次进入/切换及他人互动数字变化：未取得可用真实设备会话；React 注入测试不视为真机通过。

结论：本地实现与回归通过，线上性能及真机验收有条件通过；不声称线上耗时已下降或真机数字已核对。

## 发布

- 修复提交：`3be30c9e54540ebc4239e79f7e4b84655de2028a`，仅 21 个本次任务文件；已 Push 到 master，ls-remote 核对通过。
- 本次后端自动部署：[run 38016844076](https://github.com/shaYuPiSpacetime/spacetime/actions/runs/38016844076)，build/deploy 所有步骤 success；包括上传迁移与 Deploy backend over SSH 中执行 110 索引迁移。
- 第一次从已提交源码导出的构建被旧的“本人动态必须无操作”语法断言阻止。该门禁与 master 已允许本人删除的实现不一致；工作区内已有其他任务的未提交修正，本次没有代为提交或混入。待其他任务完成 `b7639e04` 提交后，重新 fetch/快进核对 origin/master，重新导出全新源码构建。
- 最终源码基线：`b7639e04536482c7f0e22209ad408c0c85e31ba7`。使用独立导出的已提交源码和本机现有依赖，排除其他未提交内容；执行 `npm run build:weapp` 的完整预构建、编译、产物门禁。87 页注册正确，无开发 Token；主包 1.49 MiB，总包 2.60 MiB。
- 上传前再次 ls-remote 确认远端仍为 b7639e04；微信 CLI 上传成功，版本 `1.0.20261010.1029`，日志 `√ upload`、退出 0 和 JSON 包体回执已核实。
- 只读 L1 另检查已有 frontend/e2e-tests/.env，其未配置有效的小程序 TOKEN；公共社区接口经全局鉴权返回 HTTP 错误，未将这些请求记为通过。未发送短信、创建测试账号或绕过鉴权。
- 最终源码基线 b7639e04 的后端部署：[run 38016979936](https://github.com/shaYuPiSpacetime/spacetime/actions/runs/38016979936)，build/deploy 所有步骤均 success；再次包含本次索引迁移与服务更新。部署成功不等同于登录会话下的线上响应耗时或真机体验已验收。


上传回执总包：2627655 字节。
