# 波波待处理 Bug 闭环实施计划

**目标：** 以用户提供的 `bug 记录 (1).xlsx` 为准，逐项处理分配给“波波”且处理状态为空或“待处理”的 39 条记录。

**方案：** 先按共因合并定位，再逐条保留验证结论。已实现但尚未真机/账号复验的项不重复修改，也不误标已闭环。

**影响范围：** 小程序、后端、必要的回归用例和本计划的逐行结果；不改用户提供的原始 Excel。

**成功标准：** 对 39 条记录均给出代码已修复并验证、待真机/账号复验、需外部平台配置或缺少复现材料等明确状态及证据；可在本机复现的缺陷完成最小修复。

**授权边界：** 本次未授权提交、Push、部署小程序或修改飞书在线表格。当前飞书 CLI 应用缺少表格读取权限，在线状态不会声称已更新。保留工作区已有未提交文件。

### Task 1：地区选择树修复（76、87，关联 73）

**文件：**
- 修改：`backend/src/main/java/com/spacetime/miniapp/service/impl/MiniappDictServiceImpl.java`
- 修改：`backend/src/main/java/com/spacetime/common/service/ProfileDictionaryService.java`、`backend/src/main/java/com/spacetime/common/util/MunicipalityLocationCodes.java`
- 回归：`backend/src/test/java/com/spacetime/miniapp/service/MiniappDictServiceImplTest.java`、`backend/src/test/java/com/spacetime/common/service/ProfileDictionaryServiceTest.java`、`backend/src/test/java/com/spacetime/common/util/MunicipalityLocationCodesTest.java`
- 核对：`miniapp/src/pages/prd08/recommend/preference/index.tsx`、`miniapp/src/pages/prd08/ideal/filter/index.tsx`

**步骤：**
- [x] 复现直辖市虚拟“市辖区/县”节点被返回为第二级选项。
- [x] 在省市两级选择树中以真实区县代替虚拟中间层，保留普通省市行为。
- [x] 核对所提交地区编码在资料、偏好和理想型服务中可保存并参与筛选。

**验证：** 定向地区字典回归用例先失败后通过；重庆市下可选“忠县”编码 `500233`，不能选中名为“县”的虚拟节点。

**完成条件：** 新选择链路不再把虚拟中间层展示为城市；历史已保存的虚拟编码另行标注兼容限制。

### Task 2：推荐、理想型及会员权益（18、24、33、41、42、55、57、58、59、64、65、66、73、81、86、95、98、102、103、106）

**文件：** `backend/src/main/java/com/spacetime/miniapp/service/impl/IdealServiceImpl.java`、`backend/src/main/java/com/spacetime/miniapp/service/impl/RecommendServiceImpl.java`、`backend/src/main/java/com/spacetime/miniapp/service/impl/MiniappRelationServiceImpl.java`、`miniapp/src/pages/prd08/ideal/filter/index.tsx`、`miniapp/src/pages/prd08/recommend/preference/index.tsx`、`miniapp/src/pages/prd08/recommend/waiting/index.tsx`、`miniapp/src/components/AppTabBar/index.tsx` 等；对应定向用例见同名后端测试类及 `miniapp/scripts/test-*-20260929.cjs`。

**步骤：**
- [x] 区分会员资产、权益 code、实际候选数、回看日志和页面推广卡状态。
- [x] 修复可复现的学校/标签筛选、理想型遮挡、候选切换及徽章提示问题。
- [x] 对依赖报告账号会员状态、候选池和真机表现的记录列出复验数据，不以硬编码数量替代后台配置。

**验证：** 针对各共因运行最小回归检查；保存后的偏好、可用筛选和推荐数量与后台配置一致。

**完成条件：** 每条记录有独立结果；需账号数据的项不误判为代码修复。

### Task 3：动态、同城与分享（12、37、39、40、47、63、67、68、72、74、78）

**文件：** `backend/src/main/java/com/spacetime/miniapp/service/impl/CommunityServiceImpl.java`、`backend/src/main/java/com/spacetime/miniapp/service/impl/CommunityMediaAuditCallbackServiceImpl.java`、`miniapp/src/pages/qianxun/compose.tsx`、`miniapp/src/pages/qianxun/my-posts.tsx`、`miniapp/src/features/qianxun/QianxunFamilyPage.tsx`、`miniapp/src/domain/pendingShareRoute.js` 等；对应后端定向测试及 `miniapp/scripts/test-qianxun-interactions-closure.cjs`。

**步骤：**
- [x] 核对已实现但待小程序真机复验的删除、评论、跳转、分享和头像占位。
- [x] 修复分享落地目标、审核驳回原因与编辑回填、同城列表分页等实际缺陷。

**验证：** 定向数据及页面回归检查；分享链接含目标动态/用户信息，驳回动态编辑带入原内容。

**完成条件：** 已修复项有证据，依赖真实微信分享/审核数据的项列明复验条件。

### Task 4：个人资料、导航、支付与错误文案（79、91、96、99、101）

**文件：** `backend/src/main/java/com/spacetime/common/exception/GlobalExceptionHandler.java`、`miniapp/src/pages/profile/edit.tsx`、`miniapp/src/pages/profile/index.tsx`、`miniapp/src/domain/paymentFailureFeedback.ts`、`miniapp/src/pages/heart/my-likes.tsx` 等。

**步骤：**
- [x] 核查认证提示、iOS 支付限制来源、错误字段翻译、个人中心导航及资料保存后刷新。
- [x] 只修复应用可控的缺陷；微信商户配置或平台规则不通过绕过代码解决。

**验证：** 各页面入口与返回路径定向核对；iOS 支付给出准确、可操作的状态说明。

**完成条件：** 每条记录有可观察结果及必要的外部依赖。

### Task 5：逐行验收与交付

**文件：** `docs/验收报告/2026-09-29-波波待处理Bug闭环.md`。

**步骤：**
- [x] 对照源表 39 行逐行核对修复、验证、发布和线上复验状态。
- [x] 检查 Git 差异，只保留本次必要改动并保护已有用户改动。
- [x] 列明需要报告账号、真机、微信商户或飞书权限的剩余动作。

**验证：** 39 行计数一致，证据与实际代码/检查结果一致；不把本地修复写成线上已验收。

**完成条件：** 用户获得可直接执行的剩余复验清单和准确状态。
