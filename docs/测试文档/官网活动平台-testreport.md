# 官网活动平台 - 测试报告

> 日期：2026-09-28
> 对应测试设计：[官网活动平台-testcase.md](./官网活动平台-testcase.md)
> 范围：网站客户端、`/website/**`、网站审核后台、迁移与部署配置

## 已执行结果

| 范围 | 命令或方式 | 结果 |
| --- | --- | --- |
| 官网构建 | `npm run build --prefix website` | 通过；Vite 产物生成 |
| 管理后台构建 | `cd frontend && npm run build` | 通过；原有大包体积警告仍存在 |
| 官网契约 | `node scripts/test-official-website.mjs` | 通过；检查路由、真实 API、免费报名口径、备案入口与构建转发 |
| 正式协议迁移 | `node scripts/generate-website-legal-sql.mjs --check` | 通过；版本 1.1 正文与发布 SQL 一致，含运营主体、阿里云短信及 OSS 和公开联系入口 |
| 生产配置静态检查 | `node scripts/validate-prod-deploy-config.mjs` | 通过；检查镜像、网关与迁移引用 |
| 后端官网定向单测 | `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -q -f backend/pom.xml -Dtest=OssUtilWebsiteBucketTest,WebsitePolicyTest,WebsiteServiceImplTest,WebsiteRouteSecurityTest,WebsiteAdminServiceImplTest test` | 通过；覆盖业务约束、待审核图片、报名幂等、私聊访问、CSRF、访客反馈限流与隔离、审核原因及私有 OSS Bucket 隔离 |
| 同域 POST 回归 | `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -q -f backend/pom.xml -Dtest=WebConfigCorsTest,WebsiteRouteSecurityTest,WebsiteServiceImplTest test` | 通过；先复现官网同域 POST 被拒，再限定 `www` 来源只访问 `/website/**`，管理端跨域仍拒绝 |
| 本地浏览器 | 访问 `http://127.0.0.1:4173/` | 已观察首页、关于我们、业务介绍文案一致，导航、备案入口及登录协议弹窗可见；修复了首页装饰卡片遮挡文字 |
| 公网浏览器 | Chrome for Testing，1365px 与 390px | 首页、关于我们、业务介绍、两份协议、举报和登录页正常；无横向溢出和页面脚本错误；浏览器同域 POST 到短信接口返回预期的无效号码业务错误 |
| 全量后端单测 | `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -q -f backend/pom.xml test` | 1,096 项，1 失败、3 错误、1 跳过。4 项失败均在未改动的 HEAD 基线复现，见下文 |

公网截图：[桌面](./验收截图/官网/production-2026-09-28-desktop.png)、[手机](./验收截图/官网/production-2026-09-28-mobile.png)。

### 全量测试的既有失败

将 HEAD 的 `backend/` 单独解包，在相同 Java 21 环境运行 `RecommendServiceImplTest,CommercialAdminServiceImplTest,AppUserAuditServiceTest`，56 项中复现相同的 1 失败、3 错误：

1. `RecommendServiceImplTest.savePreferencesShouldDisableNeighborCityWithoutConfiguredMapping`：预期 0，实际 1。
2. `RecommendServiceImplTest.expiredVipPreferenceShouldRoundTripWithoutAdvancedFields`：`onlyCertifiedUsers` 为 `null`。
3. `CommercialAdminServiceImplTest.saveConfig_shouldAllowCoinPriceAboveOldOriginPrice`：模拟分页结果为 `null`。
4. `AppUserAuditServiceTest.shouldApproveAndAppendHistory`：`appUserDao` 为 `null`。

这些既有失败与官网模块不共用业务实现。全量测试当前不能标为通过。

## 生产预检与迁移

