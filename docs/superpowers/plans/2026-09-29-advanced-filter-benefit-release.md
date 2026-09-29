# 修复偏好设置身高体重滑块禁用（精准筛选会员权益未启用）

**日期：** 2026-09-29

## 问题

用户反馈：账号「小坏公主」（18616646192）在偏好设置中身高/体重滑块滑不动，且自述已是会员。

## 根因（两条叠加）

1. **配置缺陷（核心）**：`app_vip_benefit` 表中 `advanced_filter`（精准筛选功能）权益状态为 `DISABLED`。后端 `RecommendServiceImpl.hasEffectiveBenefit()` 要求「用户 VIP 有效 且 权益状态 ENABLED」才返回 `vipEffective=true`，因此**所有会员用户**在偏好设置接口中 `vipEffective=false`，小程序端滑块 `disabled={!model.vipEffective}` 被禁用。
2. **账号状态**：用户 821 当天注册，`app_user_asset.vip_status=inactive`、无任何会员订单，该账号本身不是会员。

## 修复

- 新增幂等 SQL `deploy/sql/prod/105_enable_advanced_filter_benefit.sql`，将 `advanced_filter` 置为 `ENABLED`；dev 与 prod 共用同一 RDS 库，SQL 直接执行即全环境生效。
- 为测试账号 821 开通会员（`vip_status=active`，到期 2027-09-29），满足用户测试诉求。

## 验证

- 后端单测 `RecommendServiceImplTest`、`VipServiceImplTest` 共 31 个用例全部通过（Java 21）。
- 本地 dev 后端连生产库，模拟 821 登录调用 `GET /miniapp/recommend/preferences`，返回 `vipEffective: true`（code 200）。
- 前端页面每次进入均重新拉取接口，无缓存，重新打开偏好设置即生效。

## 发布结果

- 提交 `65a008b1 fix(db): 启用精准筛选会员权益，修复偏好设置身高体重滑块禁用` 已推送 `master`。
- 本次为纯数据修复，无后端/小程序代码变更，不涉及镜像构建与体验版上传；Push master 触发的生产流水线无代码差异。

## 遗留

- 用户最初反馈的「点击不看ta动态全部报错」问题按用户要求本次不处理；远程已有 `a36a3f7a fix(community): prevent hide author outbox collisions` 相关修复，后续需真机复测确认。
