# 推荐偏好候补与全池扫描 - 测试报告

日期：2026-10-10。测试用例：同目录 `推荐偏好候补与全池扫描-20261010-testcase.md`。实现基线：master `e49e6d51`；交付提交与线上核对将在发布后补充。

## 原因与修改

指定账号 173****9764 的准入正常，剩余浏览额度 19，原接口返回零候选、`no_candidate`。其偏好版本 20：上海及周边、18–60 岁、仅认证，会员高级条件包含家乡北京市。原查询将这些偏好全部作为硬过滤，没有候补阶段。

调整为精确城市 → 已开启的周边城市 → 全池候补。候补放宽偏好但保留平台准入、异性、正常账号和关系排除。扫描预算仍为单请求三批，每批六十条，未结束时返回游标继续；候补去重沿用实际生日年龄和直辖市编码语义。无偏好写入，无数据库迁移，无页面修改。

## 本地测试

| 检查 | 结果 |
|---|---|
| RecommendServiceImplTest | 47/47 通过，含新增 10 个候补/全池场景 |
| RecommendControllerTest | 5/5 通过 |
| ProfileAgeFilterTest + MunicipalityLocationCodesTest | 4/4 通过 |
| 小程序推荐角标及分页收集器 | 7/7 通过 |
| git diff --check | 通过 |

Java 21 执行：`mvn -Dtest=RecommendServiceImplTest,RecommendControllerTest,ProfileAgeFilterTest,MunicipalityLocationCodesTest test`。Node 执行：`node --test scripts/test-recommend-badge-20260929.cjs`。

新增核心用例先在旧实现上执行，七个业务断言失败，确认能检出缺少候补/跨阶段扫描的缺陷。实现后全部通过。超过千条场景使用 1,020 条未准入用户加尾部合格用户，经过 19 次批查询成功返回尾部用户；每次请求均不超过三批，空续扫页不提前返回终态。

## 发布与线上核对

待执行：同步最新 origin/master、提交与 Push、后端自动部署、从最新源码构建上传体验版、通过 L1 脚本核对真实候选与偏好。此阶段尚未宣称线上生效。

线上脚本只读取偏好与候选，不执行 view/like/save；候选读取仍按现有逻辑记 issued，不扣浏览额度。Token 仅在运行进程内使用，报告仅记录脱敏账号、数量和版本。

## 结论

本地 63 项检查通过；交付与线上验证待完成。每次只收集剩余额度内的推荐，“全池扫描”不代表绕过安全准入或一次展示全部注册用户。
