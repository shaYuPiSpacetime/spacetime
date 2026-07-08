# Static Demo Production Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `docs/静态Demo/` 下所有静态 Demo 随管理后台生产流水线自动发布，并通过 `https://admin.shikongxiehou.com/demo/` 访问总入口。

**Architecture:** 管理后台镜像从仓库根目录构建，仍只在 build stage 编译 `frontend/`，在 runtime stage 额外复制完整 `docs/静态Demo/` 到 `/usr/share/nginx/html/demo/`，并在构建时自动扫描包含 `html/index.html` 的子目录生成 Demo 总入口。顶层生产 Nginx 保持同域代理到 `admin-web`，由 admin-web Nginx 直接服务 `/demo/` 静态文件。

**Tech Stack:** GitHub Actions、Docker、Nginx、Node 静态校验脚本。

## Global Constraints

- 不运行 `npm run build`、`docker build`、后端 Maven 编译或 Taro 编译。
- 不提交任何数据库、Redis、OSS、证书私钥。
- 保持管理后台接口同域 `/api` 不变。
- 生产域名固定为 `https://admin.shikongxiehou.com/`。

---

### Task 1: 部署配置静态校验

**Files:**
- Modify: `scripts/validate-prod-deploy-config.mjs`

**Interfaces:**
- Consumes: 现有 `read()`、`assertIncludes()`、`assertNotIncludes()` helper。
- Produces: 对 Demo 自动部署的静态约束。

- [x] **Step 1: Write the failing test**

在 `scripts/validate-prod-deploy-config.mjs` 增加断言：

```js
assertIncludes(adminWorkflow, "'docs/静态Demo/**'", '.github/workflows/deploy-admin-prod.yml');
assertIncludes(adminWorkflow, 'Validate static demo bundle', '.github/workflows/deploy-admin-prod.yml');
assertIncludes(adminWorkflow, 'Build admin image with static demos', '.github/workflows/deploy-admin-prod.yml');
assertIncludes(adminWorkflow, 'docker build \\', '.github/workflows/deploy-admin-prod.yml');
assertIncludes(adminWorkflow, '-f frontend/Dockerfile', '.github/workflows/deploy-admin-prod.yml');
assertIncludes(adminWorkflow, ' .', '.github/workflows/deploy-admin-prod.yml');
assertIncludes(frontendDockerfile, 'COPY docs/静态Demo/ /usr/share/nginx/html/demo/', 'frontend/Dockerfile');
assertIncludes(frontendDockerfile, "find /usr/share/nginx/html/demo -mindepth 3 -maxdepth 3 -path '*/html/index.html'", 'frontend/Dockerfile');
assertIncludes(dockerignore, '!docs/静态Demo/**', '.dockerignore');
```

- [x] **Step 2: Run test to verify it fails**

Run: `node scripts/validate-prod-deploy-config.mjs`

Expected: FAIL，提示缺少 Demo workflow path 或 Dockerfile copy。

- [x] **Step 3: Write minimal implementation**

修改 `frontend/Dockerfile` 让构建上下文变为仓库根目录，复制 `frontend/` 构建，把完整 `docs/静态Demo/` 复制到 runtime image，并自动生成 `/demo/index.html`。修改 `.github/workflows/deploy-admin-prod.yml` 的 path trigger、docker build context，并加入 `Validate static demo bundle` 与 `Build admin image with static demos` 显式步骤。

- [x] **Step 4: Run test to verify it passes**

Run: `node scripts/validate-prod-deploy-config.mjs`

Expected: 输出 `生产部署静态配置校验通过`。

### Task 2: 线上热同步验证

**Files:**
- Runtime only: server `/tmp/spacetime-static-demo-all`
- Runtime only: container `spacetime-admin-prod:/usr/share/nginx/html/demo`

**Interfaces:**
- Consumes: 本地 `docs/静态Demo/`。
- Produces: 当前生产 `https://admin.shikongxiehou.com/demo/` 可访问。

- [x] **Step 1: Copy static files to server**

Run: `COPYFILE_DISABLE=1 tar -C 'docs/静态Demo' -cf - . | ssh root@112.124.59.146 'rm -rf /tmp/spacetime-static-demo-all && mkdir -p /tmp/spacetime-static-demo-all && tar -C /tmp/spacetime-static-demo-all -xf -'`

- [x] **Step 2: Copy static files into running admin container**

Run: `docker cp /tmp/spacetime-static-demo-all/. spacetime-admin-prod:/usr/share/nginx/html/demo/`

- [x] **Step 3: Verify through local HTTPS resolution on server**

Run: `curl -k --resolve admin.shikongxiehou.com:443:127.0.0.1 https://admin.shikongxiehou.com/demo/`

Expected: HTML 包含 `04-商业化静态 Demo`。
