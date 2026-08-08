# 小程序蓝湖多页面与悄悄话扣币闭环实施计划

> **执行要求：** 逐任务遵循 TDD（红灯 → 最小实现 → 重构），每个页面先完成单页截图闭环，再进入下一页。

**目标：** 修复心动空态、认证入口、推荐/理想型安全区、编辑资料/主页预览展示，以及动态详情“申请认识”悄悄话扣币链路；以蓝湖稳定画板和真实后端配置作为唯一事实源。

**架构边界：** 小程序继续使用 Taro 真实组件和 OSS 图标；顶部按钮根据微信胶囊安全区动态布局；底部主导航只由 `AppTabBar` 绘制。悄悄话费用由后端 `whisper` 场景配置返回，创建操作在同一事务内完成幂等校验、免费权益或千寻币扣减、悄悄话记录和流水写入。

**技术栈：** Taro/React/TypeScript、Node 静态闭环脚本、Spring Boot 3.4/Java 21、MyBatis-Plus/MySQL、JUnit 5/Mockito。

---

## Task 1：登记第 24 张理想型空态及公共视觉约束

**文件：**

- 修改：`docs/设计描述/08-推荐与理想型条件筛选/00-蓝湖23画板清单.md`
- 新增：`docs/技术方案/2026-08-06-小程序多页面蓝湖还原与悄悄话扣币-tcdesign.md`

**步骤：**

1. 登记画板 `ab329c25-1c09-4540-95cd-cdd5645413ba`，编号 024。
2. 明确原生胶囊安全区、375×812 主视口、390×844 补充视口和 OSS 图标约束。
3. 明确动态详情弹层对应 `YO悄悄话-弹窗` 005/006，而不是三点菜单 033。

## Task 2：心动空态和未认证入口布局

**文件：**

- 测试：`miniapp/scripts/test-miniapp-lanhu-multi-page-closure.cjs`
- 修改：`miniapp/src/pages/community/index.tsx`
- 修改：`miniapp/src/features/verification/VerificationEntryView.tsx`

**红灯：**

1. 断言“对我心动”仅在存在可解锁记录时显示会员入口。
2. 断言未认证入口主按钮位于插画之后的正常文档流，不使用固定绝对顶部坐标。

**绿灯：**

1. 将会员入口条件绑定到当前 Tab 的 `ready && records.length > 0`。
2. 将认证主按钮/稍后按钮放入稳定的底部操作区，兼容短屏和长屏。

## Task 3：推荐/理想型胶囊安全区、空态与底部导航

**文件：**

- 测试：`miniapp/scripts/test-miniapp-lanhu-multi-page-closure.cjs`
- 修改：`miniapp/src/pages/recommend/index.tsx`
- 修改：`miniapp/src/pages/prd08/ideal/results/index.tsx`
- 修改：`miniapp/src/components/AppTabBar/index.tsx`

**红灯：**

1. 断言顶部操作区使用 `menuLeft` 计算，不出现 `left: 470/520/535rpx` 固定值。
2. 断言理想型结果空态包含 `qianxunEmptyFollowing`、浮动筛选按钮及 024 画板文案。
3. 断言中央推荐 Tab 不使用额外发光阴影。

**绿灯：**

1. 新增胶囊左侧操作区计算，推荐两个按钮、理想型一个按钮均保持最小间距。
2. 按 024 画板拆分星空头图与白色空态区，复用已上传空态插画。
3. 将理想型入口主按钮移到 TabBar 上方的安全操作区，移除导航额外光晕。

## Task 4：编辑资料和主页预览一致性

**文件：**

- 测试：`miniapp/scripts/test-miniapp-lanhu-multi-page-closure.cjs`
- 修改：`miniapp/src/pages/profile/edit.tsx`
- 修改：`miniapp/src/pages/profile/components/ProfilePreviewPage.tsx`
- 修改：`miniapp/src/components/ProfileTagChip.tsx`

**红灯：**

