# Active Plan

<!--
This file is the single source of truth for what is being worked on.
It is updated by the architect and read by the implementer and QA engineer.
-->

## Objective

落地 PRD-05 推荐模块首批闭环：社区动态/诚意贴、评论、点赞、关注、举报、后台审核与社区轻配置。

## Steps

1. [x] 梳理 PRD-05、现有代码与依赖边界，明确首批实现范围
2. [x] 编写 PRD-05 技术方案和测试用例文档
3. [ ] 实现小程序社区主链路后端接口
4. [ ] 实现后台社区审核、举报处理、配置接口
5. [ ] 实现后台社区管理聚合页与前端 API
6. [ ] 补充 L1/L3/L4 测试资产与完成度说明

## Acceptance Criteria

- [ ] 小程序社区接口支持列表、详情、发布、评论、点赞、关注、举报
- [ ] 后台支持内容审核、评论审核、举报处理、社区配置查询保存
- [ ] 前端存在可访问的社区管理页面与静态路由
- [ ] `docs/技术方案`、`docs/测试文档` 产物齐全
- [ ] 明确记录 PRD-01/03 未落地导致的降级项

## Status

**Status**: In Progress

**Blockers**: PRD-01 三项认证、PRD-03 通知中心尚未落地，只能做接入预留和测试跳过说明。

**Decisions**: `.claude/memory/decisions.md` 2026-05-29 PRD-05 首批采用社区主链路闭环方案

---

## History

| Date | Status | Notes |
|------|--------|-------|
| 2026-05-29 | In Progress | 已完成方案与测试文档，正在实现社区模块首批代码 |
