---
name: implement
description: Implement a Spacetime change while following the repository's existing Claude/Codex workflows.
disable-model-invocation: true
---

Before editing, read `/Users/peter/spacetime/AGENTS.md`, `TEAM_STANDARDS.md`, the applicable `.agents/skills/` workflow, and the current branch/worktree state. Use OpenSpec apply when the task is an OpenSpec change; use the documented PRD/technical-design workflow for those artifacts. Use `/tdd` only together with the repository's `code-test` and `test-suite` rules. Run verification before reporting completion. Do not commit, push, switch branches, modify production data, or expose secrets unless explicitly requested.
