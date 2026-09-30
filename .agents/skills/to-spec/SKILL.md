---
name: to-spec
description: Turn a settled Spacetime conversation into the repository's appropriate PRD, technical design, or OpenSpec artifact.
disable-model-invocation: true
---

Synthesize without re-interviewing, after reading `AGENTS.md`, `TEAM_STANDARDS.md`, and the relevant existing workflow skill. Route the result by task type: formal PRD to `docs/需求文档/` through `prd-design`, technical design to `docs/技术方案/` through `techni-design`, and implementation changes to the existing `openspec/` workflow. Preserve Controller -> Service -> ServiceImpl -> DAO -> DAOImpl -> Mapper, the admin/miniapp separation, and current API/RBAC conventions.
