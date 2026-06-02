# Architecture Decisions

Record significant design decisions using the ADR format below. Each entry is immutable — if a decision is revisited, append a new entry that supersedes the old one.

---

## YYYY-MM-DD: [Short descriptive title]

### Context
Why was this decision needed? What problem does it solve? What are the constraints?

### Options Considered
1. **Option A** — Pros / Cons
2. **Option B** — Pros / Cons

### Decision
Chosen option and the rationale behind it.

### Consequences
- Positive: what becomes easier
- Negative: what becomes harder
- Migration: what existing code needs to change

---

<!-- Template for new entries:
##

### Context

### Options Considered

### Decision

### Consequences
-->

## 2026-05-29: PRD-05 首批采用社区主链路闭环方案

### Context
PRD-05 需求覆盖朋友内容、社区动态、评论、关注、举报、后台审核、通知、机审与配置，但当前仓库尚未落地 PRD-01 三项认证和 PRD-03 通知中心，若强行做“全量闭环”会导致范围失控或伪实现。

### Options Considered
1. **只做文档和配置预留** — 优点是交付快；缺点是无法支撑真实开发联调。
2. **首批闭环方案** — 优点是能落真实社区表、接口、后台审核页；缺点是认证/通知只能降级。
3. **直接做全量社区系统** — 优点是功能完整；缺点是依赖过多，超出当前仓库基础能力。

### Decision
选择 **首批闭环方案**。本期实现社区动态/诚意贴、评论、点赞、关注、举报、后台审核和社区轻配置；对三项认证、通知中心、微信机审仅保留配置契约和接入点，不伪造完整实现。

### Consequences
- Positive: 社区主链路、后台审核和测试资产可真实落地。
- Negative: 认证准入与互动通知无法在本期完全验证。
- Migration: 后续 PRD-01/03 落地后，只需在统一准入校验和事务后通知生产处补接，不需推翻接口。
