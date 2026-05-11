## Project: Spacetime 成家立业

大学交友小程序平台 — 管理后台后端 + 小程序后端 + 管理后台前端（小程序前端是独立项目）。

**Tech Stack:** Java 21 / Spring Boot 3.4 / MyBatis-Plus 3.5 / MySQL 8.0 / Redis 7.x || React 18 / TypeScript / Vite / Tailwind CSS / shadcn/ui / Zustand

**所有编码规范 →** [TEAM_STANDARDS.md](./TEAM_STANDARDS.md)，架构、红线、命名、开发流程都在里面，写任何代码前必须先遵守。

---

## 开发流程（superpowers + gstack）

团队每个成员需安装这两个插件。有对应 skill 时优先调用。

| 阶段 | 触发场景 | 调用 Skill | 说明 |
|------|---------|-----------|------|
| 需求分析 | 需求不清晰，不知道怎么做 | `gstack-office-hours` + `superpowers:brainstorming` | 理清需求边界、用户故事、技术方向 |
| 方案设计 | 需求清晰，需要落地方案 | `gstack-plan-eng-review` + `superpowers:writing-plans` | 输出架构设计、目录结构、实施计划 |
| 编码实现 | 按计划开发 | `superpowers:executing-plans` | 按 TEAM_STANDARDS.md 分层开发 |
| TDD | 开发新功能 | `superpowers:test-driven-development` | 先写测试，再写实现 |
| 自检 | 开发完成 | `superpowers:verification-before-completion` | 跑编译/测试，拿证据再说话 |
| Code Review | 提交前 | `superpowers:requesting-code-review` | 检查是否合规、是否有隐患 |
| 处理 Review 意见 | 收到反馈后 | `superpowers:receiving-code-review` | 逐条修改，不盲目接受 |
| 调试 | 出现 bug | `superpowers:systematic-debugging` | 定位根因再动刀 |
| QA 测试 | 前后端联调 | `gstack-qa` | 功能、安全、性能全覆盖 |
| 上线准备 | 准备部署 | `gstack-ship` | 打包、环境检查、发布总结 |
| 提交/PR | 需要提交 | `git-utils` | 分支、commit、提 PR |

**提交门禁（强提醒，可跳过）：** 用户说"提交代码"时，提示"提交前需完成自检和 Code Review"。
- 用户选择跳过 → 直接 `git-utils` 提交
- 用户选择不跳过 → 按以下顺序执行：
  1. `superpowers:verification-before-completion` 跑编译/测试
  2. 对照 `./TEAM_STANDARDS.md` 逐条校验
  3. `superpowers:requesting-code-review` 检查是否合规、是否有隐患
  4. `git-utils` 提交
