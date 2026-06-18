# QA Summary

Verification results appended by the QA engineer after each test run.

---

## YYYY-MM-DD: [Feature / Fix Title]

### Test Results

| Status | Count |
|--------|-------|
| Passed |       |
| Failed |       |
| Skipped |      |
| Coverage |     |

### Issues Found

| Severity | File | Line | Description |
|----------|------|------|-------------|
| critical/high/medium/low | `path` | N | Issue description |

### Verdict

- [ ] **PASS** — All acceptance criteria met, no critical defects
- [ ] **FAIL** — See issues above

### Notes

## 2026-05-29: PRD-05 社区互动首批闭环

### Test Results

| Status | Count |
|--------|-------|
| Passed | 待执行 |
| Failed | 待执行 |
| Skipped | 3类能力 |
| Coverage | 未执行 |

### Issues Found

| Severity | File | Line | Description |
|----------|------|------|-------------|
| medium | `docs/技术方案/2026-05-29-PRD-05-推荐模块（朋友、社区与内容互动）-tcdesign.md` | N/A | 三项认证真实校验依赖 PRD-01，当前仅支持配置降级 |
| medium | `docs/技术方案/2026-05-29-PRD-05-推荐模块（朋友、社区与内容互动）-tcdesign.md` | N/A | 互动通知依赖 PRD-03，当前仅做接口预留 |
| medium | `docs/技术方案/2026-05-29-PRD-05-推荐模块（朋友、社区与内容互动）-tcdesign.md` | N/A | 微信内容机审未接入，当前统一人工审核 |

### Verdict

- [ ] **PASS** — All acceptance criteria met, no critical defects
- [ ] **FAIL** — See issues above

### Notes
受仓库 AGENTS 约束，本轮改动后不执行编译、单测、Playwright 或构建命令；仅补齐测试设计与测试脚本。

## 2026-06-17: PRD-07 推广裂变与邀请奖励

### Test Results

| Status | Count |
|--------|-------|
| Passed | 后端全量单测 148/149、推广单测 39/40、前端构建 1、L1 28、L4 6 |
| Failed | 0 |
| Skipped | 后端种子数据测试 1、L1 3 个导出保留项 |
| Coverage | 代码审查 + L1 真实 token + L2/L3 单测 + 前端构建 + L4 Playwright Chromium |

### Issues Found

| Severity | File | Line | Description |
|----------|------|------|-------------|
| low | `docs/测试文档/推广裂变-test-l1.sh` | N/A | L1 写入型状态流转用例会消费冻结奖励、冻结关系、结算状态数据；复跑前需重新准备对应测试数据 |
| low | 导出中心 | N/A | 3 个导出用例为需求保留，等待全后台导出中心上线后补测 |
| low | `frontend/src/router/index.tsx` | N/A | 关系详情、代理详情已拆出；结算明细等剩余细分路由后续继续补齐 |

### Verdict

- [x] **PASS** — All acceptance criteria met, no critical defects
- [ ] **FAIL** — See issues above

### Notes
本轮先修复了 review 发现的代码缺口：规则配置保存、风控持久化、邀请关系解除冻结/置无效、素材页和素材停用/重生成、二维码版本递增、邀请关系缺失字段与相关测试。随后继续补了 `/promotion/invite-relation/:id` 关系详情和 `/promotion/agent/:id` 代理详情，并修正 E2E 默认地址与选择器。目标库已按授权补齐 PRD-07 正式版字段、`promo_agent_stat` 表和存量代理统计行；后端 `mvn test` 通过：149 run, 0 failures, 0 errors, 1 skipped；前端 `npm run build` 通过；Playwright Chromium 通过：6 passed；L1 使用 peter 管理端账号和 mock miniapp token 复跑到 28 passed / 0 failed / 3 skipped，跳过项均为导出中心保留项。
