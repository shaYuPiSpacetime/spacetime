# 动态重提与理想型年龄测试报告

日期：2026-10-10。依据：[测试用例](动态重提与理想型年龄-20261010-testcase.md)。

## 生产诊断

用户授权账号 173****9764 的只读诊断：[状态审计](https://github.com/shaYuPiSpacetime/spacetime/actions/runs/38030680478)、[命中规则核验](https://github.com/shaYuPiSpacetime/spacetime/actions/runs/38030799753)，均成功。

- 14:11:38 和 14:11:49 两次重新提交分别创建新帖 293、294；旧帖完成删除状态迁移，resubmit 审计均 success。
- 两条新帖均重新审核并返回 rejected，命中 `local_sensitive_word:145429`。规则是启用的“赌博”，确实存在字面匹配。因此此次现场原因是新正文再次被本地规则驳回，不是后端沿用旧审核状态。
- 未输出用户正文、图片、手机号或凭证，未直接修改生产动态或敏感词规则。未取得正文语境，未将字面命中直接认定为内容违规或语义误判。

## 修改

- 重提接口成功后立即通知仍挂载的两处本人动态列表：以新帖身份、内容和真实审核状态替换旧卡片，清除旧失败原因与互动数，阻止旧请求回写。返回页面继续查询服务端最新状态。
- 服务端驳回回执提供可展示的安全审核说明；再次被驳回时编辑页直接弹出“重新审核未通过”，确认后返回列表。不会把 rejected 强行改成审核中。
- 理想型未解锁结果沿用兼容字段 `ageBand`，值改为实际周岁，例如 `28岁`。按北京时间出生日期计算；无生日时回退历史年龄，都缺失则“年龄保密”。保持原有头像、身份、主页解锁规则。
- 补充缺失年龄测试时发现 `ProfileAgeFilter.currentAge` 三元表达式隐式拆箱 null 会抛异常，已改为显式分支。

## 验证

| 项目 | 结果 |
| --- | --- |
| 修复前重提回执回归 | 两个真实 React 列表在回执后仍为旧失败状态，断言失败 |
| 修复前年龄回归 | 期望实际周岁，实际 `25-29岁`，3 个生日边界用例失败 |
| 小程序定向回归 | 21 项通过，覆盖真实服务回执、真实编辑页二次驳回弹窗、两处列表标签点击、慢请求、刷新失败、审核新状态回查 |
| CommunityServiceImplTest | 61 项通过，含重提通过、待审、再次驳回和原有权限/并发回归 |
| IdealServiceImplTest / ProfileAgeFilterTest | 39 + 1 项通过，含生日当天、生日未到/已过、旧年龄、年龄缺失 |
| 微信最终构建 | `npm run build:weapp` 通过；87 页注册通过，无开发 Token；主包 1.40 MiB，总包 2.81 MiB |
| TypeScript | 仓库整体仍有既有类型错误；此次新增事件模块及新增逻辑未引入报错。已有互动页 nullable/矩形回调和 CommunityConfig.publishStatuses 错误仍在 |
| 微信真实运行 | 未计为通过；本机模拟器启动故障，无该账号登录会话，未伪造 Token |
| 生产账号数据 | 只读审计通过；不等同于真机弹窗和新版流程已验收 |

本机日志：`C:/Users/39384/.codex/tmp/post-resubmit-red.log`、`post-resubmit-green.log`、`ideal-age-red.log`、`ideal-age-green-final.log`、`resubmit-mvn-final.log`、`resubmit-age-types.log`。

## 发布

代码提交 `79ec5265564039dfbbcf98eeb677052e8f3f3e17`，已推送 master。最终发布源码 `d7f35bd98587fab4126f299a10afa63d475349c8`：构建门禁发现弹窗 fallback 没走统一文案函数，已修正，并通过定向回归、静态门禁和全新构建。

当次实际 fetch 并同步 origin/master，最终从上述源码构建；上传前 ls-remote 与 HEAD 一致。最终构建日志：`C:/Users/39384/.codex/tmp/resubmit-age-build-release.log`。

- [后端自动部署 38030979884](https://github.com/shaYuPiSpacetime/spacetime/actions/runs/38030979884)：对应后端修复提交 `79ec5265`，build/deploy 及各步骤均 success；后续 `d7f35bd9` 仅调整小程序文案函数。
- 体验版 `1.0.20261010.1430` 上传成功：CLI 退出码 0、`√ upload`；回执总包 2,838,997 bytes。
- 上传日志与回执：`C:/Users/39384/.codex/tmp/resubmit-age-upload.log`、`resubmit-age-upload.json`。

结论：自动回归、构建和部署完成；真机弹窗与年龄展示验收保留。该账号再次驳回的原因已经由生产审计确认。
