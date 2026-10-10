# 撤销注销关系恢复测试报告

日期：2026-10-10。来源：[测试用例](撤销注销关系恢复-20261010-testcase.md)。账号仅以 173****9764 标识。

## 根因与只读证据

[第一次生产审计](https://github.com/shaYuPiSpacetime/spacetime/actions/runs/38031553651)和[注销事件核对](https://github.com/shaYuPiSpacetime/spacetime/actions/runs/38031680297)均成功。

- 账号 NORMAL，首登完成，认证记录有效。
- 2026-10-10 14:16:37 ACCOUNT_CANCEL/APPLY，14:16:40 ACCOUNT_CANCEL/REVOKE；注销申请最终 RESTORED。用户确认本人在小程序注销后撤销。
- 25 条发出喜欢、9 条收到喜欢、16 条收到来访，在同一时刻被置为 invalid/account_deleted；事实及访问事件仍在库中。
- 14:38:34 至 14:38:38 新增 3 条有效喜欢，排除整条写入链路停止。
- `MiniappAccountSecurityServiceImpl.applyCancel` 使历史关系失效，`revokeCancel` 仅恢复账号 NORMAL；关系列表只读取有效记录，因此呈现空态。
- 推荐额度重置仅操作当前周期推荐 view，不操作喜欢或来访表。

## 用户授权的恢复范围

用户明确选择恢复此次受影响记录。使用独立 ops 脚本：仅精确注销时间和账号，双方正常，无当前拉黑，无后续喜欢生命周期；排除已取消、旧失效和新记录冲突。逐行备份，事务内更新及完成标记；重复执行不再次恢复。来访保留原时间，仍遵守 7 天与访客去重展示规则。未修改产品注销规则或制造新互动。

## 验证与执行

- 工作流 YAML 解析、Python 编译、限定文件差异检查：通过。
- 独立 MySQL 8 测试：全部通过，包括精确范围、备份、双向喜欢、来访、后续生命周期、拉黑、异常对方、重复执行、5 组拒绝条件和中途失败整体回滚。
- 生产恢复：[工作流 38031939298](https://github.com/shaYuPiSpacetime/spacetime/actions/runs/38031939298) completed/success，源码 `99ca035b9576a8642a2b013c11283ef4dbe8a5ed`。
- 生产事务结果：恢复我喜欢的 25 条、喜欢我的 9 条、来访 16 条；恢复后有效发出喜欢总计 28 条（保留新增 3 条），有效收到喜欢 9 条；最近 7 天按访客去重 1 位。
- 恢复前原行保留在 `ops_bak_20261010_cancel_likes` 和 `ops_bak_20261010_cancel_visits`；事务完成标记为 `restore_cancel_20261010_141637_a27e58`。
- L1/L4 小程序页面验证未执行：无有效账号登录会话，未制造凭据。

本次为账号数据恢复，不构建或上传小程序。其他任务的未提交前端修改未纳入本次提交。
