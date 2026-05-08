---
name: test-suite
description: Run the project test suite, filter by file, and collect coverage reports
user-invocable: true
allowed-tools: Bash Read
context: fork
agent: general-purpose
---

# Test Suite Skill

Run and manage tests. Invoke via `/test-suite` or when Claude detects test-related tasks.

## Operations

### `run-all`
Run the full test suite. Auto-detects the framework.

### `run-file <path>`
Run tests in a specific file.

### `coverage`
Run tests with coverage reporting.

## Framework Detection

| Config File | Framework |
|---|---|
| `jest.config.*` | `npx jest` |
| `vitest.config.*` | `npx vitest run` |
| `pytest.ini` / `pyproject.toml` (pytest) | `python -m pytest` |
| `package.json` scripts | `npm test` / `yarn test` |

## Reporting

After running tests, summarise:
- Total passed / failed / skipped
- Coverage percentages (lines, branches, functions)
- Any new failures with file:line references
