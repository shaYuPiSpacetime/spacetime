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
| 生产配置静态检查 | `node scripts/validate-prod-deploy-config.mjs` | 通过；检查镜像、网关与迁移引用 |
| 后端官网定向单测 | `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -q -f backend/pom.xml -Dtest=WebsitePolicyTest,WebsiteServiceImplTest,WebsiteRouteSecurityTest,WebsiteAdminServiceImplTest test` | 通过；覆盖业务约束、待审核图片、报名幂等、私聊访问、CSRF 与审核原因 |
| 本地浏览器 | 访问 `http://127.0.0.1:4173/` | 已观察首页、关于我们、业务介绍文案一致，导航、备案入口及登录协议弹窗可见；修复了首页装饰卡片遮挡文字 |
| 全量后端单测 | `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -q -f backend/pom.xml test` | 1,096 项，1 失败、3 错误、1 跳过。4 项失败均在未改动的 HEAD 基线复现，见下文 |

### 全量测试的既有失败

将 HEAD 的 `backend/` 单独解包，在相同 Java 21 环境运行 `RecommendServiceImplTest,CommercialAdminServiceImplTest,AppUserAuditServiceTest`，56 项中复现相同的 1 失败、3 错误：

1. `RecommendServiceImplTest.savePreferencesShouldDisableNeighborCityWithoutConfiguredMapping`：预期 0，实际 1。
2. `RecommendServiceImplTest.expiredVipPreferenceShouldRoundTripWithoutAdvancedFields`：`onlyCertifiedUsers` 为 `null`。
3. `CommercialAdminServiceImplTest.saveConfig_shouldAllowCoinPriceAboveOldOriginPrice`：模拟分页结果为 `null`。
4. `AppUserAuditServiceTest.shouldApproveAndAppendHistory`：`appUserDao` 为 `null`。

这些既有失败与官网模块不共用业务实现。全量测试当前不能标为通过。

## 测试用例对应状态

| 用例 | 状态 | 证据或缺口 |
| --- | --- | --- |
| F1-P0-01 手机注册、协议同意 | 部分通过 | 协议版本和会话代码已实现，浏览器看到弹窗；缺少独立测试库和可控短信验证码，未完成真实注册 |
| F1-P0-02 图文发布与审核 | 部分通过 | 单测验证待审内容隔离、审核图片状态；未实际连接 OSS 和数据库 |
| F1-P0-03 免费报名 | 部分通过 | 单测验证重复报名不再次插入；未执行双账号数据库流程 |
| F1-P0-04 私聊文字与图片 | 部分通过 | 单测验证待审图片只给发送者、公开接口拒绝聊天图片；未执行双账号收发 |
| F1-P1-05 敏感词拦截 | 通过单测 | `WebsitePolicyTest` 验证命中和词库不可用均拒绝 |
| F1-P1-06 下架、举报和留痕 | 部分通过 | 审核原因单测通过；未实际执行后台全流程 |
| F1-P3-07 权限隔离 | 通过单测 | 私有图片匿名访问 401、非成员读取拒绝、后台正文和导出各有独立权限、写操作有 CSRF 校验 |
| F1-P1-08 六个月日志 | 静态核对 | 表包含 `retain_until`，代码设为当前时间后 190 天；未做数据库留存时长实测 |
| L2-01/L2-02 | 通过单测 | `WebsiteRouteSecurityTest` |
| L3-01 至 L3-04 | 通过单测 | `WebsitePolicyTest`、`WebsiteServiceImplTest`、`WebsiteAdminServiceImplTest` |
| L4-01 | 部分通过 | 本地桌面浏览器观察首页、关于我们、业务介绍；未核对公网版本 |
| L4-02/L4-03 | 未执行 | 未部署新版本；本机没有独立 MySQL 测试实例，移动端视口验收待补 |

## 上线前必须完成

1. 业务与法务审定迁移 `096_website_activity_platform.sql` 中的网站专用用户协议、隐私政策正文，并核对备案服务项目及当前免费业务口径。迁移中的两份初稿状态为 `DRAFT`；取得定稿后写入新版本并设为 `PUBLISHED`，验证两个协议接口均可返回正式正文，方可开放注册并发布网站镜像。
2. 在可回滚环境执行迁移，验证网站 OSS 对象私有 ACL 写入、读回权限、短信通道与 Redis；缺少 OSS 私有 ACL 权限时停止发布。
3. 先发布后端与迁移，再发布网站静态镜像及网关。使用两名受控测试用户和具备官网权限的管理员完成注册→图文发布→人工审核→私聊文字与图片→免费报名→举报处置。
4. 在 `https://www.shikongxiehou.com` 重做上述全流程，确认活动图片审核前不可访问、聊天图片不能被非会话成员访问、审核原因与日志可查，且无支付入口或支付订单。

**结论：**代码构建和官网定向单测已通过；线上全流程与正式发布尚未验收，因此暂不能宣称官网已上线或达到公网闭环。
