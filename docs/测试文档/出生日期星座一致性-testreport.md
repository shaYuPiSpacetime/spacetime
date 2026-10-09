# 出生日期星座一致性 - 测试报告

## 1. 测试概况

| 项目 | 信息 |
|---|---|
| 日期 | 2026-10-09 |
| 范围 | 出生日期派生星座、所有资料投影入口、后台导入与历史数据迁移 |
| 测试设计 | [出生日期星座一致性-testcase.md](./出生日期星座一致性-testcase.md) |
| 执行方式 | TDD 红绿验证、L3 定向单测、SQL/发布工作流静态契约 |
| 本机环境 | Windows，Microsoft JDK 21.0.11 |

## 2. 复现与修复证据

修复前，基础资料和公开主页都直接返回 `app_user.zodiac`。新增用例将生日设置为 `2003-05-28`、历史星座设置为“水瓶座”，两个用例均稳定失败，实际值为“水瓶座”、期望值为“双子座”。

修复后统一使用生日派生规则；资料保存继续同步写入星座，管理端导入在生日存在时忽略外部星座值。新增 107 迁移用于修正未删除用户的历史缓存。

## 3. 执行结果

```powershell
$env:JAVA_HOME='C:\Users\50449\.jdks\ms-21.0.11'
mvn '-Dtest=ProfileZodiacTest,AppUserZodiacMigrationTest,ProfileServiceImplTest,MiniappPublicProfileServiceImplTest,RecommendServiceImplTest,MiniappRelationServiceImplTest,CommunityServiceImplTest,AppUserAdminServiceImplTest' test
```

| 测试类 | 数量 | 结果 |
|---|---:|---|
| ProfileZodiacTest | 26 | 通过 |
| AppUserZodiacMigrationTest | 2 | 通过 |
| ProfileServiceImplTest | 34 | 通过 |
| MiniappPublicProfileServiceImplTest | 18 | 通过 |
| RecommendServiceImplTest | 37 | 通过 |
| MiniappRelationServiceImplTest | 19 | 通过 |
| CommunityServiceImplTest | 54 | 通过 |
| AppUserAdminServiceImplTest | 19 | 通过 |
| 合计 | 209 | 209 通过，0 失败，0 错误，0 跳过 |

## 4. 结论与未执行项

本地代码与迁移契约验证通过。未执行 L1/真机验收，也未直接修改测试或生产数据库；107 迁移将在后续后端发布流程中执行。
