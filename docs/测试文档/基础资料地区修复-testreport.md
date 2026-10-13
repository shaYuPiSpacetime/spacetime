# 基础资料地区修复 - 测试报告

日期：2026-10-13。基线：master `fd4458988aa8b563d80dab52ae3ff3f282799ebc`。
关联：[测试用例](基础资料地区修复-testcase.md)、[实施计划](../superpowers/plans/2026-10-13-基础资料地区重选与导入校验.md)。

## 结论

有条件通过：地区故障已完成代码回归和指定账号数据修复；本账号鉴权保存→下一步的真机流程仍需验收，不能用组件测试或上传成功替代。后端自动部署及小程序上传核对结果在交付后补充。

## 结果

| 范围 | 结果 | 证据 |
| --- | --- | --- |
| L3 后台用户导入 | 23通过，0失败 | AppUserAdminServiceImplTest |
| L3 字典层级与导入解析 | 14通过，0失败 | ProfileDictionaryServiceTest |
| L3 小程序资料保存 | 34通过，0失败 | ProfileServiceImplTest |
| 小程序 profile 相关回归 | 51通过，0失败（其中地区13项，含城市滚动的加载/旧请求保护） | picker-green.log |
| 小程序既有 prebuild 门禁 | 380通过，0失败及全部静态门禁通过 | prebuild.log；部分与上述profile回归重叠，不重复累加 |
| 全项目 TypeScript | 120项既有错误；本次新增0，地区组件0 | 同配置同工作区仅替换本次组件为HEAD旧源码进行对照，两次诊断完整一致 |
| L1 公共两级地区字典 | HTTP成功，code200，上海310000→310100、天津120000→120100、北京110000→110100 | 实际公网只读调用 |
| DB 单账号纠错 | U1010仅1行、省份及更新时间改变；重复执行0行 | data-repair.log、data-idempotency.log |

## RED→GREEN

- 真实组件初次回归：旧实现5条失败（省码恢复、左轮滚动/点击后确认、未知省空城市静默保存、重复选当前省）。修复后通过。
- 实际导入入口回归：2条失败，旧实现同名上海省字段保存310100，5条错层级/跨父级行全部被导入；修复后全部拒绝错误行并保存正确省市。
- 审查补充：直接城市与合法扁平城市同名测试初次1条失败；合并候选后歧义失败关闭，明确编码均可消歧。
- effect宿主补充：重复选当前城市曾将已加载区县清空；现仅城市改变时重置，加载/失败/旧请求回归通过。

## 数据修复边界

- 使用现有DEV数据库连接，库为 `shikongxiehou`；仅用户授权指定账号U1010。未迁移全库，未声称其他环境同步修复。
- SQL位于 `deploy/sql/ops/2026-10-13-repair-profile-location-province.sql`，不属于自动执行的生产迁移。
- 锁定目标行、校验身份哈希和原省市、启用字典父子关联后更新。首次因历史字段排序规则冲突完整回滚；改为二进制精确比较后成功提交。
- 现居地为310000/310100/310104；完整前后列对比仅location_province/update_time变化。家乡、完成标志、全部审核记录保持不变，basic_profile_completed仍为0，须真实保存成功后进入下一步。

## 执行命令与证据目录

原始日志：`.runtime/profile-edit-flow-19900000002-20261013/`（忽略目录，未提交凭据或用户完整资料）。

```text
Java21 + Maven离线：-Dtest=AppUserAdminServiceImplTest,ProfileDictionaryServiceTest,ProfileServiceImplTest test
cd miniapp: node --test scripts/test-profile-edit-closure.cjs
cd miniapp: npm run prebuild:weapp
cd miniapp: npx tsc --noEmit --pretty false
node .runtime/profile-edit-flow-19900000002-20261013/typecheck-baseline.cjs
```

## 未执行/遗留项

| 项目 | 原因 | 补验收要求 |
| --- | --- | --- |
| L1-02/M-01 本账号保存及真机下一步 | 没有可用本账号授权会话，不伪造登录令牌、不替用户完成资料流程 | 新体验版选择上海/天津并确认，下一步无地区错误；保持认证流程真实判断 |
| L4 浏览器完整认证流程 | 本次是微信原生小程序，不以管理端Playwright冒充真机 | 用户真机复测 |
| 全项目TypeScript清零 | 既有120项错误，本次组件无诊断变化，修复无关模块超出范围 | 另行治理，不记录为通过 |

## 审查与交付

只读独立审查无Critical；已整改直接/扁平同名候选歧义、补足effect覆盖，不改聊天或认证权限。
交付核对待当次构建、提交、Push与独立目录上传后补充。
