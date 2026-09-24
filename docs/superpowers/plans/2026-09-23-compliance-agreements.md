# 合规协议同域 H5 闭环实施计划

**目标：** 将公告与协议配置中的所有协议、政策、承诺函、清单和规范补齐为可维护、可查看的同域 H5，并修复小程序中协议入口断链。

**方案：** 复用现有 `content_article` 稳定编码和公开详情接口；新增统一 H5 阅读器，按编码读取正文并安全渲染；后台在保留 URL 换版能力的同时允许维护正文。迁移只替换已确认的占位 URL 或空 URL，不覆盖运营已发布的其他地址或正文。

**影响范围：** `backend` 合规内容接口、`frontend` 后台编辑与同域 H5、`miniapp` 协议入口、`deploy/sql/prod` 增量迁移。

**成功标准：** 线上可枚举的 8 项 PRD-06 合规内容、会员服务协议以及小程序充值协议均有稳定编码和有效入口；后台能维护正文并预览；占位内容不会被误展示为正式协议；对应回归测试通过。

**授权边界：** 用户已授权代码实现、生产发布和飞书 Bug 闭环。正式法律文案的来源仍待用户提供；未取得已批准文本时，不得将占位内容标记为正式发布。

## Task 1：确认全量内容与入口

**文件：** `backend/docs/sql/migration-20260717-prd06-admin-miniapp-closure.sql`、`deploy/sql/prod/087_vip_service_agreement.sql`、`miniapp/src/pages/**`

**步骤：**
- [x] 对照生产公开详情接口与初始化迁移，列出 8 项 PRD-06 合规内容、邀请规则、公告、帮助、会员协议。
- [x] 检查充值协议等小程序实际展示的协议入口；确认 `coin_recharge_agreement` 当前不存在，充值页文字尚不能打开正文。
- [x] 将最终清单写入 `docs/验收报告/2026-09-24-合规协议预览链接生产验收.md`，逐项核对配置、正文、入口、版本。

**验证：** 对每个稳定编码请求 `/api/miniapp/content/compliance/{code}`，并核对页面入口；不得以 HTTP 200 代替正文可读性检查。

## Task 2：后台正文维护与统一阅读器

**文件：**
- 修改：`backend/src/main/java/com/spacetime/admin/dto/request/ComplianceContentSaveReq.java`
- 修改：`backend/src/main/java/com/spacetime/admin/dto/response/ComplianceContentVO.java`
- 修改：`backend/src/main/java/com/spacetime/admin/service/impl/ComplianceContentAdminServiceImpl.java`
- 修改：`frontend/src/pages/content/ComplianceContentPage.tsx`
- 修改：`frontend/src/api/prd06.ts`
- 新增：`frontend/public/h5/compliance/index.html`、`app.js`、`styles.css`
- 测试：`backend/src/test/java/com/spacetime/admin/service/ComplianceContentAdminServiceImplTest.java`、`frontend/e2e-tests/tests/compliance-h5.spec.ts`

**步骤：**
- [x] 建立失败测试，覆盖正文保存、URL 与正文换版、安全展示和缺失内容态。
- [x] 扩展后台请求与响应，保留审计和版本规则；邀请规则仍以 PRD-07 动态接口为准。
- [x] 实现同域 H5 阅读器，限制可请求编码，正文按文本安全渲染，不执行后台内容中的脚本。
- [x] 后台编辑弹窗增加正文维护与预览，清楚标识正式内容状态。

**验证：** 定向后端单测、前端 H5 Playwright 用例、`npm --prefix frontend run build`。

## Task 3：迁移与小程序入口

**文件：**
- 新增：`deploy/sql/prod/095_compliance_content_h5_reader.sql`
- 修改：`miniapp/src/pages/coins/index.tsx`、`miniapp/src/pages/coins/unlock-recharge.tsx`
- 测试：相邻小程序回归脚本与迁移静态契约。

**步骤：**
- [x] 建立失败测试，覆盖充值协议从两处充值页打开同一稳定编码。
- [x] 迁移补齐充值协议预置项及字典，并为占位或空 URL 的协议设置同域 H5；保留已维护的非占位 URL 和正文。
- [x] 将小程序协议标题接到合规内容页；保留现有勾选和支付阻断规则。小程序源码已推送，仍待微信版本上传。

**验证：** 小程序定向测试与构建、迁移重复执行和不覆盖已发布内容的核查。

## Task 4：正式文本和生产验收

**步骤：**
- [ ] 收到已批准文本后逐项录入；若用户选择草案，逐项编写并标记待法务审核。
- [x] 对照 14 项内容清单回读标题、版本、正文、入口与页面可读状态；10 项缺正式正文已逐项记录。
- [ ] 飞书 24 条 Bug 已逐项建立核查记录，23 条验收备注已回读；第 26 行未保存。用户要求改用飞书 CLI，现需补齐表格读写 OAuth 权限。

**完成条件：** 所有列入范围的协议都有可验证内容和可打开入口；无法获得正式文本或线上写入权限时，必须逐项报告阻塞，不以代码落地冒称生产发布完成。