1. 断言编辑资料圆头像和主页预览圆头像均使用 `aspectFill` 和同一 `avatarUrl` 数据源。
2. 断言编辑资料头像右侧只显示昵称，不显示硬编码年龄/城市/星座。
3. 断言已填写脱单目标渲染灰色值与右箭头；空值渲染蓝色加号。
4. 断言标签卡片不使用固定高度，标签背景按文本自然撑开。
5. 断言“关于我”行距和组间距达到蓝湖基线。

**绿灯：**

1. 统一头像裁切、圆角和白色描边。
2. 移除硬编码副标题，修正认证状态图标尺寸和对齐。
3. 区分脱单目标空/已填写组件状态。
4. 使用 `inline-flex/fit-content` 和自适应卡片高度修复标签背景。
5. 增大“关于我”行高和条目间距。

## Task 5：动态详情 YO 悄悄话弹层与真实扣币

**文件：**

- 测试：`backend/src/test/java/com/spacetime/miniapp/service/WhisperServiceImplTest.java`
- 测试：`backend/src/test/java/com/spacetime/miniapp/controller/WhisperControllerTest.java`
- 测试：`miniapp/scripts/test-miniapp-lanhu-multi-page-closure.cjs`
- 新增：`deploy/sql/prod/067_prd03_whisper_send_closure.sql`
- 新增：`backend/src/main/java/com/spacetime/common/entity/AppWhisper.java`
- 新增：`backend/src/main/java/com/spacetime/common/mapper/AppWhisperMapper.java`
- 新增：`backend/src/main/java/com/spacetime/common/dao/AppWhisperDao.java`
- 新增：`backend/src/main/java/com/spacetime/common/dao/impl/AppWhisperDaoImpl.java`
- 新增：`backend/src/main/java/com/spacetime/miniapp/dto/request/WhisperPrecheckReq.java`
- 新增：`backend/src/main/java/com/spacetime/miniapp/dto/request/WhisperCreateReq.java`
- 新增：`backend/src/main/java/com/spacetime/miniapp/dto/response/WhisperPrecheckVO.java`
- 新增：`backend/src/main/java/com/spacetime/miniapp/dto/response/WhisperCreateVO.java`
- 新增：`backend/src/main/java/com/spacetime/miniapp/service/WhisperService.java`
- 新增：`backend/src/main/java/com/spacetime/miniapp/service/impl/WhisperServiceImpl.java`
- 新增：`backend/src/main/java/com/spacetime/miniapp/controller/WhisperController.java`
- 修改：`miniapp/src/services/message.ts`
- 修改：`miniapp/src/pages/qianxun/post-detail.tsx`

**红灯：**

1. 后端服务测试覆盖场景价读取、免费权益优先、余额不足、事务扣币、流水和同幂等键不重复扣费。
2. Controller 测试覆盖预检查和创建接口的登录用户透传。
3. 小程序静态测试断言“申请认识”打开真实底部弹层、费用来自 `precheckWhisper`、发送调用 `createWhisper`。

**绿灯：**

1. 实现最小可交付悄悄话表和分层代码，遵守 `Controller → Service → ServiceImpl → DAO → DAOImpl → Mapper`。
2. 费用读取 `app_coin_scene_config.scene_code=whisper`；有每日免费次数则扣次数，否则事务锁资产并扣币、写 `app_user_coin_log`。
3. 以“用户 + Idempotency-Key”保证同请求不重复扣费。
4. 动态详情按 005/006 画板绘制真实弹层，输入 1–60 字，预检查失败不提交。

## Task 6：构建、运行态与双视口验收

**文件：**

- 新增：`docs/验收报告/2026-08-06-小程序多页面蓝湖还原与悄悄话扣币-acceptance.md`
- 新增：`docs/验收报告/截图证据/2026-08-06-小程序多页面蓝湖还原/*`

**步骤：**

1. 执行新增红绿灯脚本、相关既有小程序脚本和 TypeScript 检查。
2. 执行后端定向 JUnit 与完整 `mvn test`。
3. 构建 H5/微信产物；对 375×812、390×844 截图，逐页记录差异与评分。
4. 只有测试、构建和关键截图门禁均通过后，才将验收状态标记为通过。
