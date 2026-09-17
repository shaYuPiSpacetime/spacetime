# 小程序交互闭环修复实施计划

**目标：** 修复偏好开关、心动单条解锁、悄悄话空态与入口、心动数量及资料评分首屏跳变。

**方案：** 先核对接口和页面现有契约；周边城市偏好与城市映射能力解耦；按用户补充要求让第二个认证偏好也可保存，但平台现有三重认证准入始终有效；悄悄话发起统一使用同一页内弹窗，历史详情页保留；缺少现场报错证据的解锁问题先完成静态根因检查，收到报错原文后再针对性修复。

**影响范围：** 小程序推荐、心动、消息、千寻、个人资料页面与推荐偏好后端；新增一条幂等数据库迁移。

**成功标准：** 周边城市开关可切换并保存；所有“发起悄悄话”入口均弹出共用弹窗、不跳详情页；申请我的空列表展示图标与“暂无数据”；新喜欢为 0 时不显示计数；从“我的”进入编辑资料首帧使用已知评分；解锁的实际报错按根因消除。

**授权边界：** 本次仅修改代码；不提交、Push、部署或发布。用户要求不额外跑测试，验证限静态差异与必要的构建检查。

### Task 1：偏好与资料展示

**文件：** `miniapp/src/pages/prd08/recommend/preference/index.tsx`、`miniapp/src/services/recommend.ts`、`backend/src/main/java/com/spacetime/miniapp/service/impl/RecommendServiceImpl.java`、偏好实体/请求/响应、`deploy/sql/prod/094_recommend_certified_preference.sql`、生产部署工作流、`miniapp/src/hooks/useProfile.ts`、`miniapp/src/pages/profile/edit.tsx`。

**步骤：** 允许周边城市开关独立保存；认证偏好持久化且兼容旧客户端不传字段；从“我的”将已加载的资料评分带入编辑页首帧。

**验证：** 核对保存/读取同一字段及路由参数；小程序构建无错误。

### Task 2：悄悄话统一弹窗与消息空态

**文件：** `miniapp/src/components/CommunityWhisperSheet.tsx`、新增共用发起组件、`miniapp/src/pages/heart/user.tsx`、`miniapp/src/pages/recommend/index.tsx`、`miniapp/src/pages/qianxun/topic.tsx`、`miniapp/src/features/qianxun/QianxunZhiyinTab.tsx`、`miniapp/src/features/qianxun/QianxunFamilyPage.tsx`、`miniapp/src/pages/qianxun/post-detail.tsx`、`miniapp/src/pages/message/whisper-list.tsx`。

**步骤：** 抽取预检查、幂等发送和共用弹窗；替换所有 `compose=1` 跳页入口；空列表使用现有 OSS 空态图标。历史悄悄话详情入口保持原样。

**验证：** 静态搜索无发起悄悄话的 `compose=1` 跳页调用；小程序构建无错误。

### Task 3：心动展示与解锁

**文件：** `miniapp/src/pages/community/index.tsx`，必要时补充对应后端服务文件。

**步骤：** 新喜欢计数只在大于 0 时显示；对照解锁报错原文检查报价、确认、余额和状态处理，针对性修复，不猜测服务端原因。

**验证：** 静态核对入口参数和错误分支；如缺少现场报错信息，在结果中明确未闭环部分。
