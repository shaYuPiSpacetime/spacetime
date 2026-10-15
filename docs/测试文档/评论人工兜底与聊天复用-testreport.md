# 评论人工兜底与聊天复用 - 测试报告

日期：2026-10-15
范围：评论机审异常转人工审核、管理端终态/机审历史展示、同会话私信页面复用与来源生命周期保护。

## 结论

本次聚焦自动化验证通过。评论在机审关闭、REVIEW、UNAVAILABLE 或空结果时保存为待人工审核，不进入公开列表、不增加公开计数；明确 REJECT 仍拒绝。人工通过使用版本 CAS，发布时间、审核备注和机器历史均保留。公开评论的创建、人工状态变更和删除统一锁定动态行，避免不同评论并发更新时丢失计数。

私信入口复用当前或页面栈内最近的同一会话，不重建聊天页；来源页隐藏、恢复、关闭目标或切换登录会话后，旧异步响应不会继续导航。同目标页面恢复会刷新悄悄话预检查，但保留用户输入草稿。

## 执行结果

| 层级 | 命令/范围 | 结果 |
|---|---|---|
| L2/L3 后端 | `CommunityServiceImplTest`、`CommunityAdminServiceImplTest`、权限、策略、回调、Mapper、SQL 静态契约共 7 类 | 177/177 通过，0 failure，0 error，0 skipped |
| 小程序 Node | `npm run validate:message-closure` | 90/90 通过；附加 whisper existing-entry 合约通过 |
| L4 管理端 | 隔离网络 Mock 的 `community-comment-manual.spec.ts` | 1/1 通过；待审→公开、统计刷新、机审历史保留、无页面异常 |
| 管理端构建 | `npm run build` | 通过；仅有既存大 chunk 提示 |
| 部署配置 | `node scripts/validate-prod-deploy-config.mjs` | 通过；SQL 113 已进入显式上传及迁移清单 |
| 静态质量 | 任务文件 `git diff --check` | 通过 |

## 关键覆盖

- 评论 PASS、REJECT、REVIEW、UNAVAILABLE、空结果、机审关闭六类决策。
- pending 的新旧管理入口审批、RBAC、旧版本、重复命令和同一评论 CAS 竞争。
- 待审/驳回/屏蔽删除不扣公开计数；公开评论只扣一次；审批与删除旧快照不能互相复活。
- 同一动态的创建、人工通过/驳回和删除通过 `selectByIdForUpdate` 串行化公开评论数变更。
- 当前同会话零导航、深层栈返回原实例、不同会话正常入栈、导航在途合并及失败重试。
- 匹配弹窗、用户主页、推荐页和悄悄话弹窗在切后台、恢复、关闭目标、换账号时丢弃旧响应。
- 悄悄话页面恢复不清空同一目标的输入草稿。

## 证据与边界

- 管理端截图证据位于忽略目录 `.runtime/community-chat-20261015/playwright-results/`，包含待人工审核页和人工通过后保留机审历史页。
- 独立只读复核结论位于 `.runtime/community-chat-20261015/final-targeted-review.md`：Approved，无未关闭 P0/P1/P2。
- 本轮没有原问题评论账号，未对共享数据库写入合成业务数据，也未伪造登录 Token；因此真实测试环境 L1 评论请求及微信内容安全外部错误码复现跳过。
- 存量 `CommunityCopyLiteralGuardTest` 会报告本次范围外的既有中文常量；本报告只声明上述明确列出的 177 项聚焦后端用例通过，不冒称后端全量测试通过。
