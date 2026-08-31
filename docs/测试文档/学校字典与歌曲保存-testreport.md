# 学校字典与歌曲保存测试报告

## 1. 结论

测试日期：2026-08-31。学校字典推荐方案、C 端接口、小程序对接和爱听歌曲保存主链路均通过。本次执行 L1 + L2 + L3，共 52 个后端自动化测试、52 个小程序 PRD01/学校契约测试及 1 次真实微信小程序构建；另完成真实 HTTP 与真实 GuGuData 验证。

## 2. 执行结果

| 测试项 | 结果 | 证据 |
| --- | --- | --- |
| 后端 JUnit/MockMvc | PASS | `Tests run: 52, Failures: 0, Errors: 0, Skipped: 0` |
| GuGuData 实网适配器 | PASS | `GuGuDataCollegeSearchProviderLiveTest` 1/1，通过真实 AppKey 查询 |
| 学校 C 端真实 HTTP | PASS | 连续两次返回 `code=200`、3 条；浙江大学编码 `10335` |
| 本地回写幂等 | PASS | 重复请求后本地 3 行、三方 UUID 去重后仍为 3 |
| 字段注释迁移 | PASS | 本地、生产 `school_dictionary` 均为 24 列，`COLUMN_COMMENT` 为空的列均为 0 |
| 生产增量迁移 | PASS | 单独执行 `079_prd01_school_dictionary_gugudata.sql`；两个用户表的 `school_code` 均存在 |
| 歌曲搜索/保存/反查 | PASS | 测试用户 231，脱敏手机号 `191****8328`；三接口均 200，歌曲 ID 一致 |
| 小程序 PRD01 门禁 | PASS | 原 49 项 + 新增学校对接 3 项，共 52 项通过 |
| 微信小程序真实构建 | PASS | `npx taro build --type weapp`，28.15 秒编译成功 |
| 生产部署总校验器 | BLOCKED（存量） | 被非本次文件 `013_prd01_drop_legacy_audit_tables.sql` 的存量幂等规则拦截 |
| L4 微信端自动化 | SKIP | 当前没有微信开发者工具自动化会话和可用测试账号；已用契约测试与真实 Taro 构建替代 |

说明：本机 Maven 在中文路径下首次编译偶发 `无法关闭编译器资源`，编译产物生成后重跑成功；最终成功结果如上。Taro 仅报告已有 `pages/message/private-chat.js` 275 KiB 体积警告，与本次变更无关。

## 3. 真实返回摘录

学校 `GET /miniapp/dict/schools?keyword=浙大&limit=10`：

| code | name | city | 985 | 211 | 双一流 | source |
| --- | --- | --- | --- | --- | --- | --- |
| 13021 | 浙大城市学院 | 杭州市 | false | false | false | GUGUDATA |
| 13022 | 浙大宁波理工学院 | 宁波市 | false | false | false | GUGUDATA |
| 10335 | 浙江大学 | 杭州市 | true | true | true | GUGUDATA |

歌曲链路：

```json
{
  "loginCode": 200,
  "searchCode": 200,
  "searchCount": 1,
  "saveCode": 200,
  "savedSong": "晴天 / 周杰伦",
  "detailCode": 200,
  "detailSong": "晴天 / 周杰伦",
  "sameSongId": true
}
```

## 4. 执行命令

```text
mvn -Dtest=ProfileServiceImplTest,VerificationServiceImplTest,SchoolDictionaryServiceImplTest,GuGuDataCollegeSearchProviderTest,GuGuDataCollegeSearchProviderLiveTest,MiniappDictControllerTest,MiniappDictServiceImplTest,MockSongSearchProviderTest test
npm run validate:prd01-handoff
npx taro build --type weapp
```

三方密钥从被 Git 忽略的测试/生产私有配置加载，报告中未记录密钥值。
