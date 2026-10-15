# 飞书波波第二轮问题闭环实施计划

**目标：** 处理 2026-10-15 飞书 revision 3470 中分配给波波的 22 项未处理问题，修复实际业务链路并保留回归证据。

**方案：** 先结合附件、当前源码和必要的生产只读查询定位；按链路建立失败测试后修复。列表分页、过滤、计数保持同一口径；旧异步请求不覆盖新状态；修复配置问题时覆盖真正写入入口。

**影响范围：** `miniapp/`、`backend/`、测试文档、生产部署和飞书 E/H 列。

**成功标准：** 对应回归通过，后端部署与全新小程序体验包核验成功，飞书按问题内容重新定位并回读状态。无法复现或缺少必要外部条件的项目保留未闭环原因，不代填验收列。

**授权边界：** 用户授权修复、master 提交与 Push、发布及飞书回填；不改他人问题，不执行真实扣费或注销来测试，不覆盖运营自行保存的价格。

## 任务 1：导航与页面状态（190、194、196、208、209）

- 文件：`miniapp/src/app.tsx`、`domain/pendingShareRoute.js`、`features/qianxun/QianxunFamilyPage.tsx`、`components/IdealResultsContent/`、`pages/recommend/index.tsx`、`pages/heart/mutual.tsx`，以及定位到的推荐后端实现。
- 检查分享参数在热启动/登录过程中的保存与恢复；同城入口显式选择 CITY；跨页选中按快照保留；跳转推荐同步底部选中；查询推荐跨日重复的实际来源。
- 回归覆盖旧请求晚返回、缓存页面重进、下一页再上一页、滚动 24 小时浏览与历史已左滑候选。

## 任务 2：社区可见性与互动（191、192、197、199、201、203、210、213）

- 文件：`features/qianxun/QianxunFamilyPage.tsx`、`pages/qianxun/interactions.tsx`、`CommunityServiceImpl.java`、`CommunityPersonalQueryMapper.java`。
- 关注/拉黑/删除后刷新列表；双向拉黑在分页前过滤且统计一致；评论按帖子聚合；三种互动均展示全部图片；头像从独立请求尽快显示。
- 回归覆盖关注切换、返回缓存列表、双向拉黑、删除后旧请求、同帖子四评论与九图。

## 任务 3：关系解锁和已读（198、205、206、207）

- 文件：`pages/community/index.tsx`、`pages/heart/user.tsx`、`MiniappRelationServiceImpl.java`、`RelationUnlockServiceImpl.java`、相关 Mapper。
- 对我心动与最近来访共用同一对象已解锁权益，避免重复扣费；重新进入时同步新快照，避免数字与旧列表不一致；新快照确认已读；仍有聊天来源时也可重新喜欢。
- 回归覆盖两个入口、重复确认、免费与收费、游标 A→B、旧快照与新快照隔离。

## 任务 4：设置、币明细、审核（193、195、211、212、214）

- 文件：`domain/settingsFlow.ts`、`pages/settings/account-cancel.tsx`、`hooks/useCoins.ts`、`pages/coins/detail.tsx`、`components/WhisperComposeSheet.tsx`、语音与内容审核实现（按定位结果确定）。
- 其他原因选项与校验统一；币流水分页和分类由服务端过滤；去掉无行为问号；查明安全校验失败与导入语音审核异常，不绕过审核。
- 回归覆盖第 21 条、分类切换与加载失败重试、其他原因必填、外部调用失败转人工、真实待审语音主动撤回重录。

## 验证与交付

- 测试设计：`docs/测试文档/飞书波波第二轮22项-testcase.md`；先运行新增失败场景，再运行相关脚本和 JUnit。
- 测试结果：`docs/测试文档/飞书波波第二轮22项-testreport.md`，记录实际成功、失败与未执行项。
- 本次再次拉取 `origin/master` 后生产构建；使用全新发布目录，逐文件 SHA-256 和 preview/upload 分包字节数核对。
- 核对后端自动部署和线上只读结果；写飞书前重新读取，按问题描述/处理人匹配，不依赖本计划旧行号。

## 同步最新代码

本轮发布前同步 `origin/master` 至 `19dda7d2`，保留新合入的评论异常转人工审核和私信同会话复用。评论提交的微信会话获取异常同样进入人工审核；明确违规不公开。外部微信 `45009` 是否恢复单独记录，不将人工兜底说成微信额度已恢复。
