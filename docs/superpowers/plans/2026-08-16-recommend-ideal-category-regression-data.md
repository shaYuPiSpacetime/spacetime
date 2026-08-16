# 推荐与理想型分类回归数据 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为固定生产验收账号补齐推荐候选、五类推荐动作、理想型六大分类快照及有效/失效解锁记录，形成可重复执行、可核验、可回归的生产标准测试数据。

**Architecture:** 新增独立的手工运维种子 SQL，不进入自动迁移目录；只通过固定验收手机号定位主账号，只新增带稳定 `REG-RI-*` 标识的虚构候选和关联记录。脚本使用事务、前置断言、唯一业务键和 `ON DUPLICATE KEY UPDATE` 保证幂等，并在末尾输出分类计数；Node 静态契约测试负责阻止数据量、分类覆盖和安全边界回退。

**Tech Stack:** MySQL 8、Node.js `node:test`、Spring Boot 3.4、Taro 小程序、生产 HTTP API。

## Global Constraints

- 不删除、不批量更新真实用户数据，不修改验收账号余额和真实交易流水。
- 虚构候选不写手机号、身份证、微信号等可联系身份；所有新增数据使用稳定种子标识。
- 理想型覆盖产品定义的六大分类：外在条件、教育背景、经济实力、家庭背景、兴趣爱好、感情与经历。
- 推荐动作覆盖 `view/detail/skip/like/never`，且 `view` 不消耗当天额度。
- 至少新增 12 名可用候选；每个理想型分类至少 4 条快照候选；有效和失效解锁状态均可回归。
- 生产执行前后记录聚合计数；同一脚本连续执行两次，第二次不得新增重复业务记录。

### Task 1: 建立种子数据静态契约

**Files:**
- Create: `scripts/test-recommend-ideal-category-seed.cjs`
- Test: `scripts/test-recommend-ideal-category-seed.cjs`

**Steps:**
1. 断言新 SQL 必须通过手机号定位验收账号，并在账号不存在时 `SIGNAL` 终止。
2. 断言事务、稳定标识、幂等写入及禁止 `DELETE/TRUNCATE`。
3. 断言至少 12 名新增候选、五类推荐动作、六大理想型分类、每类至少 4 个候选以及有效/失效解锁数据。
4. 先运行测试并确认因 SQL 尚不存在而失败。

### Task 2: 实现幂等分类回归数据

**Files:**
- Create: `deploy/sql/ops/2026-08-16-seed-recommend-ideal-category-regression.sql`

**Steps:**
1. 新增 12 名资料完整、三项认证通过且带头像/背景/相册/介绍的虚构候选。
2. 写入五类推荐动作记录；`never` 同步写入“不再推荐”关系，保持业务一致性。
3. 写入六个分类快照，每个快照关联 4 名真实满足该分类条件的新候选，并补一个过期快照。
4. 写入可追踪的有效/失效理想型解锁记录，不改余额、不伪造支付流水。
5. 输出候选、动作、分类、快照状态、解锁状态和重复业务键核验结果。

### Task 3: 执行生产数据并验证幂等

**Files:**
- Modify: `docs/测试文档/PRD08推荐与理想型条件筛选-testcase.md`
- Modify: `docs/测试文档/PRD08推荐与理想型条件筛选-testreport.md`

**Steps:**
1. 执行静态种子契约测试。
2. 在生产数据库执行脚本一次，保存各类计数。
3. 再执行一次，比较用户、快照、候选、动作和解锁业务键数量，确认完全幂等。
4. 通过生产 API 验证推荐列表、理想型元数据、筛选记录、结果页和历史解锁响应。
5. 运行 PRD-08 后端定向测试、小程序静态门禁和生产构建，将结果写入独立测试报告。

### Task 4: 提交与交付

**Files:**
- Review: all changed files

**Steps:**
1. 执行 `git diff --check` 和工作区检查。
2. 按项目 Git 规范提交非小程序文件并推送当前分支。
3. 汇总新增数量、覆盖分类、幂等结果、API/构建结果和生产执行状态。