- 已在生产服务器备份数据库：`/mnt/data/spacetime-prod/backups/website-before-096-20260928113528.sql.gz`，压缩包校验通过。
- `097` 和 `098` 迁移前已另行备份举报与协议表：`/mnt/data/spacetime-prod/backups/website-before-097-098-20260928120114.sql.gz`，使用 `--set-gtid-purged=OFF`，压缩包校验通过。
- 已执行 `096`、`097`、`098` 三项官网迁移；回查得到 10 张官网表、举报人可为空、回复渠道字段存在、2 份版本 1.1 的 `PUBLISHED` 协议、8 个官网权限及 8 条超管授权。
- 共用的小程序 OSS Bucket 存在向匿名主体开放 `oss:*` 的桶策略；在该桶内即使 Object ACL 为 `private`，匿名 GET 仍返回 200。因此官网不能继续存入该公共桶。
- 已使用同一组生产 OSS 凭证创建官网专用私有 Bucket `skxh-website-private-e28dcac56c`；实测桶 ACL 为 `private`、无桶策略，上传私有对象成功，匿名 GET 返回 403、授权 GET 和限时签名 URL 均返回 200，测试对象已删除。生产环境已配置 `WEBSITE_OSS_BUCKET_NAME`，代码改为只在专用桶上传、读取及签发管理员临时 URL；缺少配置或与公共桶同名时失败关闭。
- 公共桶对匿名主体开放过宽权限是现存独立风险；本轮不修改小程序公共桶策略，避免影响已有小程序上传链路，需单独收紧并做回归。
- `master` 发布提交 `1dcd66f8`：后端流水线 [36376012950](https://github.com/shaYuPiSpacetime/spacetime/actions/runs/36376012950) 与网站流水线 [36376012948](https://github.com/shaYuPiSpacetime/spacetime/actions/runs/36376012948) 均成功。公网验证发现同域 POST 被 CORS 阻止后，修复提交 `5a82b7c9` 经后端流水线 [36376449689](https://github.com/shaYuPiSpacetime/spacetime/actions/runs/36376449689) 成功发布。
- 公网回查：官网首页、举报、两份协议、管理后台、Demo、后端健康和活动列表均 HTTP 200；两份协议 API 返回版本 1.1；私有图片接口未登录返回 401；跨站 POST 返回 403；同域 POST 到无效号码与无效举报对象均到达业务校验。三个生产容器均运行中。

## 测试用例对应状态

| 用例 | 状态 | 证据或缺口 |
| --- | --- | --- |
| F1-P0-01 手机注册、协议同意 | 部分通过 | 正式协议 API 返回 1.1，浏览器看到弹窗，同域 POST 到达短信校验；缺少两部受控手机号及验证码，未完成真实注册 |
| F1-P0-02 图文发布与审核 | 部分通过 | 单测验证待审内容隔离、审核图片状态；私有 OSS 桶独立读写预检通过，官网数据库迁移通过；未执行经网站 API 的上传和审核 |
| F1-P0-03 免费报名 | 部分通过 | 单测验证重复报名不再次插入；未执行双账号数据库流程 |
| F1-P0-04 私聊文字与图片 | 部分通过 | 单测验证待审图片只给发送者、公开接口拒绝聊天图片；未执行双账号收发 |
| F1-P1-05 敏感词拦截 | 通过单测 | `WebsitePolicyTest` 验证命中和词库不可用均拒绝 |
| F1-P1-06 下架、举报和留痕 | 部分通过 | 审核原因单测通过；未实际执行后台全流程 |
| F1-P3-07 权限隔离 | 通过单测 | 私有图片匿名访问 401、非成员读取拒绝、后台正文和导出各有独立权限、写操作有 CSRF 校验 |
| F1-P1-08 六个月日志 | 静态核对 | 表包含 `retain_until`，代码设为当前时间后 190 天；未做数据库留存时长实测 |
| F1-P1-09 访客举报与隐私联系 | 部分通过 | 未登录页面和独立联系入口已在公网可用；同源 POST 可到达业务校验，跨站拒绝；单测覆盖写入、后台展示、IP 频控和私聊对象限制。未创造生产测试举报，公网实际写入待验收 |
| L2-01/L2-02 | 通过单测 | `WebsiteRouteSecurityTest` |
| L3-01 至 L3-04 | 通过单测 | `WebsitePolicyTest`、`WebsiteServiceImplTest`、`WebsiteAdminServiceImplTest` |
| L4-01 | 通过 | 公网桌面与手机浏览器核对首页、关于我们、业务介绍免费报名文案和页脚入口；无旧婚恋宣传及支付入口 |
| L4-02 | 未执行 | 缺少两部受控手机号及验证码、管理员测试会话，未进行双账号注册、审核、私聊和报名公网闭环 |
| L4-03 | 部分通过 | 1365px 与 390px 下七个公开页面无横向溢出和页面脚本错误；表单完整交互待受控账号验收 |
| M-04 私有图片桶 | 通过底层预检 | 生产 OSS 匿名访问 403、授权访问 200；网站 API 权限隔离待端到端验收 |

## 上线后待补的验收与合规核对

1. 版本 1.1 正文已发布并经公网 API 回查，公开联系表单可访问。完整法定名称按本机企业文件核对；ICP备案号沿用现有网站标识，备案服务项目未能通过主管部门查询系统独立核验，需运营方继续核对。
2. 生产迁移与私有 OSS 桶底层预检已通过；仍需用受控账号经网站 API 验证图片审核前不可公开、短信送达与 Redis 会话。
3. 使用两部受控手机号及验证码和具备官网权限的管理员，在 `https://www.shikongxiehou.com` 完成注册→图文发布→人工审核→私聊文字与图片→免费报名→举报处置，并核查日志和无支付订单。

**结论：**官网与后端已上线，公开页面、协议、免费活动接口、同域 POST 与权限边界经公网验证；缺少受控双账号及管理员会话，注册、审核、私聊、报名的生产端到端闭环仍未完成验收，不能宣称全部验收通过。
