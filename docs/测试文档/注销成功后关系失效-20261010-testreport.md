# 注销成功后关系失效测试报告

日期：2026-10-10。来源：[测试用例](注销成功后关系失效-20261010-testcase.md)。

## 变更行为

用户确认“注销成功才执行，提交只是记录”。提交仅保存注销申请、资产/风险快照、冷静期和审计，不切换账号状态、不使喜欢/来访/匹配失效、不发布受限账号状态通知。撤销只结束申请，兼容旧版 CANCELLING 账号恢复，保留冻结等独立处罚。

到期执行与撤销共用申请行锁，锁内重新确认申请仍为冷静期且已到期。每条申请使用独立事务，最终账号注销、关系失效、申请终态、审计一起提交；任何写入失败全部回滚，另起事务为仍有效申请安排重试。后台 CANCELLING 不再使关系失效或匿名化；账号消息补偿只处理 FROZEN/CANCELLED。

同步更新 PRD-02/06 公共定义中的注销时机说明。

## 验证结果

Java 21，定向 Maven 测试 32/32 通过，零失败/错误：

- MiniappAccountSecurityServiceImplTest：9 项，覆盖提交、幂等、撤销、冻结保留、最终执行、阻断、过期扫描、撤销竞争和失败事务边界。
- MessageAccountFactReconcileServiceImplTest：2 项，覆盖冷静期不处理与冻结补偿。
- AccountStatusMessageReconcileMapperContractTest：1 项。
- AppUserAdminServiceImplTest：20 项，含后台注销中与正式注销的差异。

完整小程序 prebuild:weapp 门禁通过。工作区差异格式检查通过。

失败事务用 Mockito 验证 rollback 在重试更新与 commit 之前；未宣称完成真实数据库并发压测。L1/L4 未执行：没有独立测试账号的有效会话；未对生产真实账号再次执行注销。

## 交付

代码与测试已完成，master 推送、后端部署和体验版发布结果待核对。
