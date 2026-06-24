---
name: git-utils
description: Git workflow automation — branch management, commits, and PR creation
user-invocable: true
allowed-tools: Bash
context: fork
agent: general-purpose
---

# Git Utils Skill

Standard git operations wrapped as reusable skills. Invoke via `/git-utils` or mention "create a branch" / "commit changes".

## Operations

### `create-branch <name>`
Create a new feature branch from the base branch. Always fetch latest base first.

```
git fetch origin
git checkout -b <name> origin/main
```

### `commit-changes <message>`
Stage tracked changes and commit. Message should follow conventional commits format.

```
git add -A
git commit -m "<type>(<scope>): <description>"
```

### `sync-branch`
Push the current branch and create a PR if one doesn't exist.

```
git push -u origin HEAD
gh pr create --fill
```

## Notes
- Always fetch the latest base branch before branching
- Commit format: `feat|fix|refactor|chore(scope): message`
